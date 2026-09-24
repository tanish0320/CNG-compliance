variable "environment" {
  type        = string
  description = "Target deployment environment (development, staging, production)"
  default     = "production"
}

variable "primary_region" {
  type        = string
  description = "Primary AWS region"
  default     = "ap-south-1"
}

variable "secondary_region" {
  type        = string
  description = "Secondary AWS region for multi-region failover"
  default     = "ap-southeast-1"
}

variable "primary_vpc_cidr" {
  type    = string
  default = "10.100.0.0/16"
}

variable "secondary_vpc_cidr" {
  type    = string
  default = "10.200.0.0/16"
}

variable "db_name" {
  type    = string
  default = "cng_compliance"
}

variable "db_username" {
  type    = string
  default = "cng_admin"
}

variable "db_password_secret_arn" {
  type        = string
  description = "AWS Secrets Manager ARN for database password"
  sensitive   = true
}
