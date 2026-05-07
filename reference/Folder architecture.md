Good — now we’re finally talking about something that actually affects **maintainability and scalability long-term**.

Most people completely screw this up by:

* dumping everything in `/modules`
* mixing infra + domain
* tightly coupling queue, ws, api

Then 3 months later → rewrite.

I’m going to give you a **production-grade folder architecture** aligned with everything we designed (Epics 1–10) and your stack (NestJS + pg-boss + WebSocket).

---

# 🧠 CORE PRINCIPLE (Don’t Ignore This)

You are NOT building:

> “NestJS app with folders”

You are building:
👉 **Domain-driven + modular monolith (event-driven ready)**

If you don’t follow this:

* features become tangled
* scaling becomes painful
* testing becomes hell

---

# 📁 HIGH-LEVEL ARCHITECTURE

```bash
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

---

# 📦 1. MODULES (YOUR BUSINESS CORE)

Each module = one epic/domain.

```bash
modules/
├── auth/
├── org/
├── users/
├── whatsapp/
├── contacts/
├── conversations/
├── messages/
├── campaigns/
├── automation/
├── billing/
├── rbac/
├── audit/
```

---

## Inside Each Module (STRICT STRUCTURE)

```bash
auth/
├── domain/
│   ├── entities/
│   ├── value-objects/
│   ├── services/          # pure business logic
│
├── application/
│   ├── use-cases/         # orchestrates logic
│   ├── dto/
│
├── infrastructure/
│   ├── repositories/
│   ├── persistence/
│
├── interfaces/
│   ├── controllers/
│   ├── guards/
│
├── auth.module.ts
```

---

### 🔥 Why this matters

If you skip this layering:

* business logic leaks into controllers
* impossible to test
* impossible to scale

---

# 📦 2. INFRASTRUCTURE (SYSTEM DEPENDENCIES)

```bash
infrastructure/
├── database/
│   ├── prisma/ or typeorm/
│   ├── migrations/
│
├── queue/
│   ├── pg-boss.service.ts
│   ├── queue.module.ts
│
├── websocket/
│   ├── gateway.ts
│   ├── ws.module.ts
│
├── external/
│   ├── whatsapp/
│   ├── payment/
│
├── logger/
├── config/
```

---

### 🔥 Rule

👉 Infrastructure must NEVER contain business logic

If it does → your architecture is already broken.

---

# 📦 3. INTERFACES (API LAYER)

```bash
interfaces/
├── http/
│   ├── controllers/
│   ├── middlewares/
│
├── websocket/
│   ├── gateways/
│
├── grpc/ (optional future)
```

---

### 🔥 Rule

Controllers should ONLY:

* validate input
* call use-case
* return response

If controllers contain logic → you failed design.

---

# 📦 4. JOBS (QUEUE WORKERS — CRITICAL)

```bash
jobs/
├── message/
│   ├── send-message.worker.ts
│
├── campaign/
│   ├── campaign.worker.ts
│
├── automation/
│   ├── automation.worker.ts
│
├── scheduler/
│   ├── scheduler.worker.ts
```

---

### 🔥 Rule

Workers = separate execution context

If you mix this with API:
👉 system will break under load

---

# 📦 5. EVENTS (INTERNAL EVENT BUS)

```bash
events/
├── event-bus.ts
├── handlers/
│   ├── message-received.handler.ts
│   ├── contact-created.handler.ts
│   ├── campaign-triggered.handler.ts
```

---

### Example Flow

```
Incoming Message
→ Event: message.received
→ Handler:
   - create contact
   - trigger automation
   - update conversation
```

👉 This is how you avoid tight coupling.

---

# 📦 6. COMMON vs SHARED (DON’T MIX THESE)

### common/ (LOW-LEVEL UTILS ONLY)

```bash
common/
├── decorators/
├── filters/
├── interceptors/
├── pipes/
```

---

### shared/ (REUSABLE BUSINESS COMPONENTS)

```bash
shared/
├── utils/
├── constants/
├── base-classes/
```

---

### 🔥 Mistake to avoid

Putting business logic inside `common/`
👉 That kills modularity

---

# 📦 7. CONFIG STRUCTURE

```bash
config/
├── app.config.ts
├── db.config.ts
├── queue.config.ts
├── auth.config.ts
├── billing.config.ts
```

---

# 📦 8. TEST STRUCTURE

```bash
tests/
├── unit/
├── integration/
├── e2e/
```

---

# 🧠 REAL FLOW (HOW EVERYTHING CONNECTS)

Example: Send Message

```
Controller
→ Use Case (application layer)
→ Queue (pg-boss)
→ Worker (jobs/)
→ WhatsApp service (infrastructure)
→ DB update
→ Event emitted
→ WebSocket update
```

If your code doesn’t follow this separation:
👉 you’re building a fragile system

---

# 🔥 Brutal Truth (You Need This)

---

### ❌ 1. If you keep everything in `/modules`

You’ll get:

* circular dependencies
* messy imports

---

### ❌ 2. If you skip application layer

Your logic becomes:
👉 impossible to scale or reuse

---

### ❌ 3. If you mix queue + API

👉 production will break under load

---

### ❌ 4. If you don’t isolate domains

Contacts + Messages + Campaigns will become tightly coupled

---
