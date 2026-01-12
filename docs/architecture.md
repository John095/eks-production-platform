# Architecture Overview

## Infrastructure

- **VPC**: Multi-AZ setup with public/private subnets
- **EKS**: Managed Kubernetes cluster with node groups
- **RDS**: PostgreSQL database in private subnets
- **Security Groups**: Restricted access between components

## Application Stack

- **Frontend**: Next.js application
- **Backend**: Node.js API server
- **Cache**: Redis for session storage
- **Database**: PostgreSQL for persistent data

## Networking

- Load balancer routes traffic to frontend
- Internal service mesh for backend communication
- Database accessible only from application pods
