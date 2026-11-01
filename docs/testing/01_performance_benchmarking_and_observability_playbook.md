# Production Performance, Benchmarking & Observability Playbook
## Real-World Validation Guide for My School Care Multi-Tenant System

**Purpose:** Comprehensive operational guide to validate Virtual Threads, Database Connection Pools, Token Refresh Concurrency, and System Latency under High Concurrency.  
**Classification:** Operational Runbook & Production Testing Standard  
**Prerequisites:** Node.js 18+, Java 21, Spring Boot Backend (Port 8085), PostgreSQL  

---

## 1. Observability Architecture & Metrics Foundation

Under production traffic, multi-tenant systems require real-time observability to detect thread contention, connection pool starvation, and carrier thread pinning before system degradation occurs.

```
[System Traffic] ──► [Spring Boot Actuator] ──► [/actuator/prometheus]
                                                          │
                                                          ▼ (Scraped every 2s)
                                                    [Prometheus]
                                                          │
                                                          ▼
                                                 [Grafana Dashboards]
```

### The Five Golden Observability Metrics

| Metric Identifier | Prometheus Metric Key | Operational Significance |
| :--- | :--- | :--- |
| **1. Active DB Connections** | `hikaricp_connections_active` | Measures physical connections currently executing active queries (Max: e.g., 20). |
| **2. Pending DB Requests** | `hikaricp_connections_pending` | **Critical Metric**: Quantifies virtual threads queued waiting for a free database connection. Values $> 0$ indicate pool saturation. |
| **3. Virtual Thread Pinning** | `jvm_threads_virtual_pinned` | Detects virtual threads blocking carrier platform threads due to synchronized locks or JNI calls. Target: **0**. |
| **4. HTTP Request Latency** | `http_server_requests_seconds{quantile="0.95"}` | Measures p95 and p99 response times experienced by end users. |
| **5. JVM Host CPU Load** | `system_cpu_usage` | Reflects server processor utilization during cryptographic hashing and heavy computations. |

---

## 2. Step 1: Backend Metrics Activation

To expose Prometheus-formatted metrics from the Spring Boot backend:

### A. Dependencies in `backend/pom.xml`:
```xml
<!-- Spring Boot Actuator: Core Health and Monitoring Engine -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>

<!-- Micrometer Prometheus Registry: Formats metrics for Prometheus scraping -->
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>
```

### B. Configuration in `backend/src/main/resources/application.properties`:
```properties
# -------------------------------------------------------------------
# Actuator & Prometheus Metrics Configuration
# -------------------------------------------------------------------
management.endpoints.web.exposure.include=health,info,metrics,prometheus
management.endpoint.prometheus.enabled=true
management.metrics.export.prometheus.enabled=true

# HikariCP Pool Explicit Naming for Metrics Scoping
spring.datasource.hikari.pool-name=MySchoolCareHikariPool
spring.datasource.hikari.maximum-pool-size=20
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.connection-timeout=30000

# Enable Percentiles for p50, p90, p95, p99 Latency Metrics
management.metrics.distribution.percentiles.http.server.requests=0.5,0.9,0.95,0.99
management.metrics.distribution.percentiles-histogram.http.server.requests=true
```

---

## 3. Step 2: Prometheus and Grafana Infrastructure

### A. Docker Compose Configuration (`docker-compose.monitoring.yml`):
```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: myschoolcare-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: myschoolcare-grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    restart: unless-stopped
```

### B. Prometheus Scrape Configuration (`prometheus.yml`):
```yaml
global:
  scrape_interval: 2s # Rapid 2-second polling interval for real-time visibility

scrape_configs:
  - job_name: 'myschoolcare-backend'
    metrics_path: '/actuator/prometheus'
    static_configs:
      - targets: ['host.docker.internal:8085'] # Reaches backend from container
```

### C. Pre-Built Grafana Dashboard Templates:
1. **JVM (Micrometer) Dashboard**: Import Grafana Dashboard ID **`4701`**. Visualizes virtual threads, heap allocations, and CPU utilization.
2. **HikariCP Pool Dashboard**: Import Grafana Dashboard ID **`11462`**. Visualizes active, idle, and pending database connections in real time.

---

## 4. Step 3: Multi-Tenant Load Testing Engine with PM2

We establish a dedicated load-testing script: `tests/benchmark/load_test.js`.

### Test Script Capabilities:
1. Generates realistic multi-tenant concurrent requests across distinct institutional schools (`himaliyan-public-school`, `delhi-public-school`).
2. Fires parallel calls to `/api/v1/iam/members`, `/api/v1/iam/roles`, and `/api/v1/students`.
3. Measures real-time **RPS (Requests Per Second)**, **Error Rates**, and **p95/p99 Latencies**.

### Implementation (`tests/benchmark/load_test.js`):
```javascript
const autocannon = require('autocannon');

async function runBenchmark() {
  console.log('🚀 Initiating My School Care Multi-Tenant Concurrency Benchmark...');

  const instance = autocannon({
    url: 'http://localhost:8085/api/v1/iam/roles?orgId=2',
    connections: 100, // 100 concurrent virtual users
    pipelining: 1,
    duration: 30, // 30-second sustained load
    headers: {
      'Content-Type': 'application/json',
      // Scoped bearer access token injected here during execution
    }
  }, (err, result) => {
    if (err) {
      console.error('Benchmark execution error:', err);
      return;
    }
    console.log('\n================ BENCHMARK EXECUTION SUMMARY ================');
    console.log(`Throughput:       ${result.requests.average} req/sec`);
    console.log(`Data Transfer:    ${(result.throughput.average / 1024 / 1024).toFixed(2)} MB/sec`);
    console.log(`Latency p50:      ${result.latency.p50} ms`);
    console.log(`Latency p95:      ${result.latency.p95} ms`);
    console.log(`Latency p99:      ${result.latency.p99} ms`);
    console.log(`Error Count:      ${result.errors}`);
    console.log(`Timeout Count:    ${result.timeouts}`);
    console.log('=============================================================\n');
  });

  autocannon.track(instance, { renderProgressBar: true });
}

runBenchmark();
```

### Process Management with PM2:
PM2 enables clustering and sustained execution of the benchmark worker:
```bash
# 1. Install autocannon and pm2 globally
npm install -g autocannon pm2

# 2. Launch benchmark process managed by PM2
pm2 start tests/benchmark/load_test.js --name "load-tester"

# 3. Monitor live CPU and memory utilization of the load generator
pm2 monit
```

---

## 5. The Four Production Stress Test Scenarios

---

### Scenario 1: Baseline Load Test (Normal Operational Capacity)
* **Configuration**: 50 concurrent virtual users executing IAM queries for 60 seconds.
* **Objective**: Confirm that virtual threads maintain p95 latency below $20\text{ ms}$.
* **Expected Metrics**:
  - `hikaricp_connections_active`: 2 to 5 connections.
  - `hikaricp_connections_pending`: **0** (Zero connection queuing).
  - Error rate: **0.00%**.

---

### Scenario 2: Connection Pool Exhaustion Test (Peak Registration Surge)
* **Configuration**: 500 concurrent virtual users executing database queries simultaneously.
* **Objective**: Intentionally exceed the default `maximum-pool-size = 20` to validate queuing stability.
* **Expected Metrics & Observations**:
  1. `hikaricp_connections_active` saturates at 20 (Full utilization).
  2. `hikaricp_connections_pending` increases to 30–80 (Virtual threads parked waiting for free DB connections).
  3. Latency p99 increases from 20ms to 200ms–400ms.
  4. **System Stability Verification**: All requests successfully complete without triggering `SQLTransientConnectionException` timeouts.

---

### Scenario 3: CPU Hashing Stress Test (Concurrent Login Surge)
* **Configuration**: 100 concurrent requests hitting `POST /api/v1/auth/login` simultaneously.
* **Objective**: Observe system resilience during intensive BCrypt cryptographic calculations.
* **Expected Metrics & Observations**:
  - Host CPU load rises to 80%–100%.
  - Verify that virtual threads continue serving lightweight I/O requests (such as student reads) without thread deadlock or starvation.

---

### Scenario 4: Concurrent Token Refresh Race Test (Zero-Logout Verification)
* **Configuration**: Dispatch 10 parallel API requests bearing an expired access token from a single browser session.
* **Objective**: Verify that the client-side single-flight mutex intercepts the 401 status codes, issues a single refresh call, and replays all 10 calls successfully with HTTP 200 without clearing local storage or forcing a user logout.

---

## 6. Execution Tracking and Gap Identification Log

| Test Scenario | Execution Status | Observed Latency (p95 / p99) | DB Connection Pool State | Gaps Identified | Resolution Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Baseline Load (50 VUs)** | Pending | - | - | - | Ready for Run |
| **DB Pool Stress (500 VUs)** | Pending | - | - | - | Ready for Run |
| **CPU Login Stress** | Pending | - | - | - | Ready for Run |
| **Token Refresh Race** | Pending | - | - | - | Ready for Run |
