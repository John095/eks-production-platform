# Deployment Guide

## Prerequisites

- AWS CLI configured
- Terraform installed
- kubectl installed

## Infrastructure Deployment

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

## Kubernetes Deployment

```bash
# Configure kubectl
aws eks update-kubeconfig --name eks-production

# Deploy namespaces
kubectl apply -f kubernetes/namespaces/

# Deploy applications
kubectl apply -f kubernetes/frontend/
kubectl apply -f kubernetes/backend/
kubectl apply -f kubernetes/redis/
```

## Verification

```bash
kubectl get pods -n prod
kubectl get services -n prod
```
