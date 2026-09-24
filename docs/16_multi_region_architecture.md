# Multi-Region Production Architecture Specification

## 1. Executive Overview
This document specifies the multi-region topology for scaling **CNG Compliance Enterprise** across geographically distributed regional nodes to support 1,000,000+ active field users while maintaining low latency, high availability (99.99%), data residency, and audit immutability.

## 2. Regional Deployment Topology

```
                         +-----------------------------------+
                         | Global Anycast DNS / Cloudflare   |
                         +-----------------------------------+
                                           |
                   +-----------------------+-----------------------+
                   |                                               |
                   v                                               v
     +---------------------------+                   +---------------------------+
     |   Region 1: Primary (ap-south-1)  |   |   Region 2: Standby (ap-southeast-1) |
     +---------------------------+                   +---------------------------+
     | - Global API Gateway / WAF|                   | - Regional API Gateway/WAF|
     | - FastAPI Service Cluster |                   | - FastAPI Service Cluster |
     | - Primary CockroachDB Node| <== Async Sync == | - Replica CockroachDB Node|
     | - Redis Cluster (Region 1)|                   | - Redis Cluster (Region 2)|
     | - MinIO / S3 Bucket (R1)  | <== Replicated => | - MinIO / S3 Bucket (R2)  |
     +---------------------------+                   +---------------------------+
```

### 2.1 Component Breakdown
- **Regional API Services**: Stateful-less FastAPI ASGI clusters deployed behind regional Kubernetes (EKS/GKE) ingress with Horizontal Pod Autoscalers (HPA).
- **Database Topology**: Distributed multi-region CockroachDB or AWS Aurora Global Database with read-replicas in each target region and single-leader write consensus.
- **Redis Caching & Idempotency**: Regional Redis Enterprise clusters running CRDTs (Conflict-free Replicated Data Types) for global idempotency key lock propagation.
- **Object Storage**: AWS S3 Cross-Region Replication (CRR) for secure, encrypted storage of vehicle plate evidence images.

## 3. Idempotency & Data Consistency Across Regions
- **Global Idempotency Key Lock**: Idempotency keys (`Idempotency-Key` header) are checked atomically against the local regional Redis cluster. If missing, key locks are propagated globally via active-active Redis CRDT or distributed DB write lock.
- **Audit Event Consistency**: Audit logs use immutable append-only logs (`audit_events` table) with UTC timestamps. Regional nodes write append logs locally, which replicate asynchronously to the global audit vault within < 500ms.

## 4. Disaster Recovery & Regional Failover
- **RTO (Recovery Time Objective)**: < 30 seconds for automatic DNS failover.
- **RPO (Recovery Point Objective)**: < 1 second for database transaction synchronization.
- **Health Probes**: Global latency probes continuously monitor `/health` and `/metrics` endpoints. In the event of regional outage, anycast DNS dynamically reroutes traffic to the secondary active region.

## 5. Deployment Status Matrix

| Component | Architecture Designed | Local / Staging Tested | Live Cloud Multi-Region Deployed |
|---|---|---|---|
| **API Container** | 100% | Yes (Docker Compose) | Pending Cloud Infrastructure Provisioning |
| **Global Load Balancer** | 100% | No (Localhost) | Pending Cloud CDN / Anycast Setup |
| **Multi-Region DB** | 100% | Yes (PostgreSQL Container) | Pending Managed Global Database Instance |
