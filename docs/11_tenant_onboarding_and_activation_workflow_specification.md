# Tenant Onboarding, Invitation & School Head Activation Specification

## 1. Executive Summary & Architectural Overview

In a multi-tenant enterprise Software-as-a-Service (SaaS) architecture, there is a strict separation of concerns between:
1. **Platform Super Administration (`/platform`)**: Platform operators provision tenant organizations, manage subscription quotas, and monitor infrastructure health. Platform operators **never** create or set administrative passwords on behalf of tenant principals.
2. **Institutional Tenant Administration (`/[slug]/admin`)**: The School Head (Principal / Director) owns their institutional workspace, configures academic policies, and manages staff and student rosters.
3. **Automated Onboarding & Security Handshake**: When an institution is onboarded, the system provisions tenant structures and dispatches an invitation email with a secure setup link and a cryptographic single-use One-Time Password (OTP).

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                ENTERPRISE ONBOARDING & ACTIVATION LIFECYCLE                             │
│                                                                                                         │
│  [Platform Super Admin]                                                                                 │
│         │                                                                                               │
│         ▼                                                                                               │
│  1. Provisions School Tenant ───────► Creates Organization, Quota & Admin User Stub                     │
│                                              │                                                          │
│                                              ▼                                                          │
│  2. Dispatches Email Invite ────────► Email with 6-Digit Code & Setup Link Sent to Principal            │
│                                              │                                                          │
│  [School Head / Principal]                   ▼                                                          │
│  3. Opens Activation Link ──────────► Lands on /setup-password (Email locked/prefilled)                  │
│                                              │                                                          │
│  4. Manually Enters 6-Digit Code ───► NO auto-prefill (Protects against link snooping/shoulder-surfing) │
│                                              │                                                          │
│  5. Code Expired? ──────────────────► Triggers "Request New Code" Modal to dispatch fresh OTP           │
│                                              │                                                          │
│  6. Verifies & Sets Password ───────► Authenticates, activates school workspace & launches /[slug]/admin│
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Architectural Principles & Security Rules

### Rule 1: No OTP Auto-Prefill
* **Requirement**: The 6-digit verification code must **never** be auto-prefilled into the form input from URL parameters or storage.
* **Security Rationale**:
  - Auto-prefilled OTPs defeat two-factor verification by turning a two-channel handshake (Web link + Email payload) into a single-click bypass.
  - If an email is previewed or forwarded, or if the URL is logged in proxy access logs or browser history, third parties cannot hijack the account without actively retrieving the distinct verification code.
  - The School Head must manually type or paste the code into the verification input.

### Rule 2: Explicit OTP Expiration & Resend Modal
* **Requirement**: Verification codes have an explicit 15-minute Time-To-Live (TTL).
* **Expired State Handling**:
  - If the timer reaches `00:00` or if the user enters an expired code, the input is locked with a clear alert: *"This verification code has expired."*
  - An accessible trigger opens the **"Request New Verification Code"** modal.
  - The modal prompts confirmation, enforces a 60-second rate-limiting cooldown between requests, and dispatches a fresh 6-digit code via backend `OtpService`.

### Rule 3: Zero Password Setup in Platform Admin UI
* **Requirement**: The Platform Admin modal must **never** present a "Set Up Password Now" button or initiate password reset workflows.
* **Platform Admin Experience**:
  - Displays a clean confirmation summary: Institution Name, Subdomain Slug, Subscription Plan, and Principal Email.
  - Clear message: *"Tenant provisioned successfully. An invitation email with security setup instructions has been dispatched to {email}."*
  - Single action: **"Done / Return to Registry"**, keeping the Platform Super Admin within the tenant control dashboard.

---

## 3. Step-by-Step Workflow & Data Flow Specification

### Step 1: Platform Provisioning Handshake
1. Platform Super Admin fills the onboarding form:
   - `name`: Institutional name (e.g., *"St. Xavier High School"*)
   - `slug`: Unique tenant subdomain (e.g., *"st-xavier-high-school"*)
   - `planId`: Target subscription plan ID (`1` for Free, `2` for Standard, `3` for Enterprise)
   - `contactEmail`: Official School Head / Principal email address.
2. Backend execution (`PlatformServiceImpl.createOrganization`):
   - Validates uniqueness of `slug` and existence of `planId`.
   - Inserts `organizations` record with status `ACTIVE`.
   - Provisions initial `users` record with `role = ADMIN` and a randomized secure stub password.
   - Inserts `memberships` record linking the user to the organization with `status = ACTIVE`.
   - Assigns the `SCHOOL_ADMIN` system role template via `member_role_mappings`.
   - Invokes `otpService.generateAndSendOtp(headEmail, "ONBOARDING_SETUP")`.

### Step 2: Onboarding Invitation Email Specification
* **Sender**: `My School Care Security <no-reply@myschoolcare.internal>`
* **Recipient**: School Head Email (`contactEmail`)
* **Subject**: `Congratulations! Your School Has Been Onboarded on My School Care`
* **Body Format**:
  ```text
  Dear Administrator,

  Congratulations! Your institution "St. Xavier High School" has been officially onboarded by the Platform Administration on My School Care.

  To activate your administrator workspace and begin managing your school, please complete your account security setup:

  1. Visit the Account Activation Portal:
     http://localhost:4000/setup-password?email=principal@school.edu&slug=st-xavier-high-school

  2. Enter your 6-digit security verification code:
     [ 4 8 2 9 1 0 ]
     (Note: This single-use code is valid for 15 minutes)

  3. Create your secure administrator password.

  If you have questions or did not authorize this registration, please contact platform support.

  Welcome aboard!
  The My School Care Platform Team
  ```

### Step 3: School Head Dedicated Setup Portal (`/setup-password`)
A dedicated, distraction-free page with the following states:

1. **State 1: Identification & Code Input**
   - **Registered Email**: Read from URL parameter `?email=...` and displayed in an email field (editable if entered directly).
   - **6-Digit Code Input**: Blank input with large, letter-spaced digits and numeric validation. **No pre-fill.**
   - **Live Expiration Clock**: Real-time ticking timer initialized to remaining validity (up to 15 minutes).
   - **New Password & Confirm Password**: Minimum 6 characters with match validation.
   - **Action Button**: `"Activate Account & Launch School Workspace"`.

2. **State 2: Expired Code & Resend Modal**
   - Triggered automatically when the countdown hits zero or upon user request.
   - Modal allows entering/confirming registered email and clicking `"Send New Code"`.
   - Dispatches a fresh OTP via `POST /api/v1/auth/forgot-password` (or dedicated resend endpoint) and resets the countdown timer.

3. **State 3: Verification & Password Reset Execution**
   - **Step A**: Client calls `POST /api/v1/auth/verify-otp`:
     ```json
     {
       "email": "principal@school.edu",
       "otpCode": "482910",
       "purpose": "ONBOARDING_SETUP"
     }
     ```
     Response returns `{ "verified": true, "resetToken": "uuid-v4-token" }`.
   - **Step B**: Client calls `POST /api/v1/auth/reset-password`:
     ```json
     {
       "email": "principal@school.edu",
       "resetToken": "uuid-v4-token",
       "newPassword": "SecureAdminPassword@2026"
     }
     ```
   - **Step C**: Client logs in or presents a success banner with a direct button:
     `"Launch {School Name} Workspace"` navigating to `/{slug}/admin`.

---

## 4. Platform Super Admin Confirmation Modal Redesign

In [`PlatformDashboard.jsx`](file:///c:/Users/AyushRaj/Desktop/Student_management_system/frontend/src/components/platform/PlatformDashboard.jsx), the completion modal is streamlined:

```
┌────────────────────────────────────────────────────────────────────────┐
│  School Tenant Onboarded Successfully                              [X] │
│  Institutional tenant provisioned with active governance quota.        │
├────────────────────────────────────────────────────────────────────────┤
│  Institution Name:      St. Xavier High School                         │
│  Tenant Subdomain:      st-xavier-high-school                          │
│  Subscription Plan:     STANDARD (Up to 1,000 Students, 50 Staff)      │
│  Administrator Email:   principal@school.edu                           │
│  Account Status:        Invitation Dispatched (Pending Password Setup) │
├────────────────────────────────────────────────────────────────────────┤
│  ✉️ An automated onboarding invitation with security setup            │
│     instructions has been dispatched to principal@school.edu.          │
│                                                                        │
│  [Dev Mode Notice]: Simulating local SMTP. Activation code logged to   │
│                     backend console for test verification.             │
├────────────────────────────────────────────────────────────────────────┤
│                                                        [ Done ]        │
└────────────────────────────────────────────────────────────────────────┘
```

* **No "Set Up Password Now" button**: Prevents confusing the Platform Super Admin with the tenant principal.
* **Done button**: Closes the dialog and refreshes the tenant registry in place.

---

## 5. Verification Matrix & Edge Cases

| Scenario | Expected System Behavior |
| :--- | :--- |
| **Platform Admin onboards school** | School tenant created; email dispatched with code & link; admin sees confirmation dialog and remains on `/platform`. |
| **Principal clicks link in email** | Opens `/setup-password?email=...&slug=...`. Email is filled; OTP input is **strictly empty**. |
| **Principal submits correct OTP + password** | OTP validated; password hashed with BCrypt; account activated; redirected to `/[slug]/admin`. |
| **OTP expires before submission (15 min)** | Timer reaches 0; input locks; "Request New Code" modal activates to send fresh code with 60s cooldown. |
| **Principal enters invalid OTP 3 times** | OTP invalidated in database; user forced to request fresh code to prevent brute force. |
| **Super Admin views Tenant Registry** | Tenant displayed with status `ACTIVE`; School Head can sign in once their password is set. |

