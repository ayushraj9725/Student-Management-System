# Email Service Architecture, SMTP Configuration & Production Secrets Management

## 1. Executive Overview

In the My School Care multi-tenant platform, the **Email Dispatch Subsystem** is responsible for delivering critical institutional communications, including:
1. **School Tenant Onboarding Invitations**: Dispatched to the school principal with a secure activation link (`/setup-password?email=...`) and a 6-digit verification code (valid for 15 minutes).
2. **Password Reset & Account Recovery**: Dispatched with a single-use verification code (valid for 5 minutes).
3. **Institutional Notifications**: Automated alerts, student admission confirmations, and fee payment receipts.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                EMAIL DISPATCH PIPELINE & SENDER PRESENTATION                           │
│                                                                                                        │
│   Backend Subsystem (Spring Boot)                                                                      │
│          │                                                                                             │
│          ▼                                                                                             │
│   OtpServiceImpl.java                                                                                  │
│          │                                                                                             │
│          ├─► Build Multipart MimeMessage (HTML + PlainText fallback)                                    │
│          ├─► Authenticate via SMTP Relay (smtp.gmail.com:587 TLS)                                      │
│          ├─► From: "My School Care" <authenticated_account@gmail.com>                                  │
│          ├─► Reply-To: "noreply@myschoolcare.com"                                                      │
│          │                                                                                             │
│          ▼                                                                                             │
│   Google SMTP Mail Gateway                                                                             │
│          │                                                                                             │
│          ▼                                                                                             │
│   Recipient Mailbox (e.g. principal@school.edu / ayushrajtech01@gmail.com)                            │
│          │                                                                                             │
│          ▼                                                                                             │
│   Displays as:                                                                                         │
│   Sender Name: "My School Care"                                                                        │
│   Reply-To:    noreply@myschoolcare.com                                                                │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. SMTP & Sender Brand Configuration

### 2.1 SMTP Relay Provider
* **Provider**: Google SMTP (`smtp.gmail.com`)
* **Port**: `587` (STARTTLS secured)
* **Authentication**: Enforced via a 16-character **Google App Password** generated specifically for *My School Care*.

### 2.2 Sender Presentation & Domain Routing
Because Gmail SMTP enforces that the authenticated Google account is the transport envelope sender, the system uses MIME envelope headers to present the institutional identity cleanly:
* **Display Name**: `My School Care` (configured via `app.mail.from-name`)
* **Transport Sender**: Authenticated username (`spring.mail.username`)
* **Reply-To Address**: `noreply@myschoolcare.com` (configured via `app.mail.reply-to`)
  * When recipients click "Reply" in their email client, replies are redirected to the non-monitored institutional alias rather than personal inboxes.

---

## 3. Configuration Properties & Default Fallbacks

Located in [`backend/src/main/resources/application.properties`](file:///c:/Users/AyushRaj/Desktop/Student_management_system/backend/src/main/resources/application.properties):

```properties
# -------------------------------------------------------------------
# SMTP Mail Server Configuration (Gmail Relay & Institutional Dispatch)
# -------------------------------------------------------------------
spring.mail.host=smtp.gmail.com
spring.mail.port=587

# Authenticated sending account (Google Account)
spring.mail.username=${MAIL_USERNAME:ayushrajtech01@gmail.com}

# 16-character Google App Password (Generated via Google Security -> App Passwords)
spring.mail.password=${MAIL_PASSWORD:uvjxplrtdochuoti}

# SMTP TLS Protocol handshake settings
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
spring.mail.properties.mail.smtp.starttls.required=true
spring.mail.properties.mail.smtp.connectiontimeout=5000
spring.mail.properties.mail.smtp.timeout=5000
spring.mail.properties.mail.smtp.writetimeout=5000

# Institutional Brand & Sender Presentation Headers
app.mail.from-name=${MAIL_FROM_NAME:My School Care}
app.mail.reply-to=${MAIL_REPLY_TO:noreply@myschoolcare.com}
app.mail.frontend-url=${FRONTEND_BASE_URL:http://localhost:4000}
```

---

## 4. Production Deployment & Secrets Management Guide

### 4.1 Strict Security Rule for Production
> [!CAUTION]
> **Never commit plain-text credentials to public or shared version control repositories.**
> For production environments (Docker, AWS ECS, Kubernetes, Render, Railway, Fly.io, or VPS), all sensitive credentials must be injected at runtime via platform **Environment Variables** or **Secrets Managers**.

### 4.2 Comprehensive Environment Variables Matrix

| Environment Variable | Description | Example / Recommended Value | Sensitivity |
| :--- | :--- | :--- | :--- |
| `SPRING_PROFILES_ACTIVE` | Active Spring profile | `prod` | Normal |
| `SPRING_DATASOURCE_URL` | Cloud PostgreSQL JDBC URL | `jdbc:postgresql://neon.tech/...` | High |
| `SPRING_DATASOURCE_USERNAME` | Database username | `db_user` | High |
| `SPRING_DATASOURCE_PASSWORD` | Database password | `db_secret_key` | Critical |
| `JWT_SECRET` | 256-bit cryptographic signing secret | Generated hex string | Critical |
| `MAIL_USERNAME` | Production SMTP email sender | `notifications@myschoolcare.com` or `ayushrajtech01@gmail.com` | High |
| `MAIL_PASSWORD` | SMTP password / Google App Password | 16-char token (no spaces) | Critical |
| `MAIL_FROM_NAME` | Visible sender brand name | `My School Care` | Low |
| `MAIL_REPLY_TO` | Inbound no-reply routing address | `noreply@myschoolcare.com` | Low |
| `FRONTEND_BASE_URL` | Public URL of the frontend app | `https://app.myschoolcare.com` | Low |
| `AWS_ENDPOINT_URL_S3` | Object storage S3 API endpoint | `https://s3.neon.tech` | Low |
| `AWS_ACCESS_KEY_ID` | Storage access key | S3 access key ID | High |
| `AWS_SECRET_ACCESS_KEY` | Storage secret key | S3 secret key | Critical |

---

### 4.3 Deployment Platform Examples

#### 1. Docker / Docker Compose (`docker-compose.yml`)
```yaml
services:
  backend:
    image: myschoolcare/backend:latest
    environment:
      - SPRING_PROFILES_ACTIVE=prod
      - SPRING_DATASOURCE_URL=${PROD_DB_URL}
      - SPRING_DATASOURCE_USERNAME=${PROD_DB_USER}
      - SPRING_DATASOURCE_PASSWORD=${PROD_DB_PASS}
      - JWT_SECRET=${PROD_JWT_SECRET}
      - MAIL_USERNAME=${PROD_MAIL_USERNAME}
      - MAIL_PASSWORD=${PROD_MAIL_PASSWORD}
      - MAIL_FROM_NAME=My School Care
      - MAIL_REPLY_TO=noreply@myschoolcare.com
      - FRONTEND_BASE_URL=https://app.myschoolcare.com
    ports:
      - "8085:8085"
```

#### 2. Cloud Platforms (Render / Railway / Heroku / AWS Elastic Beanstalk)
In the platform dashboard under **Environment Variables / Secrets**:
1. Add `MAIL_USERNAME` $\rightarrow$ `ayushrajtech01@gmail.com` (or corporate sending address).
2. Add `MAIL_PASSWORD` $\rightarrow$ `uvjxplrtdochuoti`.
3. Add `MAIL_FROM_NAME` $\rightarrow$ `My School Care`.
4. Add `MAIL_REPLY_TO` $\rightarrow$ `noreply@myschoolcare.com`.
5. Add `FRONTEND_BASE_URL` $\rightarrow$ `https://your-domain.com`.

Spring Boot automatically maps `${MAIL_USERNAME}`, `${MAIL_PASSWORD}`, and other environment variables over the configuration properties on application boot.

---

## 5. Fallback & Resilience Strategy

If external network issues or SMTP server downtime occurs:
1. `OtpServiceImpl.java` catches any `MailException` without throwing a fatal crash to the caller.
2. The user registration or password reset transaction **completes successfully**.
3. The event and 6-digit code are recorded in the structured backend log with a `[MY SCHOOL CARE DEV EMAIL / OTP DISPATCH]` marker for troubleshooting.

