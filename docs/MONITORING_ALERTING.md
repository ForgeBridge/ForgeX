# Monitoring & Alerting Plan

## Overview

This document defines the monitoring strategy, metrics, alerts, and runbooks for ForgeX production deployments.

---

## Monitoring Stack

### Recommended Tools

| Layer | Tool | Purpose |
|-------|------|---------|
| **Infrastructure** | Prometheus + Grafana | Metrics collection & visualization |
| **Logging** | Loki + Grafana | Log aggregation |
| **Tracing** | Tempo + Grafana | Distributed tracing |
| **Alerting** | Alertmanager + PagerDuty/Slack | Alert routing |
| **Uptime** | UptimeRobot / Better Uptime | External health checks |
| **Blockchain** | Soroban RPC + custom indexers | On-chain monitoring |

### Self-Hosted vs Managed

| Option | Pros | Cons |
|--------|------|------|
| **Self-hosted (k8s)** | Full control, no cost | Operational burden |
| **Grafana Cloud** | Managed, free tier | Data egress limits |
| **Datadog** | Comprehensive | Expensive at scale |
| **New Relic** | Good free tier | Vendor lock-in |

**Recommendation**: Start with **Grafana Cloud** (free tier: 10k series, 50 GB logs, 50 GB traces)

---

## Key Metrics

### 1. Contract Health (On-Chain)

| Metric | Source | Description | Target |
|--------|--------|-------------|--------|
| `contract_deployed_total` | Indexer | Total contracts deployed | Increasing |
| `token_created_total` | Factory events | Tokens registered | >0/day |
| `buy_transactions_total` | Curve events | Buy operations | >0/hour |
| `sell_transactions_total` | Curve events | Sell operations | >0/hour |
| `transaction_failed_total` | RPC simulation | Failed txs | <1% |
| `contract_panic_total` | RPC receipts | Contract panics | 0 |

### 2. RPC / Infrastructure

| Metric | Source | Description | Target |
|--------|--------|-------------|--------|
| `rpc_latency_seconds` | Prometheus | RPC response time (p99) | <2s |
| `rpc_error_rate` | Prometheus | 5xx / total requests | <0.1% |
| `rpc_requests_total` | Prometheus | Request throughput | N/A |
| `soroban_rpc_up` | Blackbox | RPC endpoint health | 1 |

### 3. Frontend (Next.js)

| Metric | Source | Description | Target |
|--------|--------|-------------|--------|
| `web_requests_total` | Prometheus | HTTP requests | N/A |
| `web_latency_seconds` | Prometheus | Page load (p95) | <3s |
| `web_error_rate` | Prometheus | 5xx / total | <0.5% |
| `web_build_status` | CI | Last build success | 1 |

### 4. Business Metrics

| Metric | Source | Description | Target |
|--------|--------|-------------|--------|
| `active_users_daily` | Analytics | Unique wallet connections | Growing |
| `tokens_created_daily` | Factory events | New tokens | >0 |
| `volume_xlm_daily` | Curve events | Trading volume | Growing |
| `unique_traders_daily` | Curve events | Unique buyers/sellers | Growing |

---

## Alert Rules

### Critical (Page Immediately)

| Alert | Condition | Severity | Runbook |
|-------|-----------|----------|---------|
| `ContractPanic` | `contract_panic_total > 0` | Critical | [RUNBOOK-001](./runbooks/contract-panic.md) |
| `RPCEndpointDown` | `soroban_rpc_up == 0` | Critical | [RUNBOOK-002](./runbooks/rpc-down.md) |
| `HighTxFailureRate` | `transaction_failed_total / transaction_total > 0.05` | Critical | [RUNBOOK-003](./runbooks/high-failure-rate.md) |
| `FrontendDown` | `web_up == 0` | Critical | [RUNBOOK-004](./runbooks/frontend-down.md) |

### Warning (Notify Within 1 Hour)

| Alert | Condition | Severity | Runbook |
|-------|-----------|----------|---------|
| `HighRpcLatency` | `rpc_latency_seconds{p99} > 5` | Warning | [RUNBOOK-005](./runbooks/high-latency.md) |
| `ElevatedErrorRate` | `rpc_error_rate > 0.01` | Warning | [RUNBOOK-006](./runbooks/elevated-errors.md) |
| `LowTradingVolume` | `volume_xlm_daily < 1000` (7d avg) | Warning | [RUNBOOK-007](./runbooks/low-volume.md) |
| `CertificateExpiring` | `tls_cert_expiry_days < 14` | Warning | [RUNBOOK-008](./runbooks/cert-expiry.md) |

### Info (Daily Digest)

| Alert | Condition | Severity |
|-------|-----------|----------|
| `DailyVolumeReport` | Daily at 00:00 UTC | Info |
| `NewTokensCreated` | `token_created_total` increase | Info |
| `NewUsers` | `active_users_daily` increase | Info |

---

## Alert Routing

### Channels

| Severity | Channel | Escalation |
|----------|---------|------------|
| Critical | PagerDuty → SMS → Phone | +5min → On-call → Team lead |
| Warning | Slack `#alerts-warning` | +30min → On-call |
| Info | Slack `#alerts-info` | Daily digest |

### On-Call Rotation

```yaml
# .github/oncall.yaml
rotation:
  - name: "Primary"
    users: [alice, bob]
    schedule: "weekly"
  - name: "Secondary"
    users: [carol, dave]
    schedule: "weekly"
```

---

## Dashboards

### 1. Contract Overview (Grafana)

**Panels:**
- Token creation rate (1h/24h/7d)
- Buy/Sell transaction count
- Average buy/sell size (XLM)
- Failure rate by contract
- Gas used per transaction

### 2. RPC Health

**Panels:**
- Request rate (req/s)
- Latency p50/p95/p99
- Error rate by code
- Active connections
- Queue depth

### 3. Frontend Performance

**Panels:**
- Page load time (p50/p95)
- API response time
- Error rate by endpoint
- Active users (real-time)
- Core Web Vitals (LCP, FID, CLS)

### 4. Business KPIs

**Panels:**
- Daily active users
- Tokens created (cumulative)
- Trading volume (XLM)
- Unique traders
- Revenue (protocol fees if any)

---

## Log Aggregation

### Structured Logging Format

```json
{
  "timestamp": "2024-08-13T12:34:56.789Z",
  "level": "info",
  "service": "web",
  "trace_id": "abc123",
  "span_id": "def456",
  "message": "Token created",
  "fields": {
    "token_id": "C...",
    "creator": "G...",
    "name": "MyToken"
  }
}
```

### Key Log Queries

| Query | Purpose |
|-------|---------|
| `level=error service=web` | Frontend errors |
| `level=error service=rpc` | RPC errors |
| `message="simulation failed"` | Contract simulation failures |
| `fields.token_id=*` | Token-specific logs |

---

## Distributed Tracing

### Trace Context Propagation

```typescript
// Frontend → SDK → RPC
const traceparent = `00-${traceId}-${spanId}-01`
headers.set('traceparent', traceparent)
```

### Key Spans

| Span | Service | Description |
|------|---------|-------------|
| `http.request` | Web | Incoming HTTP request |
| `sdk.invoke` | SDK | Contract invoke call |
| `rpc.simulate` | RPC | Transaction simulation |
| `rpc.submit` | RPC | Transaction submission |
| `contract.execute` | Contract | WASM execution |

---

## Runbooks

### RUNBOOK-001: Contract Panic

**Symptoms**: `contract_panic_total > 0` alert fires

**Diagnosis**:
1. Check which contract: `contract_panic_total{contract="factory"}`
2. View panic logs in RPC receipts
3. Check recent deployments

**Resolution**:
- If new deploy: Rollback to previous WASM
- If bug: Deploy fix, update frontend if needed
- If state corruption: Coordinate with Stellar support

**Contacts**: On-call + Contract team lead

### RUNBOOK-002: RPC Endpoint Down

**Symptoms**: `soroban_rpc_up == 0`

**Diagnosis**:
1. Check RPC provider status page
2. Try alternative RPC endpoint
3. Check network connectivity

**Resolution**:
- Switch to backup RPC in config
- Update DNS/environment variables
- Contact RPC provider support

**Contacts**: On-call + Infra team

### RUNBOOK-003: High Transaction Failure Rate

**Symptoms**: `failed_txs / total_txs > 5%`

**Diagnosis**:
1. Check failure reason distribution
2. Common causes:
   - Insufficient balance
   - Slippage exceeded
   - Deadline expired
   - Contract logic error

**Resolution**:
- If user error: Improve frontend validation/error messages
- If contract bug: Deploy fix
- If RPC issue: See RUNBOOK-002

### RUNBOOK-004: Frontend Down

**Symptoms**: `web_up == 0` or 5xx errors

**Diagnosis**:
1. Check Vercel deployment status
2. Check DNS/CDN
3. Check origin server logs

**Resolution**:
- Rollback to previous Vercel deployment
- Check for build failures in CI
- Scale if traffic spike

### RUNBOOK-005: High RPC Latency

**Symptoms**: `rpc_latency_seconds{p99} > 5s`

**Diagnosis**:
1. Check RPC provider load
2. Check query complexity
3. Check for stuck transactions

**Resolution**:
- Implement request caching for read-only calls
- Add request timeout/retry logic
- Contact RPC provider

### RUNBOOK-006: Elevated Error Rate

**Symptoms**: `rpc_error_rate > 1%`

**Diagnosis**:
1. Group by error code
2. Common: `TxTimeout`, `SimulationFailed`, `ContractExecutionFailed`

**Resolution**:
- Address root cause per error type
- Add retries for transient errors

### RUNBOOK-007: Low Trading Volume

**Symptoms**: `volume_xlm_daily < 1000` (below 7-day average)

**Diagnosis**:
1. Check frontend accessibility
2. Check for contract issues
3. Check market conditions

**Resolution**:
- If technical: Fix and communicate
- If market: Monitor, no action needed

### RUNBOOK-008: Certificate Expiring

**Symptoms**: `tls_cert_expiry_days < 14`

**Resolution**:
- Renew cert (Let's Encrypt auto-renew or manual)
- Update load balancer/CDN
- Verify in staging

---

## Implementation Checklist

### Phase 1: Foundation (Week 1-2)
- [ ] Deploy Prometheus + Grafana (Grafana Cloud)
- [ ] Configure Loki for logs
- [ ] Set up Tempo for traces
- [ ] Add Prometheus exporters to services

### Phase 2: Metrics & Dashboards (Week 2-3)
- [ ] Instrument SDK with metrics
- [ ] Instrument web with metrics
- [ ] Build Contract Overview dashboard
- [ ] Build RPC Health dashboard
- [ ] Build Frontend Performance dashboard

### Phase 3: Alerting (Week 3-4)
- [ ] Define all alert rules in Prometheus
- [ ] Configure Alertmanager
- [ ] Set up PagerDuty integration
- [ ] Set up Slack notifications
- [ ] Test alert firing

### Phase 4: Runbooks & On-Call (Week 4-5)
- [ ] Write all runbooks
- [ ] Set up on-call rotation
- [ ] Conduct fire drill
- [ ] Document escalation paths

### Phase 5: Business Metrics (Week 5-6)
- [ ] Add business KPI metrics
- [ ] Build Business KPI dashboard
- [ ] Set up daily/weekly reports
- [ ] Configure anomaly detection

---

## Budget Estimates

### Grafana Cloud (Free Tier)

| Resource | Limit | Cost |
|----------|-------|------|
| Metrics | 10,000 series | Free |
| Logs | 50 GB/month | Free |
| Traces | 50 GB/month | Free |
| Alerting | Included | Free |

### Production Estimates (Monthly)

| Resource | Estimate | Cost (Grafana Cloud Pro) |
|----------|----------|--------------------------|
| Metrics | 50k series | ~$50 |
| Logs | 200 GB | ~$100 |
| Traces | 100 GB | ~$100 |
| **Total** | | **~$250/month** |

---

## Compliance & Retention

| Data Type | Retention | Compliance |
|-----------|-----------|------------|
| Metrics | 13 months | SOC2 |
| Logs | 30 days (hot), 1 year (cold) | GDPR |
| Traces | 7 days (hot), 90 days (cold) | SOC2 |
| Alerts | 1 year | Audit |

---

## Contacts

| Role | Name | Contact |
|------|------|---------|
| Primary On-Call | Alice | PagerDuty / Slack |
| Secondary On-Call | Bob | PagerDuty / Slack |
| Infra Lead | Carol | Slack / Email |
| Contract Lead | Dave | Slack / Email |
| Frontend Lead | Eve | Slack / Email |

---

## Review Schedule

| Frequency | Action |
|-----------|--------|
| Weekly | Alert tuning review |
| Monthly | Dashboard review, metric cardinality check |
| Quarterly | Runbook review, fire drill |
| Annually | Tool evaluation, budget review |