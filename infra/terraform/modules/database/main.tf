variable "primary_vpc_id" { type = string }
variable "primary_subnets" { type = list(string) }
variable "secondary_vpc_id" { type = string }
variable "secondary_subnets" { type = list(string) }
variable "db_name" { type = string }
variable "db_username" { type = string }
variable "db_password_secret" { type = string }
variable "environment" { type = string }

# Global Aurora Cluster Container
resource "aws_rds_global_cluster" "main" {
  global_cluster_identifier = "cng-compliance-global-db-${var.environment}"
  engine                    = "aurora-postgresql"
  engine_version            = "15.4"
  database_name             = var.db_name
  storage_encrypted         = true
  deletion_protection       = var.environment == "production" ? true : false
}

# Primary Subnet Group (ap-south-1)
resource "aws_db_subnet_group" "primary" {
  name       = "cng-db-primary-subnet-${var.environment}"
  subnet_ids = var.primary_subnets
}

# Primary Aurora Regional Cluster (ap-south-1)
resource "aws_rds_cluster" "primary" {
  cluster_identifier        = "cng-compliance-db-primary-${var.environment}"
  global_cluster_identifier = aws_rds_global_cluster.main.id
  engine                    = aws_rds_global_cluster.main.engine
  engine_version            = aws_rds_global_cluster.main.engine_version
  database_name             = var.db_name
  master_username           = var.db_username
  manage_master_user_password = true
  db_subnet_group_name      = aws_db_subnet_group.primary.name
  storage_encrypted         = true
  deletion_protection       = var.environment == "production" ? true : false
  backup_retention_period   = 30
}

# Secondary Subnet Group (ap-southeast-1)
resource "aws_db_subnet_group" "secondary" {
  name       = "cng-db-secondary-subnet-${var.environment}"
  subnet_ids = var.secondary_subnets
}

# Secondary Aurora Regional Replica Cluster (ap-southeast-1)
resource "aws_rds_cluster" "secondary" {
  cluster_identifier        = "cng-compliance-db-secondary-${var.environment}"
  global_cluster_identifier = aws_rds_global_cluster.main.id
  engine                    = aws_rds_global_cluster.main.engine
  engine_version            = aws_rds_global_cluster.main.engine_version
  db_subnet_group_name      = aws_db_subnet_group.secondary.name
  storage_encrypted         = true
  deletion_protection       = var.environment == "production" ? true : false
  depends_on                = [aws_rds_cluster.primary]
}

output "cluster_endpoint" { value = aws_rds_cluster.primary.endpoint }
output "secondary_cluster_endpoint" { value = aws_rds_cluster.secondary.endpoint }
