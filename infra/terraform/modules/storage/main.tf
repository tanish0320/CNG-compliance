variable "bucket_prefix" { type = string }
variable "secondary_region" { type = string }
variable "retention_days" { type = number }
variable "environment" { type = string }

resource "aws_s3_bucket" "evidence" {
  bucket = "${var.bucket_prefix}-${var.environment}"
}

# Block all public access
resource "aws_s3_bucket_public_access_block" "evidence_block" {
  bucket                  = aws_s3_bucket.evidence.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enforce Server-Side Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "evidence_enc" {
  bucket = aws_s3_bucket.evidence.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Configure Lifecycle Policy (Expire evidence images after 30 days)
resource "aws_s3_bucket_lifecycle_configuration" "evidence_lifecycle" {
  bucket = aws_s3_bucket.evidence.id

  rule {
    id     = "expire_old_evidence"
    status = "Enabled"

    expiration {
      days = var.retention_days
    }
  }
}

output "bucket_name" { value = aws_s3_bucket.evidence.id }
