# BIZRA Node0 Genesis - Runbook

## Table of Contents

1. [System Overview](#system-overview)
2. [Quick Reference](#quick-reference)
3. [Startup Procedures](#startup-procedures)
4. [Shutdown Procedures](#shutdown-procedures)
5. [Health Checks](#health-checks)
6. [Common Issues](#common-issues)
7. [Emergency Procedures](#emergency-procedures)
8. [Monitoring & Alerting](#monitoring--alerting)
9. [Backup & Recovery](#backup--recovery)
10. [Scaling Procedures](#scaling-procedures)

---

## System Overview

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          BIZRA Node0 Genesis                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │   Frontend   │    │  API Gateway │    │   Backend    │              │
│  │   (Next.js)  │───▶│   (Nginx)    │───▶│   (Rust)     │              │
│  │   :3000      │    │   :80/443    │    │   :8080      │              │
│  └──────────────┘    └──────────────┘    └──────┬───────┘              │
│                                                  │                      │
│         ┌────────────────────────────────────────┼───────────┐         │
│         │                                        │           │         │
│         ▼                                        ▼           ▼         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐     │
│  │  PostgreSQL  │    │    Redis     │    │   LLM Backends       │     │
│  │   :5432      │    │    :6379     │    │ Ollama:11434         │     │
│  └──────────────┘    └──────────────┘    │ LM Studio:1234       │     │
│                                          └──────────────────────┘     │
│  ┌──────────────┐    ┌──────────────┐                                 │
│  │    Neo4j     │    │    Qdrant    │                                 │
│  │ :7474/:7687  │    │ :6333/:6334  │                                 │
│  └──────────────┘    └──────────────┘                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Critical Level |
|-----------|---------------|----------------|
| Backend API | Core business logic, LLM routing | 🔴 Critical |
| PostgreSQL | User data, sessions, audit logs | 🔴 Critical |
| Redis | Caching, rate limiting | 🟡 High |
| Ollama | Primary LLM inference | 🟡 High |
| LM Studio | Secondary LLM inference | 🟢 Medium |
| Neo4j | Knowledge graph | 🟢 Medium |
| Qdrant | Vector search | 🟢 Medium |
| Frontend | User interface | 🟡 High |

---

## Quick Reference

### Service Endpoints

| Service | Port | Health Endpoint |
|---------|------|-----------------|
| Backend API | 8080 | GET /health |
| Frontend | 3000 | GET / |
| PostgreSQL | 5432 | pg_isready |
| Redis | 6379 | PING |
| Ollama | 11434 | GET /api/version |
| LM Studio | 1234 | GET /v1/models |
| Neo4j | 7474 | GET / |
| Qdrant | 6333 | GET /collections |
| Prometheus | 9090 | GET /-/ready |
| Grafana | 3001 | GET /api/health |

### Critical Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| API Latency P95 | > 300ms | > 500ms |
| Error Rate | > 0.5% | > 1% |
| CPU Usage | > 70% | > 85% |
| Memory Usage | > 75% | > 90% |
| Disk Usage | > 80% | > 90% |
| DB Connections | > 80% pool | > 95% pool |

---

## Startup Procedures

### Full System Startup

```bash
# 1. Start infrastructure databases
docker-compose up -d postgres redis neo4j qdrant

# 2. Wait for databases to be healthy (30-60 seconds)
./scripts/wait-for-databases.sh

# 3. Run database migrations
cd backend && cargo sqlx migrate run

# 4. Start LLM backends
docker-compose up -d ollama lm-studio

# 5. Start backend API
docker-compose up -d backend

# 6. Start frontend
docker-compose up -d frontend

# 7. Start monitoring stack
docker-compose up -d prometheus grafana

# 8. Verify system health
./scripts/health-check.sh
```

### Kubernetes Startup

```bash
# 1. Apply namespace and secrets
kubectl apply -k k8s/base/

# 2. Wait for StatefulSets
kubectl rollout status statefulset/postgres -n bizra-node0

# 3. Verify all pods are ready
kubectl get pods -n bizra-node0

# 4. Check ingress
kubectl get ingress -n bizra-node0
```

### Startup Checklist

- [ ] All databases responding to health checks
- [ ] Backend API returns 200 on /health
- [ ] At least one LLM backend is available
- [ ] Frontend loads successfully
- [ ] Prometheus scraping all targets
- [ ] Grafana dashboards loading

---

## Shutdown Procedures

### Graceful Shutdown

```bash
# 1. Enable maintenance mode (if applicable)
curl -X POST http://localhost:8080/admin/maintenance -H "Authorization: Bearer $ADMIN_TOKEN"

# 2. Wait for in-flight requests to complete (30-60s)
sleep 60

# 3. Stop services in reverse order
docker-compose stop frontend
docker-compose stop backend
docker-compose stop ollama lm-studio
docker-compose stop prometheus grafana
docker-compose stop redis neo4j qdrant
docker-compose stop postgres  # Last to ensure data integrity
```

### Emergency Shutdown

```bash
# Immediate stop (may lose in-flight requests)
docker-compose down --timeout 10
```

---

## Health Checks

### Manual Health Check Script

```bash
#!/bin/bash

echo "=== BIZRA Node0 Genesis Health Check ==="

# Backend API
if curl -sf http://localhost:8080/health > /dev/null; then
    echo "✅ Backend API: Healthy"
else
    echo "❌ Backend API: Unhealthy"
fi

# PostgreSQL
if docker-compose exec -T postgres pg_isready -U bizra > /dev/null 2>&1; then
    echo "✅ PostgreSQL: Healthy"
else
    echo "❌ PostgreSQL: Unhealthy"
fi

# Redis
if docker-compose exec -T redis redis-cli ping | grep -q PONG; then
    echo "✅ Redis: Healthy"
else
    echo "❌ Redis: Unhealthy"
fi

# Ollama
if curl -sf http://localhost:11434/api/version > /dev/null; then
    echo "✅ Ollama: Healthy"
else
    echo "⚠️  Ollama: Unavailable"
fi

# LM Studio
if curl -sf http://localhost:1234/v1/models > /dev/null; then
    echo "✅ LM Studio: Healthy"
else
    echo "⚠️  LM Studio: Unavailable"
fi

echo "=== Health Check Complete ==="
```

### Automated Monitoring

Health checks are automatically performed by:
1. **Kubernetes**: Liveness and readiness probes every 10s
2. **Prometheus**: Scraping every 15s
3. **Alertmanager**: Evaluating rules every 30s

---

## Common Issues

### Issue: Backend API Not Starting

**Symptoms:**
- Container exits immediately
- Health check failing

**Diagnosis:**
```bash
docker-compose logs backend --tail 100
```

**Common Causes & Solutions:**

1. **Database connection failure**
   ```bash
   # Verify PostgreSQL is running
   docker-compose ps postgres
   # Check connection
   docker-compose exec postgres psql -U bizra -c "SELECT 1"
   ```

2. **Environment variables missing**
   ```bash
   docker-compose config | grep -A 20 backend
   ```

3. **Port conflict**
   ```bash
   lsof -i :8080
   ```

### Issue: High Latency on LLM Queries

**Symptoms:**
- P95 latency > 5 seconds
- Timeout errors

**Diagnosis:**
```bash
# Check Ollama resource usage
docker stats ollama

# Check GPU availability (if using GPU)
nvidia-smi

# Check model loading status
curl http://localhost:11434/api/tags
```

**Solutions:**
1. Reduce `max_tokens` in requests
2. Use smaller/faster model
3. Increase container resources
4. Add more GPU memory

### Issue: Database Connection Pool Exhausted

**Symptoms:**
- "too many connections" errors
- Slow query execution

**Diagnosis:**
```sql
SELECT count(*) FROM pg_stat_activity WHERE datname = 'bizra_node0';
SELECT * FROM pg_stat_activity WHERE datname = 'bizra_node0' AND state = 'active';
```

**Solutions:**
```bash
# Increase pool size in backend config
# Restart backend to apply
docker-compose restart backend

# Long term: optimize slow queries
# Check query logs
docker-compose logs postgres | grep "duration:"
```

### Issue: Redis Out of Memory

**Symptoms:**
- OOM errors in Redis logs
- Cache misses increasing

**Solutions:**
```bash
# Check memory usage
docker-compose exec redis redis-cli INFO memory

# Flush non-critical cache
docker-compose exec redis redis-cli FLUSHDB

# Increase maxmemory
docker-compose exec redis redis-cli CONFIG SET maxmemory 2gb
```

---

## Emergency Procedures

### 🚨 Complete System Outage

1. **Assess the situation** (1-2 minutes)
   ```bash
   docker-compose ps
   docker-compose logs --tail 50
   ```

2. **Start critical services** (2-5 minutes)
   ```bash
   docker-compose up -d postgres redis
   sleep 30
   docker-compose up -d backend
   ```

3. **Verify minimal functionality**
   ```bash
   curl http://localhost:8080/health
   ```

4. **Start remaining services**
   ```bash
   docker-compose up -d
   ```

5. **Communicate status** to stakeholders

### 🚨 Data Corruption Detected

1. **Stop writes immediately**
   ```bash
   docker-compose stop backend
   ```

2. **Assess damage**
   ```sql
   SELECT * FROM pg_stat_user_tables;
   ```

3. **Restore from backup** (see Backup & Recovery)

4. **Verify integrity**
   ```bash
   ./scripts/verify-data-integrity.sh
   ```

### 🚨 Security Breach Detected

1. **Isolate the system**
   ```bash
   # Block external access
   iptables -A INPUT -p tcp --dport 80 -j DROP
   iptables -A INPUT -p tcp --dport 443 -j DROP
   ```

2. **Preserve evidence**
   ```bash
   docker-compose logs > /secure/incident-logs-$(date +%Y%m%d).txt
   ```

3. **Rotate all credentials**
   ```bash
   ./scripts/rotate-credentials.sh
   ```

4. **Contact security team**

---

## Monitoring & Alerting

### Prometheus Queries

```promql
# Error rate
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))

# Latency P95
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))

# Active connections
sum(http_server_active_requests)

# LLM tokens per second
rate(llm_tokens_generated_total[1m])
```

### Grafana Dashboards

- **System Overview**: CPU, memory, disk across all services
- **API Performance**: Request rate, latency distribution, error rates
- **LLM Metrics**: Token generation rate, model latency, queue depth
- **Database Health**: Connection pools, query times, cache hit rates

### Alert Response

| Alert | Severity | Response Time | Action |
|-------|----------|---------------|--------|
| ServiceDown | Critical | 5 min | Page on-call, restart service |
| HighErrorRate | Critical | 15 min | Investigate logs, rollback if recent deploy |
| HighLatency | Warning | 30 min | Check resource usage, scale if needed |
| LowDiskSpace | Warning | 1 hour | Clean up logs, expand storage |
| CertExpiringSoon | Warning | 24 hours | Renew certificates |

---

## Backup & Recovery

### Automated Backups

```yaml
# Backup Schedule
postgresql:
  frequency: Every 6 hours
  retention: 30 days
  location: s3://bizra-backups/postgres/

redis:
  frequency: Daily (RDB snapshot)
  retention: 7 days
  location: s3://bizra-backups/redis/

neo4j:
  frequency: Daily
  retention: 14 days
  location: s3://bizra-backups/neo4j/
```

### Manual Backup

```bash
# PostgreSQL
docker-compose exec postgres pg_dump -U bizra bizra_node0 | gzip > backup-$(date +%Y%m%d).sql.gz

# Redis
docker-compose exec redis redis-cli BGSAVE
docker cp $(docker-compose ps -q redis):/data/dump.rdb ./redis-backup-$(date +%Y%m%d).rdb

# Neo4j
docker-compose exec neo4j neo4j-admin database dump neo4j --to-path=/backups
```

### Recovery Procedure

```bash
# 1. Stop services
docker-compose stop backend frontend

# 2. Restore PostgreSQL
gunzip -c backup-20240115.sql.gz | docker-compose exec -T postgres psql -U bizra bizra_node0

# 3. Restore Redis
docker cp redis-backup-20240115.rdb $(docker-compose ps -q redis):/data/dump.rdb
docker-compose restart redis

# 4. Run migrations (if schema changed)
cd backend && cargo sqlx migrate run

# 5. Restart services
docker-compose up -d backend frontend

# 6. Verify data integrity
./scripts/verify-data-integrity.sh
```

---

## Scaling Procedures

### Horizontal Scaling (Kubernetes)

```bash
# Scale backend replicas
kubectl scale deployment/api-server -n bizra-node0 --replicas=5

# Enable HPA
kubectl apply -f k8s/base/api-deployment.yaml
# HPA will auto-scale between 3-10 replicas based on CPU
```

### Vertical Scaling (Docker Compose)

```yaml
# docker-compose.override.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 4G
        reservations:
          cpus: '2'
          memory: 2G
```

### Database Scaling

```bash
# Read replicas for PostgreSQL
# Add to docker-compose.yml:
services:
  postgres-replica:
    image: postgres:16-alpine
    environment:
      - POSTGRES_REPLICA_MODE=hot_standby
    depends_on:
      - postgres
```

---

## Contacts

| Role | Name | Contact |
|------|------|---------|
| Primary On-Call | Rotation | pagerduty.com/bizra |
| Backend Lead | - | #backend-team |
| Infrastructure | - | #infra-team |
| Security | - | security@bizra.io |

---

*Last Updated: 2024-01-15*
*Version: 1.0.0*
