# CNG Compliance Enterprise - Production Multi-Region Terraform Infrastructure
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket         = "cng-compliance-tf-state"
    key            = "global/s3/terraform.tfstate"
    region         = "ap-south-1"
    dynamodb_table = "cng-compliance-tf-locks"
    encrypt        = true
  }
}

# Primary Region Provider (ap-south-1)
provider "aws" {
  region = var.primary_region
  default_tags {
    tags = {
      Project     = "CNG-Compliance-Enterprise"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Secondary Region Provider (ap-southeast-1)
provider "aws" {
  alias  = "secondary"
  region = var.secondary_region
  default_tags {
    tags = {
      Project     = "CNG-Compliance-Enterprise"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Primary Region Networking
module "networking_primary" {
  source             = "./modules/networking"
  vpc_cidr           = var.primary_vpc_cidr
  availability_zones = ["ap-south-1a", "ap-south-1b"]
  environment        = var.environment
}

# Secondary Region Networking
module "networking_secondary" {
  source             = "./modules/networking"
  providers          = { aws = aws.secondary }
  vpc_cidr           = var.secondary_vpc_cidr
  availability_zones = ["ap-southeast-1a", "ap-southeast-1b"]
  environment        = var.environment
}

# Multi-Region Database (PostgreSQL Aurora Global)
module "database" {
  source              = "./modules/database"
  primary_vpc_id      = module.networking_primary.vpc_id
  primary_subnets     = module.networking_primary.private_subnets
  secondary_vpc_id    = module.networking_secondary.vpc_id
  secondary_subnets   = module.networking_secondary.private_subnets
  db_name             = var.db_name
  db_username         = var.db_username
  db_password_secret  = var.db_password_secret_arn
  environment         = var.environment
}

# Redis Multi-Region Cluster
module "redis_primary" {
  source                     = "./modules/redis"
  vpc_id                     = module.networking_primary.vpc_id
  subnet_ids                 = module.networking_primary.private_subnets
  backend_security_group_id = module.networking_primary.backend_security_group_id
  environment                = var.environment
}

# Object Storage (Vehicle Evidence Image S3 Bucket with Cross-Region Replication)
module "evidence_storage" {
  source                 = "./modules/storage"
  bucket_prefix          = "cng-compliance-evidence"
  secondary_region       = var.secondary_region
  retention_days         = 30
  environment            = var.environment
}
