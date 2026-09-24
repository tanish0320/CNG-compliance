output "primary_vpc_id" {
  value = module.networking_primary.vpc_id
}

output "secondary_vpc_id" {
  value = module.networking_secondary.vpc_id
}

output "database_endpoint" {
  value     = module.database.cluster_endpoint
  sensitive = true
}

output "redis_primary_endpoint" {
  value = module.redis_primary.endpoint
}

output "evidence_bucket_name" {
  value = module.evidence_storage.bucket_name
}
