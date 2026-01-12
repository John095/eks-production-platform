#!/bin/bash

set -e

echo "=================================="
echo "EKS Production Platform Deployment"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"
command -v terraform >/dev/null 2>&1 || { echo -e "${RED}terraform is required but not installed${NC}"; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo -e "${RED}kubectl is required but not installed${NC}"; exit 1; }
command -v aws >/dev/null 2>&1 || { echo -e "${RED}aws cli is required but not installed${NC}"; exit 1; }
command -v helm >/dev/null 2>&1 || { echo -e "${RED}helm is required but not installed${NC}"; exit 1; }

echo -e "${GREEN}All prerequisites met!${NC}"

# Step 1: Deploy Infrastructure
echo -e "\n${YELLOW}Step 1: Deploying infrastructure with Terraform...${NC}"
cd terraform

terraform init
terraform validate
terraform plan -out=tfplan

read -p "Apply Terraform plan? (yes/no): " confirm
if [ "$confirm" == "yes" ]; then
    terraform apply tfplan
    echo -e "${GREEN}Infrastructure deployed successfully!${NC}"
else
    echo -e "${RED}Deployment cancelled${NC}"
    exit 0
fi

# Get outputs
CLUSTER_NAME=$(terraform output -raw cluster_name)
AWS_REGION=$(terraform output -raw aws_region 2>/dev/null || echo "us-east-1")

cd ..

# Step 2: Configure kubectl
echo -e "\n${YELLOW}Step 2: Configuring kubectl...${NC}"
aws eks update-kubeconfig --region $AWS_REGION --name $CLUSTER_NAME
echo -e "${GREEN}kubectl configured!${NC}"

# Verify cluster access
echo -e "\n${YELLOW}Verifying cluster access...${NC}"
kubectl get nodes
kubectl get namespaces

# Step 3: Install AWS Load Balancer Controller
echo -e "\n${YELLOW}Step 3: Installing AWS Load Balancer Controller...${NC}"

# Download IAM policy
if [ ! -f "iam_policy.json" ]; then
    curl -o iam_policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.6.2/docs/install/iam_policy.json
fi

# Add Helm repo
helm repo add eks https://aws.github.io/eks-charts
helm repo update

# Install controller
kubectl apply -k "github.com/aws/eks-charts/stable/aws-load-balancer-controller//crds?ref=master"

helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=$CLUSTER_NAME \
  --set serviceAccount.create=true \
  --set serviceAccount.name=aws-load-balancer-controller

echo -e "${GREEN}AWS Load Balancer Controller installed!${NC}"

# Step 4: Install Metrics Server
echo -e "\n${YELLOW}Step 4: Installing Metrics Server...${NC}"
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
echo -e "${GREEN}Metrics Server installed!${NC}"

# Step 5: Create Namespaces
echo -e "\n${YELLOW}Step 5: Creating namespaces...${NC}"
kubectl apply -f kubernetes/namespaces/

# Step 6: Deploy Applications
echo -e "\n${YELLOW}Step 6: Deploying applications...${NC}"
kubectl apply -f kubernetes/redis/
kubectl apply -f kubernetes/backend/
kubectl apply -f kubernetes/frontend/

echo -e "${GREEN}Applications deployed!${NC}"

# Step 7: Check deployment status
echo -e "\n${YELLOW}Step 7: Checking deployment status...${NC}"
kubectl get pods -n prod
kubectl get svc -n prod
kubectl get ingress -n prod

echo -e "\n${GREEN}=================================="
echo -e "Deployment Complete!"
echo -e "==================================${NC}"
echo -e "\nUseful commands:"
echo -e "  ${YELLOW}kubectl get pods -n prod${NC}            - Check pod status"
echo -e "  ${YELLOW}kubectl get ingress -n prod${NC}         - Get application URL"
echo -e "  ${YELLOW}kubectl logs -f <pod-name> -n prod${NC}  - View logs"
echo -e "  ${YELLOW}kubectl describe pod <pod> -n prod${NC}  - Debug pods"