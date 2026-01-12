module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 21.0"
  
  name    = var.cluster_name
  kubernetes_version = "1.33"

  vpc_id                         = module.vpc.vpc_id
  subnet_ids                     = module.vpc.private_subnets
  endpoint_public_access = true

  eks_managed_node_groups = {
    main = {
      name = "main"
      
      instance_types = ["t3.small"]
      
      min_size     = 1
      max_size     = 3
      desired_size = 2
      
      capacity_type = "ON_DEMAND"
    }
  }

  tags = {
    Environment = var.environment
  }
}