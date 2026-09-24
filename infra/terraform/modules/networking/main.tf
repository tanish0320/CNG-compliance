variable "vpc_cidr" { type = string }
variable "availability_zones" { type = list(string) }
variable "environment" { type = string }

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = { Name = "cng-compliance-vpc-${var.environment}" }
}

resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = var.availability_zones[count.index]
  tags = { Name = "cng-compliance-private-${count.index}" }
}

resource "aws_security_group" "backend" {
  name        = "cng-backend-sg-${var.environment}"
  description = "Backend application / EKS worker nodes security group"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 8000
    to_port     = 8000
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

output "vpc_id" { value = aws_vpc.main.id }
output "private_subnets" { value = aws_subnet.private[*].id }
output "backend_security_group_id" { value = aws_security_group.backend.id }
