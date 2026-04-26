# Content Broadcasting System

> A production-quality REST API backend for an educational content broadcasting platform.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Setup](#setup)
- [API Reference](#api-reference)
- [Content Lifecycle](#content-lifecycle)
- [Authentication](#authentication)
- [Design Decisions & Assumptions](#design-decisions--assumptions)

---

## Overview

The Content Broadcasting System manages how educational content flows from teachers to students, with a principal acting as a gatekeeper for quality control.

**Actors:**
| Role | Capabilities |
|------|-------------|
| **Principal** | Create teacher accounts, review/approve/reject/take-down content, view audit logs, manage users |
| **Teacher** | Create content drafts, edit own content, schedule broadcast time, submit for review |
| **Student (public)** | Access live content via public endpoints — no authentication required |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MySQL via Sequelize ORM |
| Auth | JWT (access + refresh tokens) |
| Validation | express-validator |
| Scheduling | node-cron |
| Logging | Winston |
| Security | Helmet, CORS, express-rate-limit |
| Testing | Jest + Supertest |

---

## Architecture

```
src/
├── app.js                    # Express app config (middleware, routes)
├── server.js                 # Entry point (DB connect, scheduler, listen)
├── controllers/              # Route handlers (thin layer, delegates to services)
│   ├── authController.js
│   ├── teacherController.js
│   ├── principalController.js
│   └── publicController.js
├── services/                 # Business logic layer
│   ├── authService.js
│   ├── contentService.js
│   ├── userService.js
│   └── schedulerService.js   # node-cron auto-publish scheduler
├── models/                   # Sequelize models
│   ├── User.js
│   ├── Content.js
│   ├── AuditLog.js
│   └── index.js              # Associations
├── routes/                   # Express routers with validation chains
│   ├── authRoutes.js
│   ├── teacherRoutes.js
│   ├── principalRoutes.js
│   ├── publicRoutes.js
│   └── contentRoutes.js
├── middleware/
│   ├── authenticate.js       # JWT verification
│   ├── authorize.js          # RBAC (role-based access)
│   ├── validate.js           # express-validator error formatter
│   ├── errorHandler.js       # Global error handler
│   └── notFound.js           # 404 handler
├── utils/
│   ├── logger.js             # Winston logger
│   ├── jwtHelper.js          # Token generation/verification
│   ├── responseHelper.js     # Standard API response builders
│   └── auditLogger.js        # Async audit trail writer
├── database/
│   ├── connection.js         # Sequelize instance
│   ├── migrate.js            # Migration script
│   └── seed.js               # Seed script with test data
└── tests/
    ├── setup.js              # Test env config
    ├── auth.test.js          # Auth endpoint tests
    └── content.test.js       # Content workflow tests
```

---

## Setup

### Prerequisites
- Node.js 18+
- MySQL 8+ (running locally)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your MySQL credentials and JWT secrets
```

### 3. Create Database
```sql
CREATE DATABASE content_broadcasting_db CHARACTER SET utf8mb4;
CREATE DATABASE content_broadcasting_test CHARACTER SET utf8mb4;  -- for tests
```

### 4. Run Migrations
```bash
npm run migrate
```

### 5. Seed Test Data (optional)
```bash
npm run seed
```

### 6. Start the Server
```bash
npm run dev      # Development (nodemon)
npm start        # Production
```

### 7. Run Tests
```bash
npm test
npm run test:coverage
```

---

## Test Credentials (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Principal | principal@school.edu | Principal@123 |
| Teacher 1 | alex.carter@school.edu | Teacher@123 |
| Teacher 2 | priya.sharma@school.edu | Teacher@123 |
| Student | jamie.lee@students.edu | Student@123 |

---

## API Reference

### Base URL: `http://localhost:3000/api`

### Health Check
```
GET /health
```

---

### Auth Endpoints (`/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | Public | Register student account |
| POST | `/login` | Public | Login (returns access + refresh tokens) |
| POST | `/refresh` | Public | Refresh access token |
| POST | `/logout` | Bearer | Logout (invalidates refresh token) |
| GET | `/profile` | Bearer | Get own profile |
| PUT | `/change-password` | Bearer | Change password |

**Login Request:**
```json
{
  "email": "teacher@school.edu",
  "password": "Teacher@123"
}
```

**Login Response:**
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresIn": "7d",
    "tokenType": "Bearer",
    "user": { "id": "...", "name": "...", "role": "teacher" }
  }
}
```

---

### Teacher Endpoints (`/api/teacher`) — Requires `teacher` role

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/content` | List own content (`?status=draft&page=1&limit=10`) |
| POST | `/content` | Create content draft |
| GET | `/content/:id` | Get specific content |
| PUT | `/content/:id` | Update draft or rejected content |
| POST | `/content/:id/submit` | Submit for principal review |
| DELETE | `/content/:id` | Delete draft or rejected content |

**Create Content Request:**
```json
{
  "title": "Introduction to Calculus",
  "description": "Limits, derivatives, and integrals for Grade 12",
  "contentType": "video",
  "contentUrl": "https://example.com/videos/calculus-intro",
  "subject": "Mathematics",
  "gradeLevel": "Grade 12",
  "tags": ["calculus", "grade-12", "math"]
}
```

**Submit for Review (with schedule):**
```json
{
  "scheduledAt": "2026-05-01T09:00:00.000Z"
}
```

---

### Principal Endpoints (`/api/principal`) — Requires `principal` role

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/content` | All content with filters |
| GET | `/content/pending` | Pending review queue (FIFO) |
| GET | `/content/:id` | Content detail |
| PATCH | `/content/:id/approve` | Approve content |
| PATCH | `/content/:id/reject` | Reject with mandatory notes |
| PATCH | `/content/:id/takedown` | Take down live content |
| GET | `/stats` | Dashboard statistics |
| POST | `/teachers` | Create teacher account |
| GET | `/teachers` | List all teachers |
| PATCH | `/users/:id/deactivate` | Deactivate user |
| PATCH | `/users/:id/reactivate` | Reactivate user |
| GET | `/audit-logs` | View system audit trail |

**Approve Content:**
```json
{
  "reviewNotes": "Excellent content, approved!",
  "scheduledAt": "2026-05-01T08:00:00.000Z"
}
```

**Reject Content (reviewNotes required, min 10 chars):**
```json
{
  "reviewNotes": "The content references outdated curriculum standards. Please update sections 2 and 4."
}
```

---

### Public Endpoints (`/api/public`) — No auth required

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/content` | List all live content |
| GET | `/content/:id` | Get single live content (increments view count) |

**Query Params:** `?page=1&limit=10&contentType=video&subject=Math&gradeLevel=Grade+10&search=algebra`

---

## Content Lifecycle

```
TEACHER                    PRINCIPAL                   SYSTEM
   │                           │                          │
   ├─ Creates draft             │                          │
   │   status: draft            │                          │
   │                           │                          │
   ├─ Submits for review        │                          │
   │   status: pending_approval │                          │
   │                           │                          │
   │                   ┌───────┤                          │
   │                   │ Reviews│                          │
   │                   └───────┤                          │
   │                 Approve ──┤──────> status: approved  │
   │                           │         (scheduled)      │
   │                           │                 ─────────┤
   │                           │         Scheduler runs   │
   │                           │         every minute     │
   │                           │                 ─────────┤
   │                           │         status: live ────┘
   │                           │
   │          OR               │
   │                 Approve ──┤──────> status: live
   │                           │       (no schedule = immediate)
   │                           │
   │          OR               │
   │                 Reject ───┤──────> status: rejected
   │   ← Can edit & resubmit   │
   │                           │
   │                   Take down──────> status: taken_down
```

---

## Authentication

- **Access Token**: JWT, expires in 7 days (configurable)
- **Refresh Token**: JWT, expires in 30 days, stored in DB (invalidated on logout)
- **Usage**: `Authorization: Bearer <accessToken>`

---

## Design Decisions & Assumptions

1. **MySQL over PostgreSQL**: Chosen for wider local setup availability. Sequelize abstraction makes switching trivial by changing `dialect`.

2. **Soft Deletes (paranoid: true)**: Content and Users are soft-deleted. Audit logs are never deleted.

3. **Scheduler**: `node-cron` runs every minute to auto-publish approved content. For distributed deployments, a Redis-based distributed lock would prevent double-publishing.

4. **Immediate vs Scheduled Publishing**: If a principal approves content with no `scheduledAt`, it goes live immediately. If a `scheduledAt` is set, status becomes `approved` and the scheduler publishes it.

5. **Teacher Registration**: Teachers are created by the principal (not self-registered) for security. The principal endpoint `POST /principal/teachers` handles this with a generated temporary password.

6. **Rejection requires notes**: Principals must provide at least 10-character review notes when rejecting — enforces accountability.

7. **Audit Logging**: All significant actions (login, content lifecycle, user management) are recorded non-blocking (fire-and-forget) to the `audit_logs` table.

8. **Rate Limiting**: 100 requests/15min globally; 10 requests/15min on auth endpoints to prevent brute force.

9. **View Count**: Incremented asynchronously (fire-and-forget) to avoid blocking public reads.

10. **Content body vs URL**: Supports both inline text content (`content_body`) for announcements and external resource URLs (`content_url`) for videos/documents.
