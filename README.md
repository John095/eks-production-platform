# Production-Grade EKS Platform

A complete production-ready Kubernetes infrastructure on AWS EKS with Terraform, featuring a 3-tier application architecture, cost optimization through spot instances, auto-scaling, and comprehensive monitoring.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Internet                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                    ┌────▼────┐
                    │   ALB   │ (Application Load Balancer)
                    └────┬────┘
                         │
          ┌──────────────┴──────────────┐
          │                             │
     ┌────▼────┐                   ┌────▼────┐
     │ Public  │                   │ Public  │
     │ Subnet  │                   │ Subnet  │
     │  AZ-1   │                   │  AZ-2   │
     └────┬────┘                   └────┬────┘
          │                             │
          │    ┌─────────────────┐      │
          └────►  NAT Gateway    ◄──────┘
               └────────┬────────┘
                        │
          ┌─────────────┴─────────────┐
          │                           │
     ┌────▼────┐                 ┌────▼────┐
     │ Private │                 │ Private │
     │ Subnet  │                 │ Subnet  │
     │  AZ-1   │                 │  AZ-2   │
     └────┬────┘                 └────┬────┘
          │                           │
          │   EKS Cluster             │
          │  ┌──────────────┐         │
          │  │  Frontend    │         │
          │  │  (Next.js)   │         │
          │  └──────┬───────┘         │
          │         │                 │
          │  ┌──────▼───────┐         │
          │  │   Backend    │         │
          │  │  (Node.js)   │         │
          │  └──────┬───────┘         │
          │         │                 │
          │  ┌──────▼───────┐         │
          │  │    Redis     │         │
          │  └──────┬───────┘         │
          │         │                 │
          │         ▼                 │
          │  ┌──────────────┐         │
          └──►     RDS      ◄─────────┘
             │  PostgreSQL  │
             └──────────────┘
```

## 📋 Features

### Infrastructure

- ✅ Multi-AZ VPC with public and private subnets
- ✅ EKS cluster with managed node groups
- ✅ On-demand + Spot instances for cost optimization (30% savings)
- ✅ RDS PostgreSQL with automated backups
- ✅ NAT Gateways for high availability
- ✅ Security groups with least-privilege access

### Kubernetes

- ✅ Multi-environment namespaces (dev, staging, prod)
- ✅ Resource quotas and limits
- ✅ Horizontal Pod Autoscaler (HPA)
- ✅ AWS Load Balancer Controller
- ✅ Metrics Server for monitoring
- ✅ Health checks and liveness probes

### Application

- ✅ 3-tier architecture (Frontend, Backend, Database)
- ✅ Next.js frontend
- ✅ Node.js REST API backend
- ✅ Redis caching layer
- ✅ PostgreSQL database

## 🚀 Quick Start

### Prerequisites

```bash
# Install required tools
brew install terraform
brew install kubectl
brew install helm
brew install awscli

# Configure AWS credentials
aws configure
```

### Deploy Infrastructure

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/eks-production-platform.git
cd eks-production-platform
```

2. **Create terraform.tfvars**

```bash
cd terraform
cat > terraform.tfvars <<EOF
aws_region          = "us-east-1"
cluster_name        = "production-eks-cluster"
db_password         = "YourSecurePassword123!"
availability_zones  = ["us-east-1a", "us-east-1b"]
EOF
```

3. **Deploy with Terraform**

```bash
# Initialize Terraform
terraform init

# Review the plan
terraform plan

# Apply configuration
terraform apply
```

4. **Configure kubectl**

```bash
aws eks update-kubeconfig --region us-east-1 --name production-eks-cluster
kubectl get nodes
```

### Install Add-ons

**AWS Load Balancer Controller:**

```bash
# Add Helm repo
helm repo add eks https://aws.github.io/eks-charts
helm repo update

# Install CRDs
kubectl apply -k "github.com/aws/eks-charts/stable/aws-load-balancer-controller//crds?ref=master"

# Install controller
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=production-eks-cluster
```

**Metrics Server:**

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### Deploy Applications

```bash
# Create namespaces
kubectl apply -f kubernetes/namespaces/

# Deploy applications
kubectl apply -f kubernetes/redis/
kubectl apply -f kubernetes/backend/
kubectl apply -f kubernetes/frontend/

# Check status
kubectl get pods -n prod
kubectl get ingress -n prod
```

## 📊 Monitoring & Operations

### View Logs

```bash
# Backend logs
kubectl logs -f deployment/backend -n prod

# Frontend logs
kubectl logs -f deployment/frontend -n prod
```

### Scale Applications

```bash
# Manual scaling
kubectl scale deployment/backend --replicas=5 -n prod

# Check HPA status
kubectl get hpa -n prod
```

### Check Resource Usage

```bash
# Node metrics
kubectl top nodes

# Pod metrics
kubectl top pods -n prod
```

## 💰 Cost Optimization

This infrastructure includes several cost-saving features:

1. **Spot Instances**: 30% cheaper than on-demand
2. **Right-sized instances**: t3.medium for general workloads
3. **Auto-scaling**: Scale down during low traffic
4. **NAT Gateway optimization**: Minimal data transfer costs
5. **RDS reserved capacity**: Available for long-term savings

**Estimated Monthly Cost:**

- EKS Control Plane: $73
- EC2 Nodes (2 on-demand + 1 spot): ~$50-60
- RDS db.t3.micro: ~$15
- NAT Gateways: ~$65
- Load Balancer: ~$20
- **Total: ~$225-250/month**

## 🔒 Security Best Practices

- ✅ Private subnets for worker nodes
- ✅ Security groups with minimal access
- ✅ IAM roles with least privilege
- ✅ Encrypted RDS storage
- ✅ Secrets stored in AWS Secrets Manager
- ✅ VPC Flow Logs enabled
- ✅ EKS audit logging enabled

## 🛠️ Technology Stack

| Component               | Technology                 |
| ----------------------- | -------------------------- |
| IaC                     | Terraform                  |
| Container Orchestration | Kubernetes (EKS)           |
| Cloud Provider          | AWS                        |
| Database                | PostgreSQL (RDS)           |
| Cache                   | Redis                      |
| Frontend                | Next.js                    |
| Backend                 | Node.js                    |
| Load Balancer           | AWS ALB                    |
| Monitoring              | CloudWatch, Metrics Server |

## 📁 Project Structure

```
eks-production-platform/
├── terraform/
│   ├── main.tf              # Main configuration
│   ├── variables.tf         # Input variables
│   ├── outputs.tf           # Output values
│   ├── vpc.tf               # VPC resources
│   ├── eks.tf               # EKS cluster
│   ├── rds.tf               # Database
│   ├── iam.tf               # IAM roles
│   └── security-groups.tf   # Security groups
├── kubernetes/
│   ├── namespaces/          # Environment namespaces
│   ├── frontend/            # Frontend deployment
│   ├── backend/             # Backend deployment
│   └── redis/               # Redis deployment
├── docs/
│   ├── architecture.md      # Architecture details
│   └── troubleshooting.md   # Common issues
└── README.md
```

## 🔧 Common Commands

```bash
# Get cluster info
kubectl cluster-info

# Check all resources
kubectl get all -n prod

# Describe a pod
kubectl describe pod <pod-name> -n prod

# Execute into a pod
kubectl exec -it <pod-name> -n prod -- /bin/sh

# Port forward to local
kubectl port-forward svc/backend 8080:80 -n prod

# Update image
kubectl set image deployment/backend backend=new-image:tag -n prod
```

## 🧹 Cleanup

```bash
# Delete Kubernetes resources
kubectl delete -f kubernetes/frontend/
kubectl delete -f kubernetes/backend/
kubectl delete -f kubernetes/redis/
kubectl delete -f kubernetes/namespaces/

# Destroy infrastructure
cd terraform
terraform destroy
```

## 📚 Next Steps

1. **Add CI/CD Pipeline**

   - GitHub Actions for automated deployments
   - Image scanning with Trivy
   - Automated testing

2. **Enhanced Monitoring**

   - Prometheus + Grafana
   - Custom dashboards
   - Alert manager

3. **GitOps with ArgoCD**

   - Declarative deployments
   - Git as source of truth
   - Automated sync

4. **Service Mesh**
   - Istio for traffic management
   - mTLS between services
   - Advanced routing

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 📄 License

MIT License

## 👨‍💻 Author

**John Ndirangu**

- Email: johnouma095@gmail.com
- LinkedIn: [Your LinkedIn]
- GitHub: [Your GitHub]

---

**Note**: Remember to replace placeholder values (ECR repo URLs, database passwords) with your actual values before deploying to production.
