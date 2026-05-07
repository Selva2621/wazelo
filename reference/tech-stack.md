🔷 Frontend
Next.js (App Router)
TypeScript
Tailwind CSS
TanStack Query
Zustand
React Hook Form + Zod
WebSocket (Socket.IO client)
🔷 Backend
NestJS (TypeScript)
Modular Monolith Architecture
REST APIs + WebSocket Gateway
🔷 Database
PostgreSQL
Prisma ORM
Multi-tenant design (org_id based)
Soft delete strategy
🔷 Queue & Background Jobs
pg-boss (PostgreSQL-based queue)
Used for:
Campaign processing
Scheduled messages
Retry handling
🔷 Real-Time Communication
NestJS WebSocket Gateway
Socket.IO protocol
🔷 Authentication & Authorization
JWT (Access + Refresh Tokens)
RBAC (Admin / Employee roles)
bcrypt (password hashing)
🔷 WhatsApp Integration
WhatsApp Business API (Meta Cloud API)
Webhooks for incoming messages & delivery status
🔷 File Storage
AWS S3 (or S3-compatible storage)
Used for media messages & attachments
🔷 Scheduler
pg-boss delayed jobs (no separate scheduler)
🔷 DevOps & Infrastructure
Docker
Docker Compose
Nginx (reverse proxy)
GitHub Actions (CI/CD)
🔷 Monitoring & Logging
Winston (NestJS logger)
Grafana + Loki
🔷 Rate Limiting & Protection
NestJS Throttler
Applied on:
Messaging
Campaign APIs
Auth endpoints
🧱 FINAL ARCHITECTURE
Frontend (Next.js)
        ↓
NestJS Backend
   ├── REST APIs
   ├── WebSocket Gateway
   ├── pg-boss Queue Producer
        ↓
PostgreSQL
   ├── Application Data
   ├── pg-boss Jobs
        ↓
Worker Processes (NestJS)
        ↓
WhatsApp Business API
        ↓
AWS S3 (Media Storage)