const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const { createClient } = require("redis");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://dbadmin:admin123@localhost:5432/appdb",
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

// Redis connection
let redisClient;
const connectRedis = async () => {
  try {
    redisClient = createClient({
      socket: {
        host: process.env.REDIS_HOST || "localhost",
        port: process.env.REDIS_PORT || 6379,
      },
    });

    redisClient.on("error", (err) => console.log("Redis Client Error", err));
    await redisClient.connect();
    console.log("✅ Connected to Redis");
  } catch (error) {
    console.log("⚠️  Redis not available:", error.message);
    redisClient = null;
  }
};

// Initialize database schema
const initDatabase = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Database initialized");
  } catch (error) {
    console.error("❌ Database initialization error:", error.message);
  }
};

// Health check endpoint
app.get("/health", async (req, res) => {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  };

  try {
    await pool.query("SELECT 1");
    health.database = "connected";
  } catch (error) {
    health.database = "disconnected";
    health.status = "unhealthy";
  }

  health.redis =
    redisClient && redisClient.isOpen ? "connected" : "disconnected";

  const statusCode = health.status === "healthy" ? 200 : 503;
  res.status(statusCode).json(health);
});

// Readiness check
app.get("/ready", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ready: true });
  } catch (error) {
    res.status(503).json({ ready: false, error: error.message });
  }
});

// Get all tasks
app.get("/api/tasks", async (req, res) => {
  try {
    // Try cache first
    if (redisClient && redisClient.isOpen) {
      const cached = await redisClient.get("tasks:all");
      if (cached) {
        return res.json({
          data: JSON.parse(cached),
          source: "cache",
        });
      }
    }

    // Query database
    const result = await pool.query(
      "SELECT * FROM tasks ORDER BY created_at DESC"
    );

    // Cache results
    if (redisClient && redisClient.isOpen) {
      await redisClient.setEx("tasks:all", 60, JSON.stringify(result.rows));
    }

    res.json({
      data: result.rows,
      source: "database",
      count: result.rows.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single task
app.get("/api/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query("SELECT * FROM tasks WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create task
app.post("/api/tasks", async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const result = await pool.query(
      "INSERT INTO tasks (title, description) VALUES ($1, $2) RETURNING *",
      [title, description || ""]
    );

    // Invalidate cache
    if (redisClient && redisClient.isOpen) {
      await redisClient.del("tasks:all");
    }

    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update task
app.put("/api/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, completed } = req.body;

    const result = await pool.query(
      `UPDATE tasks 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           completed = COALESCE($3, completed),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [title, description, completed, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Invalidate cache
    if (redisClient && redisClient.isOpen) {
      await redisClient.del("tasks:all");
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete task
app.delete("/api/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM tasks WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Invalidate cache
    if (redisClient && redisClient.isOpen) {
      await redisClient.del("tasks:all");
    }

    res.json({ message: "Task deleted", data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stats endpoint
app.get("/api/stats", async (req, res) => {
  try {
    const totalResult = await pool.query("SELECT COUNT(*) FROM tasks");
    const completedResult = await pool.query(
      "SELECT COUNT(*) FROM tasks WHERE completed = true"
    );

    res.json({
      total: parseInt(totalResult.rows[0].count),
      completed: parseInt(completedResult.rows[0].count),
      pending:
        parseInt(totalResult.rows[0].count) -
        parseInt(completedResult.rows[0].count),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    name: "Task Management API",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      tasks: "/api/tasks",
      stats: "/api/stats",
    },
  });
});

// Start server
const startServer = async () => {
  await initDatabase();
  await connectRedis();

  app.listen(port, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${port}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
  });
};

startServer();

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...");
  if (redisClient) await redisClient.quit();
  await pool.end();
  process.exit(0);
});
