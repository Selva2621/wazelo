🧠 FINAL DESIGN WORKFLOW (WITH STITCH MCP)
🔷 Step 1 — Define Screen Requirements (Before Stitch)

Don’t jump to design.

You must first define:

Page name (Inbox, Campaigns, Contacts, etc.)
User role (Admin / Employee)
Core actions (send message, assign lead, run campaign)
Data elements (chat list, message view, filters)

👉 If you skip this → Stitch output will be generic garbage.

🔷 Step 2 — Generate UI with Stitch MCP

Use Stitch MCP to generate:

Layout structure
Component hierarchy
UI patterns
Example Prompt (Use This Format)
Design a modern SaaS dashboard UI for a WhatsApp CRM.

Page: Inbox (Chat System)

Requirements:
- Left sidebar: chat list with search + filters
- Center: conversation view
- Right panel: contact details + tags
- Top bar: organization switch + user profile
- Actions: send message, attach media, assign contact

Style:
- Clean, minimal, Tailwind-based
- Inspired by Intercom / Slack

👉 Output:

Layout
Component structure
UI hierarchy
🔷 Step 3 — Convert Stitch Output → Design System

Don’t directly code from raw output.

Extract:

Design Tokens
Colors
Spacing
Typography
Components
Chat list item
Message bubble
Sidebar
Modal

👉 Define this as your UI system

🔷 Step 4 — Map to Frontend Components

Now convert to actual code structure:

components/
 ├── layout/
 │    ├── sidebar.tsx
 │    ├── header.tsx
 │
 ├── chat/
 │    ├── chat-list.tsx
 │    ├── message-bubble.tsx
 │    ├── chat-input.tsx
 │
 ├── contacts/
 ├── campaigns/

👉 This step is where most people mess up — they skip structure.

🔷 Step 5 — Build Page (Only Now)

Now create pages in Next.js:

/app/inbox/page.tsx
/app/campaigns/page.tsx
/app/contacts/page.tsx
🔷 Step 6 — Connect to Backend
Use TanStack Query for APIs
Use WebSocket for real-time
🚨 What NOT to do (Common Mistakes)
❌ 1. Directly coding from Stitch output

→ Leads to inconsistent UI

❌ 2. No component system

→ You’ll rewrite UI multiple times

❌ 3. No design tokens

→ Colors & spacing become chaos

❌ 4. Designing page-by-page randomly

→ No UX consistency

🧱 Recommended Page Order (Build Sequence)

Don’t build randomly. Follow this:

Auth pages (Login / Signup)
Layout (Sidebar + Header)
Inbox (core feature)
Contacts
Campaigns
Scheduler
Settings
🎯 Final Workflow (Simple View)
Requirements
   ↓
Stitch MCP (UI generation)
   ↓
Design System (tokens + components)
   ↓
Component Architecture
   ↓
Next.js Pages
   ↓
API + WebSocket Integration