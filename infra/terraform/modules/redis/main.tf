variable "vpc_id" { type = string }
variable "subnet_ids" { type = list(string) }
variable "backend_security_group_id" { type = string }
variable "environment" { type = string }

resource "aws_elasticache_subnet_group" "redis" {
  name       = "cng-redis-subnet-${var.environment}"
  subnet_ids = var.subnet_ids
}

# Dedicated Redis Security Group restricting port 6379 access exclusively to backend/EKS nodes
resource "aws_security_group" "redis" {
  name        = "cng-redis-sg-${var.environment}"
  description = "Network isolation security group for Redis idempotency cache"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [var.backend_security_group_id]
    description     = "Allow port 6379 ingress strictly from backend application security group"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "cng-redis-${var.environment}"
  description                = "CNG Compliance Redis Idempotency Cache"
  node_type                  = "cache.t4g.medium"
  num_cache_clusters         = 2
  port                       = 6379
  subnet_group_name          = aws_elasticache_subnet_group.redis.name
  security_group_ids         = [aws_security_group.redis.id]
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
}

output "endpoint" { value = aws_elasticache_replication_group.redis.primary_endpoint_address }
