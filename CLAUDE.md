# Wazelo CRM: WhatsApp CRM SaaS Platform

## Project Overview
A multi-tenant WhatsApp CRM SaaS platform with real-time messaging, lead management, campaign management, automation, and billing.

---

## Tech Stack

### Frontend
- **Framework:** Next.js (App Router) + TypeScript
- **Styling:** Tailwind CSS
- **State:** Zustand (client state), TanStack Query (server state)
- **Forms:** React Hook Form + Zod validation
- **Real-time:** Socket.IO client

### Backend
- **Framework:** NestJS (TypeScript) — Modular Monolith Architecture
- **APIs:** REST + WebSocket Gateway (Socket.IO)
- **Database:** PostgreSQL + Prisma ORM
- **Queue:** pg-boss (PostgreSQL-based) — campaigns, scheduled messages, retries
- **Auth:** JWT (Access + Refresh Tokens), bcrypt, RBAC (Admin / Employee)
- **File Storage:** AWS S3 (media messages & attachments)
- **Logging:** Winston + Grafana/Loki
- **Rate Limiting:** NestJS Throttler (messaging, campaigns, auth endpoints)
- **WhatsApp:** Meta Cloud API + Webhooks

### Infrastructure
- Docker + Docker Compose
- Nginx (reverse proxy)
- GitHub Actions (CI/CD)

### Architecture Flow
```
Frontend (Next.js) → NestJS Backend (REST + WS + pg-boss) → PostgreSQL → Workers → WhatsApp API / S3
```

---

## Folder Architecture (Backend)

### High-Level Structure
```
src/
├── main.ts
├── app.module.ts
├── config/                # Env + config loaders
├── common/                # Shared utilities (NO business logic)
├── modules/               # Domain modules (core of system)
├── infrastructure/        # External integrations (DB, queue, ws)
├── interfaces/            # Controllers (API layer)
├── jobs/                  # Background workers (queue consumers)
├── events/                # Event system (pub/sub internal)
├── shared/                # Cross-domain reusable logic
└── tests/
```

### Domain Modules
```
modules/
├── auth/          ├── org/           ├── users/
├── whatsapp/      ├── contacts/      ├── conversations/
├── messages/      ├── campaigns/     ├── automation/
├── billing/       ├── rbac/          ├── audit/
```

### Module Internal Structure (Strict)
```
<module>/
├── domain/
│   ├── entities/
│   ├── value-objects/
│   └── services/            # Pure business logic
├── application/
│   ├── use-cases/           # Orchestrates logic
│   └── dto/
├── infrastructure/
│   ├── repositories/
│   └── persistence/
├── interfaces/
│   ├── controllers/
│   └── guards/
└── <module>.module.ts
```

### Infrastructure Layer
```
infrastructure/
├── database/prisma/         # Prisma schema + migrations
├── queue/                   # pg-boss service + module
├── websocket/               # Gateway + ws module
├── external/whatsapp/       # WhatsApp API integration
├── external/payment/        # Payment provider
├── logger/
└── config/
```

### Jobs (Queue Workers)
```
jobs/
├── message/send-message.worker.ts
├── campaign/campaign.worker.ts
├── automation/automation.worker.ts
└── scheduler/scheduler.worker.ts
```

### Events (Internal Event Bus)
```
events/
├── event-bus.ts
└── handlers/
    ├── message-received.handler.ts
    ├── contact-created.handler.ts
    └── campaign-triggered.handler.ts
```

---

## Design & Architecture Rules

### Database
- Multi-tenant design: all queries scoped by `org_id`
- Soft delete strategy on all entities

### Backend Rules
1. **Controllers** only: validate input → call use-case → return response. No business logic.
2. **Infrastructure** must NEVER contain business logic.
3. **Workers** are separate execution context — never mix queue consumers with API handlers.
4. **`common/`** = low-level utils (decorators, filters, interceptors, pipes). No business logic.
5. **`shared/`** = reusable business components (utils, constants, base-classes).
6. Domain modules must be isolated — avoid tight coupling between contacts, messages, campaigns.

### Request Flow Pattern
```
Controller → Use Case (application) → Queue (pg-boss) → Worker (jobs/) → External Service (infrastructure) → DB update → Event emitted → WebSocket update
```

---

## Frontend Design Workflow

### Build Sequence (Follow This Order)
1. Auth pages (Login / Signup)
2. Layout (Sidebar + Header)
3. Inbox (core feature)
4. Contacts
5. Campaigns
6. Scheduler
7. Settings

### Frontend Component Structure
```
components/
├── layout/     (sidebar.tsx, header.tsx)
├── chat/       (chat-list.tsx, message-bubble.tsx, chat-input.tsx)
├── contacts/
├── campaigns/
```

### UI Design Process
1. Define screen requirements (page, role, actions, data elements)
2. Generate UI with Stitch MCP
3. Extract design tokens (colors, spacing, typography) into a design system
4. Map to frontend components
5. Build Next.js pages
6. Connect to backend (TanStack Query for APIs, WebSocket for real-time)

### UI Rules
- Never code directly from Stitch output — extract a design system first
- Always define component architecture before building pages
- Maintain design tokens for consistency (colors, spacing, typography)
- Clean, minimal, Tailwind-based styling (Intercom/Slack inspired)

---

## Reference Documents
- [tech-stack.md](reference/tech-stack.md) — Full tech stack details
- [Folder architecture.md](reference/Folder%20architecture.md) — Detailed folder structure rationale
- [rules.md](reference/rules.md) — Design workflow with Stitch MCP
- [reference/user-stories/](reference/user-stories/) — Epics 1-11 user stories
- [EPIC 12](reference/EPIC%2012%20—%20Settings%20&%20Configuration%20(System%20Control%20Layer).md) — Settings & Configuration
