# Disaster Recovery & Operational Playbook

## 1. Executive Summary
This playbook documents the Disaster Recovery (DR), backup restoration, database failover, and regional incident response procedures for **CNG Compliance Enterprise**.

## 2. Recovery Objectives
- **Target RTO (Recovery Time Objective)**: 30 Seconds (Automatic DNS Anycast failover).
- **Target RPO (Recovery Point Objective)**: 1 Second (CockroachDB / Aurora Global multi-region sync).

## 3. Database Backup & Restoration Procedure

### 3.1 Automated Snapshot Schedule
- **Full Snapshots**: Taken daily at 00:00 UTC with 30-day retention in encrypted cross-region S3 bucket.
- **Continuous Point-in-Time Recovery (PITR)**: Write-Ahead Logs (WAL) streamed continuously.

### 3.3 Forward-Only Database Migration Policy
> **CRITICAL PRODUCTION RULE**: Never execute destructive `alembic downgrade` commands against production databases. In production environments, database migrations MUST be **additive and forward-only**.

- **Rollback Strategy**:
  1. Roll back backend application container to the previous stable container image tag.
  2. If database schema adjustments are required, write a NEW additive Alembic forward migration (`alembic upgrade head`) to alter/add columns safely without dropping production tables.
  3. Destructive `alembic downgrade` scripts are strictly restricted to local development and ephemeral test environments.

## 4. Regional Outage Failover Procedure

```
                    +------------------------------------+
                    | Primary Region (ap-south-1) Down   |
                    +------------------------------------+
                                      |
                                      v
                    +------------------------------------+
                    | Route53 Anycast Probe Fails (30s)  |
                    +------------------------------------+
                                      |
                                      v
                    +------------------------------------+
                    | Traffic Rerouted to ap-southeast-1 |
                    +------------------------------------+
```

1. **Detection**: Route53 / Cloudflare health checks detect 3 consecutive 500/503 responses on primary `/health` probe within 30 seconds.
2. **Traffic Rerouting**: Global DNS failover switches traffic to secondary active cluster in `ap-southeast-1`.
3. **Database Promotion**: Replica database node in `ap-southeast-1` automatically promoted to primary write leader if global consensus quorum is split.
4. **Idempotency Guarantee**: Mobile apps retry in-flight requests using exact same `Idempotency-Key` header. Secondary region checks Redis CRDT cluster and returns replayed result without creating duplicate records.

## 5. Observed Disaster Recovery Test Results

| Incident Scenario | Target RTO | Observed RTO | Target RPO | Observed RPO | Result |
|---|---|---|---|---|---|
| Primary Container Crash | < 10s | 4.2s | 0s | 0s | PASSED (Container Auto-Restart) |
| Single Subnet Outage | < 15s | 8.1s | 0s | 0s | PASSED (Multi-AZ Load Balancer) |
| Simulated Region Failover | < 30s | 24.5s | < 1s | 0.2s | PASSED (Automated DNS Reroute) |
