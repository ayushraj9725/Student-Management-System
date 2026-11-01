# Concurrency Engine, Thread Models & Asynchronous Execution Architecture
## Enterprise Thread Scheduling, Context Propagation, and Scalability Engineering

**System:** My School Care (Multi-Tenant SaaS)  
**Author:** Ayush Raj & Principal Engineering Team  
**Focus:** Concurrency, Java 21 Virtual Threads, Asynchronous Context Propagation, and Capacity Engineering  
**Classification:** Deep Technical Architecture Specification (`docs/technical_discussions/02_concurrency_threads_and_executor_architecture.md`)  

---

## 1. Executive Summary & Architectural Purpose

In a high-throughput multi-tenant SaaS application, concurrency management directly dictates system availability, latency predictability, and cloud infrastructure cost. If uncoordinated, thousands of simultaneous web requests and asynchronous background tasks can cause:
1. **Thread Starvation**: Exhausting OS-level platform threads, causing connection drops and timeouts.
2. **Context Bleeding**: Leaking tenant identity across pooled worker threads, leading to catastrophic cross-tenant data corruption.
3. **Database Pool Collapse**: Overwhelming the relational database connection pool with unbounded concurrent queries.
4. **CPU Core Thrashing**: Degrading response times by saturating physical CPU cores with unthrottled computation.

This document establishes the authoritative operational specification for how **Java 21 Virtual Threads**, **Spring Boot's `ThreadPoolTaskExecutor`**, and **`TenantContextTaskDecorator`** interact to deliver high concurrency with deterministic isolation and backpressure.

---

## 2. Core Mental Model: The Restaurant & Token Analogy

To intuitively grasp how the hardware, operating system, and JVM runtime cooperate, consider the operational model of a high-volume restaurant:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             THE HARDWARE & RUNTIME ANALOGY                       │
├─────────────────────────┬───────────────────────────────┬────────────────────────┤
│ Hardware / Software     │ Restaurant Equivalent         │ Operational Meaning    │
├─────────────────────────┼───────────────────────────────┼────────────────────────┤
│ Physical CPU Cores (8)  │ 8 Physical Gas Stoves         │ Maximum parallel math  │
│ Platform OS Threads     │ 8 Professional Chefs          │ Expensive OS resources │
│ Java 21 Virtual Threads │ 10,000 Order Bookmarks/Waiters│ Cheap JVM memory (~1KB)│
│ Database (PostgreSQL)   │ Central Deep Storage Pantry   │ Shared physical storage│
│ HikariCP Pool (20)      │ 20 High-Speed Service Carts   │ Limited DB connections │
│ TenantContext           │ Institutional School Stamp    │ Tenant identification  │
│ ThreadLocal             │ Chef's / Waiter's Apron Pocket│ Ephemeral thread state │
└─────────────────────────┴───────────────────────────────┴────────────────────────┘
```

When 1,000 requests arrive:
- Under legacy architectures, 1,000 heavy Chefs (OS threads) had to be hired, allocating 1MB to 2MB of RAM per chef and constantly jostling for the 8 physical stoves (OS context-switching thrashing).
- Under modern Java 21 architecture, 1,000 lightweight Order Bookmarks (Virtual Threads) are created in memory. As long as an order is waiting for the pantry to deliver ingredients (Database I/O), the Chef immediately steps over to another stove and continues cooking.

---

## 3. Web Layer: Tomcat on Java 21 Virtual Threads

### 3.1 Configuration & Activation
In [`application.properties`](file:///c:/Users/AyushRaj/Desktop/Student_management_system/backend/src/main/resources/application.properties):
```properties
spring.threads.virtual.enabled=true
```

In Spring Boot 3.2+, this property automatically configures Tomcat's internal `ProtocolHandler` to route all incoming HTTP request sockets to `Executors.newVirtualThreadPerTaskExecutor()`.

### 3.2 The Mounting & Unmounting Lifecycle
The interaction between Virtual Threads, Carrier OS Threads, and Physical CPU Cores is illustrated below:

```
[Incoming HTTP Request]
         │
         ▼
[Java 21 Virtual Thread (Lightweight Heap Object)]
         │
         ▼ (Mounts onto Carrier Thread)
[Carrier OS Platform Thread (ForkJoinPool worker)]
         │
         ▼ (Executes instruction on hardware)
[Physical CPU Core]
         │
         ▼
[Repository executes JDBC query to PostgreSQL (I/O Block)]
         │
   ┌─────┴────────────────────────────────────────────────────────┐
   │                    THE UNMOUNTING BREAKTHROUGH               │
   │ The Virtual Thread yields and unmounts from Carrier Thread.  │
   │ Carrier OS Thread is immediately FREE to run other requests! │
   └─────┬────────────────────────────────────────────────────────┘
         │
         ▼ (5ms later: PostgreSQL returns query result set)
[Virtual Thread Wakes Up & Re-mounts on ANY available Carrier Thread]
         │
         ▼
[Transforms DTO & Returns HTTP 200 OK Response]
```

### 3.3 The Carrier Pinning Caveat
A virtual thread cannot unmount if:
1. It executes inside a `synchronized (lock)` block where a native monitor is held (Java 21 limitation; addressed in later Java releases).
2. It calls native C/C++ code via JNI.

**Architectural Rule**: All synchronization in critical paths must utilize `java.util.concurrent.locks.ReentrantLock` rather than intrinsic `synchronized` blocks.

---

## 4. Multi-Tenant Context Propagation Across Async Boundaries

### 4.1 The "Empty Pocket" Problem of `ThreadLocal`
`ThreadLocal` stores data unique to the current running thread. When an HTTP request executes, [`TenantContextFilter`](file:///c:/Users/AyushRaj/Desktop/Student_management_system/backend/src/main/java/com/student/management/shared/filter/TenantContextFilter.java) binds the verified [`TenantContext`](file:///c:/Users/AyushRaj/Desktop/Student_management_system/backend/src/main/java/com/student/management/shared/context/TenantContext.java) into the HTTP thread's `ThreadLocal`.

However, when an asynchronous method (`@Async`) or background task is dispatched:
1. The task is queued for execution on a separate thread pool (`ThreadPoolTaskExecutor`).
2. The worker thread that picks up the task has its own independent, uninitialized `ThreadLocal` memory slot.
3. If an async task queries the database or calls a service relying on `TenantContextHolder.getTenantId()`, it receives `null`, causing failed operations or unauthorized query execution.

### 4.2 The Solution: `TaskDecorator` Context Bridge
Spring's `TaskDecorator` interface acts as an interceptor during task scheduling.

```
Caller Thread (Tomcat Request)             Async Worker Thread (TenantWorker-X)
─────────────────────────────              ───────────────────────────────────
Context: { orgId: 101, userId: 45 }         Context: null (Empty)
        │                                                     │
        ▼ (Calls @Async service method)                       │
[TaskDecorator.decorate(runnable)]                            │
  Capture snapshot on Caller Thread!                          │
  callerContext = TenantContextHolder.getContext();            │
        │                                                     │
        ▼ (Runnable queued into LinkedBlockingQueue)          │
[Queue Capacity: 1000]                                        │
        │                                                     │
        └─────────────────► Handoff to Worker ────────────────┘
                                  │
                                  ▼
                    try {
                        // 1. Inject context into worker thread
                        TenantContextHolder.setContext(callerContext);
                        
                        // 2. Execute business task
                        runnable.run(); 
                    } finally {
                        // 3. Unconditionally scrub context
                        TenantContextHolder.clear();
                    }
```

### 4.3 Why Submission Time vs Execution Time Matters
In [`AsyncConcurrencyConfig.java`](file:///c:/Users/AyushRaj/Desktop/Student_management_system/backend/src/main/java/com/student/management/config/AsyncConcurrencyConfig.java):
```java
public static class TenantContextTaskDecorator implements TaskDecorator {
    @Override
    @NonNull
    public Runnable decorate(@NonNull Runnable runnable) {
        // [SUBMISSION TIME]: Evaluated on the calling HTTP thread
        TenantContext callerContext = TenantContextHolder.getContext();

        return () -> {
            try {
                // [EXECUTION TIME]: Evaluated on the worker thread
                if (callerContext != null) {
                    TenantContextHolder.setContext(callerContext);
                }
                runnable.run();
            } finally {
                // [CLEANUP TIME]: Always executed before worker returns to pool
                TenantContextHolder.clear();
            }
        };
    }
}
```

If context capture were attempted at *execution time*, it would read from the worker thread's empty `ThreadLocal` and capture `null`. Capturing at *submission time* guarantees that the immutable snapshot is preserved while the caller thread still possesses the verified identity.

---

## 5. Capacity Engineering: The 16–64 Thread Pool & 1,000 Queue Sizing

A critical architectural question is: **If Java 21 Virtual Threads are enabled, why does `AsyncConcurrencyConfig` configure a bounded platform thread pool with 16–64 threads and a 1,000-capacity queue?**

```java
ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
executor.setCorePoolSize(16);
executor.setMaxPoolSize(64);
executor.setQueueCapacity(1000);
executor.setThreadNamePrefix("TenantWorker-");
executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
```

The engineering rationale is governed by four constraints:

### 5.1 Defense Against CPU Core Thrashing
- **Virtual Threads are optimized for I/O waiting, not CPU computation.**
- Background asynchronous tasks often perform compute-intensive operations:
  - BCrypt password hashing (cost factor 10–12 = ~80ms pure CPU execution per hash).
  - PDF report compilation and invoice rendering.
  - Large Excel sheet imports/exports.
- If 2,000 background compute tasks were dispatched onto unbounded virtual threads, 2,000 virtual threads would continuously compete for the 8 physical CPU cores. The operating system kernel would spend excessive cycles context-switching, causing all applications (including the web UI) to lag and become unresponsive.
- Bounding compute workers to **16–64 threads** ensures the physical CPU cores operate at maximum throughput without kernel thrashing.

### 5.2 Database Connection Pool Preservation (HikariCP)
- The database connection pool (`spring.datasource.hikari.maximum-pool-size`) is bounded at **20 connections**.
- If background processing used unbounded virtual threads, a sudden batch of 500 tasks would simultaneously request database connections from HikariCP.
- HikariCP's 20 connections would instantly saturate, causing connection lease timeouts (`SQLTransientConnectionException: Connection is not available, request timed out after 30000ms`).
- A bounded pool of 16–64 workers aligns with the 20-connection database pool, ensuring healthy connection reuse.

### 5.3 External Service Rate Limiting
- Background tasks frequently interface with external third-party services:
  - SMTP Email Servers (e.g. Amazon SES, SendGrid, Mailgun).
  - SMS Gateways (e.g. Twilio, MSG91).
  - WhatsApp Business APIs.
- Firing 5,000 unthrottled requests at once triggers HTTP 429 (Too Many Requests), IP blacklisting, or socket exhaustion. The bounded queue acts as an internal rate-limiting governor.

---

## 6. Backpressure Architecture & Scaling Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        BACKPRESSURE BUFFER ESCALATION                  │
│                                                                        │
│   Incoming Async Tasks ──► [ Core Pool: 16 Threads Running ]           │
│                                      │                                 │
│                                      ▼ (Saturated)                     │
│                            [ Queue: 1,000 Slots Filling ]              │
│                                      │                                 │
│                                      ▼ (Queue Full)                    │
│                            [ Burst Pool: Up to 64 Threads ]            │
│                                      │                                 │
│                                      ▼ (All 64 Saturated)              │
│                            [ CallerRunsPolicy Triggered ]              │
│                                      │                                 │
│                                      ▼                                 │
│                      Submitting Thread Executes Task                   │
│                      (Naturally slows down HTTP intake!)               │
└────────────────────────────────────────────────────────────────────────┘
```

### 6.1 In-Process Backpressure: `CallerRunsPolicy`
When both the 1,000-capacity queue and the 64-thread burst pool are saturated:
- Standard executors often use `AbortPolicy` (which throws `RejectedExecutionException` and drops the user's task).
- Our configuration enforces:
  ```java
  executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
  ```
- Under `CallerRunsPolicy`, the thread attempting to submit the task (e.g., the Tomcat HTTP thread) is forced to execute the task itself.
- **Why this is critical**: By forcing the caller thread to execute the work, the caller cannot accept or submit new incoming requests until the task completes. This introduces **natural mechanical backpressure**, slowing down upstream traffic intake and giving the server time to recover without crashing.

---

## 7. Vertical Scaling vs Horizontal Scaling Evolution Blueprint

This concurrency architecture serves as the foundation for scaling My School Care across its operational lifecycle:

### Phase 1: Single-Node Vertical Scaling (Current Architecture)
On a single cloud instance (e.g. 4 vCPU / 8GB RAM up to 16 vCPU / 32GB RAM):
- **Web Layer**: Virtual threads scale effortlessly to 5,000–10,000 concurrent HTTP connections.
- **Async Layer**: Bounded to `16–64` threads, queue `1000`.
- **Database Pool**: HikariCP set to $2 \times \text{vCPU} + \text{spindle count}$ (e.g., 20–30 connections).
- **Limit**: Reached when physical CPU reaches 85% sustained utilization or database memory buffers saturate.

### Phase 2: Multi-Node Horizontal Scaling (Future Production Roadmap)
When total institutional load exceeds the capacity of a single vertical node:

```
                               ┌───► [ Web/App Instance 1 (Virtual Threads + 16-64 Pool) ]
                               │
[ Cloud Load Balancer (ALB) ] ─┼───► [ Web/App Instance 2 (Virtual Threads + 16-64 Pool) ]
                               │
                               └───► [ Web/App Instance 3 (Virtual Threads + 16-64 Pool) ]
                                                │
                                                ▼
                             ┌──────────────────────────────────────┐
                             │       SHARED DISTRIBUTED BACKBONE    │
                             │ • Distributed Cache: Redis Cluster   │
                             │ • Distributed Messaging: RabbitMQ    │
                             │ • Database: Managed PostgreSQL (RDS) │
                             └──────────────────────────────────────┘
```

1. **Distributed Queue Offloading**:
   - In-memory `ThreadPoolTaskExecutor` handles lightweight, low-latency background events.
   - Heavy, multi-tenant background workloads (bulk SMS, monthly fee generation) are offloaded to an external distributed message broker (RabbitMQ or Apache Kafka).
2. **Distributed Backpressure**:
   - Replaces in-memory `CallerRunsPolicy` with Redis-based Token Bucket rate limiting (e.g., max 100 requests/sec per school tenant).
3. **Cluster-Wide Tenant Invalidation**:
   - When a school membership is suspended, a Redis Pub/Sub event is broadcast across all app nodes, immediately invalidating cached tenant contexts cluster-wide.

---

## 8. Architectural Verification Matrix

| Architectural Question | Enforced Mechanism | Code Location | Production Protection |
| :--- | :--- | :--- | :--- |
| **When is context captured?** | Task submission time (Caller thread) | [`AsyncConcurrencyConfig.java#L44-L46`](file:///c:/Users/AyushRaj/Desktop/Student_management_system/backend/src/main/java/com/student/management/config/AsyncConcurrencyConfig.java#L44-L46) | Prevents capturing empty worker context. |
| **What happens if context is null?** | Worker context remains null; fail-closed | [`AsyncConcurrencyConfig.java#L49-L52`](file:///c:/Users/AyushRaj/Desktop/Student_management_system/backend/src/main/java/com/student/management/config/AsyncConcurrencyConfig.java#L49-L52) | Blocks unauthorized cross-tenant operations. |
| **Is context scrubbed on exception?** | Guaranteed `finally { clear(); }` | [`AsyncConcurrencyConfig.java#L53-L56`](file:///c:/Users/AyushRaj/Desktop/Student_management_system/backend/src/main/java/com/student/management/config/AsyncConcurrencyConfig.java#L53-L56) | Zero context leakage across thread reuse. |
| **Is decorator globally enforced?** | `implements AsyncConfigurer` + `@Primary` | [`AsyncConcurrencyConfig.java#L21-L26`](file:///c:/Users/AyushRaj/Desktop/Student_management_system/backend/src/main/java/com/student/management/config/AsyncConcurrencyConfig.java#L21-L26) | All `@Async` calls inherit tenant context. |
| **Why 16–64 threads & 1000 queue?** | Resource bounding & DB pool defense | [`AsyncConcurrencyConfig.java#L27-L32`](file:///c:/Users/AyushRaj/Desktop/Student_management_system/backend/src/main/java/com/student/management/config/AsyncConcurrencyConfig.java#L27-L32) | Protects physical CPU, HikariCP & APIs. |
| **What handles overload?** | `CallerRunsPolicy` backpressure | [`AsyncConcurrencyConfig.java#L32`](file:///c:/Users/AyushRaj/Desktop/Student_management_system/backend/src/main/java/com/student/management/config/AsyncConcurrencyConfig.java#L32) | Prevents dropped tasks & server crashes. |

