# CRM-WA User Manual

> **CRM-WA** is a WhatsApp-based CRM platform that helps businesses manage customer conversations, run campaigns, automate workflows, track deals, and measure performance — all from one place.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard](#2-dashboard)
3. [Roles & Access](#3-roles--access)
4. [Inbox — Messaging](#4-inbox--messaging)
5. [AI-Powered Features](#5-ai-powered-features)
6. [Contacts Management](#6-contacts-management)
7. [Deals & Sales Pipeline](#7-deals--sales-pipeline)
8. [Campaigns](#8-campaigns)
9. [Sequences (Drip Campaigns)](#9-sequences-drip-campaigns)
10. [Automation Rules](#10-automation-rules)
11. [Scheduler](#11-scheduler)
12. [Chatbot Builder](#12-chatbot-builder)
13. [CSAT — Customer Satisfaction](#13-csat--customer-satisfaction)
14. [SLA Tracking](#14-sla-tracking)
15. [Knowledge Base](#15-knowledge-base)
16. [Channels — Multi-Channel](#16-channels--multi-channel)
17. [WhatsApp Setup](#17-whatsapp-setup)
18. [Analytics & Reports](#18-analytics--reports)
19. [Settings (Admin)](#19-settings-admin)
20. [Notifications](#20-notifications)
21. [Lead Ads Integration](#21-lead-ads-integration)
22. [User Flow Diagrams](#22-user-flow-diagrams)

---

## 1. Getting Started

### What You Need
- A modern web browser (Chrome, Firefox, Edge, Safari)
- An email address for registration
- A WhatsApp-enabled phone number for connecting your business WhatsApp

### Step 1: Register Your Organization

1. Open the CRM-WA platform URL in your browser
2. Click **"Sign Up"** or **"Register"**
3. Fill in the registration form:
   - **First Name** — Your first name
   - **Last Name** — Your last name
   - **Email** — Your business email (this will be your login)
   - **Password** — Choose a strong password (minimum 8 characters, mix of letters, numbers, symbols)
   - **Organization Name** — Your company/business name
4. Click **"Register"**
5. You will see a message: *"Verification email sent"*

### Step 2: Verify Your Email

1. Check your email inbox (also check spam/junk folder)
2. Open the email from CRM-WA
3. Click the **verification link** in the email
4. You will see a confirmation: *"Email verified successfully"*

> **Note:** The verification link expires in 24 hours. If expired, go to the login page and click "Resend verification email."

### Step 3: First Login

1. Go to the login page
2. Enter your **email** and **password**
3. Click **"Login"**
4. You will land on the **Dashboard**

> The first user who registers an organization automatically becomes the **Admin**.

### Step 4: What to Do First (Admin)

After your first login, follow this setup order:

1. **Connect WhatsApp** — Go to Settings → WhatsApp → Scan QR code
2. **Invite Team Members** — Go to Admin → Users → Invite users
3. **Create Teams** — Go to Admin → Teams → Create teams and assign members
4. **Configure Settings** — Go to Settings → Organization settings

---

## 2. Dashboard

The Dashboard is your home screen — it gives you a quick snapshot of your business performance.

### What You See

| Metric | Description |
|--------|-------------|
| **Total Messages** | Messages sent and received today/this week/this month |
| **Active Conversations** | Currently open conversations with customers |
| **Response Time** | Average time to first reply |
| **Messages Sent vs Received** | Volume comparison chart |
| **Campaign Performance** | Active campaigns and their delivery rates |
| **Team Activity** | Who is online and their workload |

### Benefits
- See your entire business communication health at a glance
- Quickly spot issues (high response time, unread messages)
- Monitor team productivity without checking individual conversations

---

## 3. Roles & Access

CRM-WA has three user roles. Each role has different access levels:

| Feature | Admin | Manager | Employee |
|---------|:-----:|:-------:|:--------:|
| Dashboard | Yes | Yes | Yes |
| Inbox (Messaging) | Yes | Yes | Yes |
| Contacts | Yes | Yes | Yes |
| Deals & Pipeline | Yes | Yes | No |
| Campaigns | Yes | Yes | No |
| Sequences | Yes | Yes | No |
| Automation Rules | Yes | Yes | No |
| Scheduler | Yes | Yes | No |
| Chatbot Builder | Yes | Yes | No |
| CSAT Surveys | Yes | Yes | No |
| SLA Tracking | Yes | Yes | No |
| Knowledge Base | Yes | Yes | No |
| Analytics & Reports | Yes | Yes | No |
| Lead Ads | Yes | Yes | No |
| Channels Management | Yes | Yes | No |
| WhatsApp Setup | Yes | Yes | Yes |
| User Management | Yes | No | No |
| Team Management | Yes | No | No |
| Roles & Permissions | Yes | No | No |
| Billing & Subscription | Yes | No | No |
| Settings & Configuration | Yes | No | No |
| Audit Logs | Yes | No | No |
| GDPR Management | Yes | No | No |
| API Keys | Yes | No | No |

### Role Descriptions

**Admin** — Full control over the entire platform. Can manage users, billing, settings, permissions, and all features. The organization owner is automatically an Admin.

**Manager** — Can manage teams, run campaigns, set up automation, track deals, view analytics, and oversee employee work. Cannot access billing, user management, or system settings.

**Employee** — Day-to-day agent role. Can handle inbox conversations, manage contacts, send messages, and use AI features. Focused on customer communication.

---

## 4. Inbox — Messaging

The Inbox is the heart of CRM-WA — this is where all customer conversations live.

### Viewing Conversations

1. Click **"Inbox"** in the sidebar
2. The left panel shows your **conversation list**
3. Click any conversation to open the **message thread** on the right
4. The right panel shows the **contact details** sidebar

### Filters

Use filters at the top of the conversation list:

| Filter | What It Shows |
|--------|---------------|
| **All** | All conversations |
| **Unread** | Conversations with unread messages |
| **Mine** | Only conversations assigned to you |
| **Channel** | Filter by WhatsApp, Email, Instagram, etc. |

Use the **search bar** to find conversations by contact name, phone number, or message content.

### Sending a Message

1. Select a conversation (or start a new one)
2. Type your message in the **input box** at the bottom
3. Press **Enter** or click the **Send** button
4. Your message status will update: Sent → Delivered → Read

### Sending Media & Files

1. Click the **attachment icon** (paperclip) in the input box
2. Choose: Image, Video, Document, or Audio
3. Select the file from your computer
4. Add an optional caption
5. Click **Send**

### Interactive Messages (Buttons & Lists)

1. Click the **interactive message icon** in the input box
2. Choose **Button Message** or **List Message**
3. **Button Message** — Add up to 3 buttons with labels (e.g., "Yes", "No", "Maybe")
4. **List Message** — Add sections with multiple options (e.g., a product menu)
5. Preview and send

### Using Canned Responses

Canned responses are pre-saved replies for common questions.

1. Click the **canned response icon** (or type `/`) in the input box
2. Browse or search available responses
3. Click to insert the response into your message
4. Edit if needed, then send

### Using Message Templates

Templates are pre-approved message formats (required by WhatsApp for starting conversations after 24 hours).

1. Click the **template icon** in the input box
2. Browse available templates
3. Fill in any variable fields (e.g., customer name, order number)
4. Send

### Conversation Actions

| Action | How | When to Use |
|--------|-----|-------------|
| **Close** | Click "Close" button on conversation | When the issue is resolved |
| **Archive** | Click "Archive" option | To hide resolved conversations |
| **Reopen** | Click "Reopen" on a closed conversation | When a customer follows up |
| **Mark as Read** | Click on the conversation | Automatically marks as read |
| **Labels** | Add labels/tags to categorize conversations | Organize by topic (support, sales, etc.) |

### Real-Time Updates

Messages appear instantly — no need to refresh. You'll see:
- New messages pop up in real-time
- Message status changes (sent → delivered → read)
- Typing indicators
- Online/offline status of team members

### Benefits
- All customer messages in one place — no switching between apps
- Never miss a message with real-time notifications
- Quick replies with canned responses save time
- Interactive messages engage customers better
- Message status tracking ensures delivery confirmation

---

## 5. AI-Powered Features

CRM-WA includes built-in AI tools to help you respond faster and smarter.

### Smart Reply Suggestions

- **What it does:** AI reads the conversation and suggests 2-3 reply options
- **How to use:** Look for the **"AI Suggestions"** panel below the input box. Click a suggestion to insert it, then edit and send.
- **Benefit:** Reply 3x faster to common queries

### Conversation Summary

- **What it does:** Generates a short summary of a long conversation
- **How to use:** Click the **"Summarize"** button in the conversation header or AI panel
- **Benefit:** Quickly understand context when taking over a conversation from a colleague

### Sentiment Analysis

- **What it does:** Detects the customer's mood (Positive, Neutral, Negative, Angry)
- **How to use:** View the sentiment indicator in the conversation or AI insight panel
- **Benefit:** Prioritize upset customers, adjust your tone accordingly

### Intent Detection

- **What it does:** Identifies what the customer wants (e.g., "wants to buy", "needs support", "wants refund")
- **How to use:** View the detected intent in the AI insight panel
- **Benefit:** Route conversations to the right team, respond with the right information

### Knowledge Base Search

- **What it does:** AI suggests relevant KB articles based on the conversation topic
- **How to use:** View suggested articles in the AI panel, click to preview, share with customer
- **Benefit:** Consistent, accurate answers every time

### Auto-Categorization

- **What it does:** Automatically categorizes conversations (support, sales, billing, etc.)
- **How to use:** View the category suggestion in the AI panel, click "Apply" to accept
- **Benefit:** Organized conversations, better analytics

---

## 6. Contacts Management

Manage all your customers and leads in one place.

### Creating a Contact

1. Go to **Contacts** in the sidebar
2. Click **"+ Create Contact"**
3. Fill in the form:
   - **Name** (required)
   - **Phone Number** (required, with country code)
   - **Email** (optional)
   - **Company** (optional)
   - Any **custom fields** your admin has set up
4. Click **"Save"**

> **Auto-Created Contacts:** When a new customer sends you a message on WhatsApp, their contact is automatically created.

### Viewing & Editing Contacts

1. Go to **Contacts**
2. Use the search bar or filters to find a contact
3. Click a contact to open the **detail drawer** on the right
4. Click **"Edit"** to modify details
5. Save changes

### Tags

Tags help you organize contacts into groups.

1. Open a contact's detail drawer
2. Click **"+ Add Tag"**
3. Type a tag name (e.g., "VIP", "New Lead", "Premium")
4. Press Enter to add
5. Click the **X** on a tag to remove it

**Use tags for:** Filtering contacts, targeting campaigns, automation triggers

### Notes

Add internal notes to contacts — only your team can see these.

1. Open a contact's detail drawer
2. Scroll to the **Notes** section
3. Click **"+ Add Note"**
4. Type your note (e.g., "Interested in premium plan, follow up next week")
5. Click **Save**

### Lead Status

Track where each contact is in your sales funnel:

| Status | Meaning |
|--------|---------|
| **New** | Just discovered, no engagement yet |
| **Contacted** | First message sent |
| **Interested** | Showed interest in your product/service |
| **Qualified** | Confirmed as a potential buyer |
| **Converted** | Became a customer |
| **Lost** | Did not convert |

To change lead status:
1. Open the contact detail drawer
2. Click the **Lead Status** dropdown
3. Select the new status

### Lead Score

Lead scoring automatically rates contacts based on their engagement level.

- **How it works:** The system assigns points based on rules (e.g., +10 for replying, +20 for clicking a link, -5 for no reply in 7 days)
- **Where to see:** The lead score badge appears next to the contact name
- **Benefit:** Focus on high-scoring leads first — they're most likely to convert

### Assign to Team Member

1. Open the contact detail drawer
2. Click **"Assign"**
3. Select a team member from the dropdown
4. Click **"Save"**

**Benefit:** Ensure every customer has a dedicated point of contact

### Merge Duplicate Contacts

1. Open a contact detail drawer
2. Click **"Merge"**
3. Search for the duplicate contact
4. Review merged fields
5. Confirm merge

**Benefit:** Clean data, no duplicate conversations

### Import Contacts from CSV

1. Go to **Contacts**
2. Click **"Import"**
3. Upload a CSV file (columns: Name, Phone, Email, etc.)
4. Map CSV columns to contact fields
5. Click **"Import"**

### Export Contacts

1. Go to **Contacts**
2. Click **"Export"**
3. Choose format (CSV)
4. Download the file

### Contact History

View the complete timeline of interactions with a contact:
- Messages sent and received
- Status changes
- Tags added/removed
- Notes added
- Assignments changed

Open the contact detail drawer → scroll to **History** section

### Benefits
- Complete 360° view of every customer
- Organized with tags, notes, and lead status
- Automated lead scoring saves time
- Import/export makes migration easy
- Merge duplicates keeps data clean

---

## 7. Deals & Sales Pipeline

Track sales opportunities visually with a Kanban board.

### What is the Pipeline

The pipeline is a visual board with columns (stages) representing your sales process. Each deal is a card that moves through stages.

**Default stages:** Lead → Qualified → Proposal → Negotiation → Won / Lost

### Creating a Deal

1. Go to **Deals** in the sidebar
2. Click **"+ Create Deal"**
3. Fill in:
   - **Deal Name** (e.g., "Premium Plan - Acme Corp")
   - **Value** (deal amount)
   - **Contact** (link to a contact)
   - **Pipeline Stage** (starting stage)
   - **Notes** (optional)
4. Click **"Save"**

### Moving Deals

- **Drag and drop** a deal card from one stage to another
- Or open the deal detail drawer → change the stage dropdown

### Deal Details

Click a deal card to view:
- Deal value and contact info
- Current stage and history
- Notes and activities
- Related conversations

### Benefits
- Visual sales tracking — see your entire pipeline at a glance
- Never lose track of a deal
- Measure conversion rates between stages
- Know exactly how much revenue is in each stage

---

## 8. Campaigns

Send bulk messages to a targeted audience.

### Creating a Campaign

1. Go to **Campaigns** in the sidebar
2. Click **"+ Create Campaign"**
3. Fill in:
   - **Campaign Name** (e.g., "Diwali Offer 2025")
   - **Message Content** — Type your message or select a template
   - **Audience** — Filter contacts by tags, lead status, custom fields
4. Click **"Preview Audience"** to see how many contacts match
5. Choose: **Send Now** or **Schedule for Later**

### Scheduling a Campaign

1. After creating, click **"Schedule"**
2. Pick the **date and time**
3. Confirm — the campaign will execute automatically at the scheduled time

### Managing Running Campaigns

| Action | Description |
|--------|-------------|
| **Pause** | Temporarily stop sending (remaining recipients wait) |
| **Resume** | Continue a paused campaign |
| **Cancel** | Stop the campaign completely |

### Tracking Recipients

Go to a campaign → **Recipients** tab to see:

| Status | Meaning |
|--------|---------|
| **Queued** | Waiting to be sent |
| **Sent** | Message sent successfully |
| **Delivered** | Message received by customer's phone |
| **Read** | Customer opened the message |
| **Failed** | Message could not be delivered |

### Campaign Analytics

View campaign performance:
- Total sent / delivered / read / failed
- Delivery rate percentage
- Read rate percentage
- Response rate

### Benefits
- Reach thousands of customers at once
- Target the right audience with filters
- Schedule campaigns for optimal timing
- Track exactly who received and read your message
- Pause/resume gives you control over delivery

---

## 9. Sequences (Drip Campaigns)

Sequences are automated, multi-step message flows that send messages over time.

### What Are Sequences

Unlike campaigns (one-time bulk send), sequences send a **series of messages** over days or weeks. For example:
- Day 1: Welcome message
- Day 3: Product introduction
- Day 7: Special offer
- Day 14: Follow-up

### Creating a Sequence

1. Go to **Sequences** in the sidebar
2. Click **"+ Create Sequence"**
3. Name your sequence
4. Add steps:
   - **Step 1:** Message content + delay (e.g., "Send immediately")
   - **Step 2:** Message content + delay (e.g., "Wait 3 days, then send")
   - **Step 3:** Continue adding steps as needed
5. Set **exit conditions** (e.g., stop if customer replies)
6. Save

### Managing Sequences

| Action | Description |
|--------|-------------|
| **Activate** | Start enrolling contacts and sending |
| **Pause** | Stop sending (enrolled contacts wait) |
| **Cancel** | Stop the sequence completely |

### Viewing Enrolled Contacts

Go to a sequence → **Recipients** tab to see who is enrolled and their progress (which step they're on).

### Benefits
- Automated follow-ups — no manual effort
- Nurture leads with timely, relevant messages
- Set it and forget it — sequences run on their own
- Exit conditions prevent annoying customers who already responded

---

## 10. Automation Rules

Automate repetitive tasks with "if-this-then-that" rules.

### What Are Automation Rules

Automation rules automatically perform actions when certain events happen. For example:
- **When** a customer sends a message containing "price" → **Then** reply with the price list
- **When** a new contact is created → **Then** assign to the sales team
- **When** a conversation is idle for 24 hours → **Then** send a follow-up

### Creating an Automation Rule

1. Go to **Automation** in the sidebar
2. Click **"+ Create Rule"**
3. Configure:
   - **Trigger** — What starts the automation:
     - Message received
     - Contact created
     - Conversation opened/closed
     - Time-based (schedule)
   - **Conditions** (optional) — Extra filters:
     - Message contains keyword
     - Contact has specific tag
     - Contact lead status equals X
   - **Actions** — What to do:
     - Send a message
     - Assign contact to user/team
     - Add/remove tag
     - Change lead status
     - Close conversation
4. Click **"Save"**

### Managing Rules

| Action | Description |
|--------|-------------|
| **Enable** | Turn on the rule (starts executing) |
| **Disable** | Turn off without deleting |
| **Delete** | Remove permanently |

### Execution Logs

View a history of when each rule was triggered and what it did:
1. Go to **Automation**
2. Click **"Execution Logs"** tab
3. See: Rule name, trigger event, actions performed, timestamp, status (success/failed)

### Benefits
- Automate repetitive tasks — save hours of manual work
- Instant responses to common queries (even outside business hours)
- Consistent customer experience — same rules apply every time
- No coding required — visual rule builder

---

## 11. Scheduler

Schedule messages to be sent at a specific future time.

### How to Schedule a Message

1. Go to **Scheduler** in the sidebar
2. Click **"+ Schedule Message"**
3. Fill in:
   - **Recipient** — Select a contact
   - **Message** — Type the message content
   - **Date & Time** — When to send
4. Click **"Schedule"**

### Managing Scheduled Messages

- **View** all scheduled messages in the list
- **Edit** a scheduled message (if not yet sent)
- **Cancel** a scheduled message to prevent sending

### Benefits
- Plan messages ahead of time
- Send at optimal times (e.g., business hours in the customer's timezone)
- Never forget to follow up — schedule it now, it sends automatically

---

## 12. Chatbot Builder

Build automated chatbot flows without coding.

### What Is the Chatbot Builder

The chatbot builder lets you create automated conversation flows. When a customer sends a message, the chatbot responds automatically based on the flow you design.

### Creating a Chatbot Flow

1. Go to **Chatbot** in the sidebar
2. Click **"+ Create Flow"**
3. Name your flow (e.g., "Welcome Bot", "FAQ Bot", "Order Tracker")
4. Build the flow by adding **nodes**:

| Node Type | Description |
|-----------|-------------|
| **Message** | Send a text message to the customer |
| **Question** | Ask the customer a question and wait for reply |
| **Condition** | Branch based on customer's response (e.g., if answer = "Yes" → go to Node A, else → Node B) |
| **Action** | Perform an action (assign to agent, add tag, close conversation) |

5. Connect nodes to create the conversation flow
6. Save and activate

### How It Works

1. Customer sends a trigger message (e.g., "Hi")
2. Chatbot starts the flow
3. Sends messages, asks questions, branches based on answers
4. When the chatbot can't help → hands off to a human agent

### Benefits
- 24/7 customer support — chatbot works even when your team is offline
- Handle common FAQs without agent involvement
- Qualify leads automatically before passing to sales
- Reduce response time to zero for automated flows

---

## 13. CSAT — Customer Satisfaction

Measure how happy your customers are.

### What Is CSAT

CSAT (Customer Satisfaction Score) surveys are short feedback requests sent to customers after a conversation ends.

### Sending a CSAT Survey

1. Go to **CSAT** in the sidebar
2. Click **"+ Send Survey"**
3. Select the conversation/contact
4. The survey is sent via WhatsApp (e.g., "How would you rate your experience? 1-5")
5. Customer replies with their rating

### Viewing Results

- **CSAT Score** — Average satisfaction score (1-5)
- **Response Rate** — How many customers replied
- **Trends** — Track satisfaction over time
- **By Agent** — See which agents get the best ratings

### Benefits
- Measure customer happiness after every interaction
- Identify agents who need training
- Track improvement over time
- Show customers you care about their feedback

---

## 14. SLA Tracking

Ensure your team responds to customers within committed timeframes.

### What Is SLA

SLA (Service Level Agreement) defines how quickly your team should respond to customers. For example: "First response within 5 minutes for VIP customers."

### How It Works

1. **Admin creates SLA policies** (e.g., "First reply within 5 min", "Resolution within 24 hours")
2. When a customer sends a message, the SLA timer starts
3. If the team doesn't respond in time → **SLA Breach** alert
4. Breached conversations are escalated automatically

### Viewing SLA Status

- Each conversation shows an SLA indicator:
  - **Green** — Within SLA
  - **Yellow** — SLA warning (close to deadline)
  - **Red** — SLA breached

### Benefits
- Ensure consistent response times
- Automatic escalation prevents dropped conversations
- Track team compliance with service commitments
- Identify bottlenecks in response times

---

## 15. Knowledge Base

Create a library of articles for your team and AI to reference.

### Creating Content

1. Go to **Knowledge Base** in the sidebar
2. **Create Categories** — Organize articles by topic (e.g., "Pricing", "Setup", "Troubleshooting")
3. **Create Articles** — Write detailed articles within each category:
   - Title
   - Content (rich text)
   - Category
4. Save and publish

### How It's Used

- **Agents** can search the knowledge base while chatting with customers
- **AI** automatically suggests relevant articles based on conversation context
- Share article links directly in conversations

### Benefits
- Consistent answers — every agent gives the same correct information
- Faster responses — no need to remember everything
- AI-powered suggestions surface the right article at the right time
- New team members get up to speed quickly

---

## 16. Channels — Multi-Channel

Manage conversations from multiple platforms in one inbox.

### Supported Channels

| Channel | Description |
|---------|-------------|
| **WhatsApp** | Primary channel via QR code connection |
| **Email** | Receive and reply to emails |
| **Instagram** | Instagram Direct Messages |
| **Facebook Messenger** | Facebook page messages |

### Adding a Channel

1. Go to **Settings → Channels** (or sidebar → Channels)
2. Click **"+ Add Channel"**
3. Select the channel type
4. Follow the setup instructions for each channel
5. Once connected, messages from that channel appear in your **Inbox**

### Channel Status

| Status | Meaning |
|--------|---------|
| **Active** | Connected and receiving messages |
| **Suspended** | Temporarily disabled |
| **Disconnected** | Connection lost, needs reconnection |

### Benefits
- All customer messages from all platforms in one inbox
- No switching between WhatsApp, Instagram, Email
- Unified contact profile across channels
- Same automation and AI features work on all channels

---

## 17. WhatsApp Setup

Connect your WhatsApp Business number to CRM-WA.

### Connecting WhatsApp

1. Go to **Settings → WhatsApp** (or click WhatsApp in sidebar)
2. Click **"Connect WhatsApp"**
3. A **QR code** will appear on screen
4. Open **WhatsApp** on your phone
5. Go to **Settings → Linked Devices → Link a Device**
6. Scan the QR code with your phone
7. Wait a few seconds — status changes to **"Connected"**
8. You're ready to send and receive messages!

### Session Status

| Status | Meaning |
|--------|---------|
| **Connected** | Active and working |
| **Connecting** | Setting up the connection |
| **Disconnected** | Connection lost — needs reconnection |

### Disconnecting

1. Go to **Settings → WhatsApp**
2. Click **"Disconnect"**
3. Confirm

> **Note:** You can also disconnect from your phone: WhatsApp → Linked Devices → Remove device

### Troubleshooting

- **QR code expired?** — Click "Refresh" to get a new one
- **Connection drops frequently?** — Ensure your phone has stable internet
- **Can't scan QR?** — Try a different browser or clear cache

### Benefits
- Simple QR code setup — no API keys or developer access needed
- Real-time message sync
- Multiple team members can use the same WhatsApp number
- Session health monitoring

---

## 18. Analytics & Reports

Data-driven insights to improve your business.

### Dashboard Metrics

The main analytics dashboard shows:

| Metric | What It Tells You |
|--------|-------------------|
| **Message Volume** | How many messages sent/received over time (daily/weekly/monthly) |
| **Response Time** | Average, fastest, and slowest first-reply time |
| **Conversion Funnel** | How contacts move through: New → Contacted → Interested → Qualified → Converted |
| **Peak Hours** | Which hours/days have the most customer activity |
| **Team Performance** | Per-agent metrics: messages handled, response time, CSAT score |
| **Campaign Analytics** | Delivery rate, read rate, response rate per campaign |

### Using Analytics

1. Go to **Analytics** in the sidebar
2. Use the **date range picker** to select the period
3. Switch between tabs: Messages, Response Time, Funnel, Peak Hours, Team, Campaigns
4. Click **"Export"** to download reports as CSV

### What to Look For

- **High response time?** → You may need more agents or automation
- **Low conversion rate?** → Review your messaging strategy
- **Peak hours identified?** → Schedule campaigns and staff accordingly
- **One agent underperforming?** → Provide training or redistribute workload

### Benefits
- Make data-driven decisions, not guesses
- Identify bottlenecks in customer service
- Measure team efficiency and individual performance
- Track campaign ROI
- Export reports for presentations and reviews

---

## 19. Settings (Admin)

Admin-only settings to configure the entire platform.

### Organization Settings

**Path:** Settings → Organization

- **Organization Name** — Your business name
- **Branding** — Logo, colors (if applicable)
- **Timezone** — Set your business timezone for scheduling
- **Business Hours** — Define working hours for SLA tracking

### User Management

**Path:** Admin → Users

| Action | How |
|--------|-----|
| **Invite a user** | Click "Invite" → Enter email → Select role (Admin/Manager/Employee) → Send invite |
| **Change role** | Click user → "Change Role" → Select new role |
| **Disable user** | Click user → "Disable" (blocks login, preserves data) |
| **Enable user** | Click user → "Enable" (restores access) |
| **Delete user** | Click user → "Delete" (permanent) |

### Team Management

**Path:** Admin → Teams

1. Click **"+ Create Team"** → Name the team (e.g., "Sales", "Support")
2. Click a team → **"Add Member"** → Select users
3. Remove members or delete teams as needed

**Benefit:** Organize agents by function, auto-assign conversations to teams

### Roles & Permissions (RBAC)

**Path:** Admin → Roles & Permissions

Customize what each role can access:
- View the list of all permissions grouped by feature
- Toggle permissions on/off for Manager and Employee roles
- Admin role always has full access

**Examples of permissions:**
- `contacts:read` — Can view contacts
- `contacts:create` — Can create contacts
- `campaigns:execute` — Can run campaigns
- `messages:send` — Can send messages

### Billing & Subscription

**Path:** Settings → Billing

- View your current plan and usage
- Upgrade or downgrade your subscription
- View payment history and invoices
- Cancel or reactivate subscription

### API Keys

**Path:** Settings → API Keys

- Generate API keys for third-party integrations
- Rotate keys for security
- Delete unused keys

**Benefit:** Allow external systems to integrate with CRM-WA securely

### Custom Fields

**Path:** Settings → Custom Fields

Add custom data fields to contacts and deals:
1. Click **"+ Create Field"**
2. Choose: Text, Number, Date, Dropdown, Checkbox
3. Name the field (e.g., "Company Size", "Industry", "Preferred Language")
4. The field now appears on all contact/deal forms

### Chat Widget

**Path:** Settings → Chat Widget

Configure an embeddable chat widget for your website:
- Set welcome message
- Customize colors and position
- Generate embed code to add to your website

### Webhooks

**Path:** Settings → Webhooks

Send event notifications to external systems:
1. Click **"+ Create Webhook"**
2. Enter the URL to receive notifications
3. Select events (e.g., message received, contact created, conversation closed)
4. Save

### Feature Flags

**Path:** Settings → Feature Flags

Enable or disable platform features for your organization:
- Toggle features on/off
- Useful for rolling out new features gradually

### GDPR Management

**Path:** Admin → GDPR (or Settings → GDPR)

- **Data Export** — Export all data for a specific customer (GDPR right to access)
- **Data Deletion** — Request deletion of a customer's data (GDPR right to be forgotten)
- **Consent Records** — Track customer consent status

### Audit Logs

**Path:** Admin → Audit Logs

View a complete history of all actions taken on the platform:
- Who did what, when, and from where
- Filter by user, action type, date range
- Track login attempts, data changes, settings modifications

**Benefit:** Security compliance, accountability, troubleshooting

---

## 20. Notifications

Stay informed about important events.

### In-App Notifications

- Click the **bell icon** in the top header
- View your notifications:
  - New messages received
  - Conversations assigned to you
  - SLA breach alerts
  - Campaign completions
  - Team mentions
- Click a notification to jump to the relevant page
- Mark as read or delete

### Notification Preferences

1. Go to your **profile** or notification settings
2. Choose which notifications you want to receive:
   - New message assigned to me
   - SLA breach warning
   - Campaign completed
   - New contact assigned
3. Toggle each on/off

### Benefits
- Never miss important events
- Customize what you're notified about
- Quick navigation to relevant items

---

## 21. Lead Ads Integration

Automatically capture leads from Facebook and Instagram ads.

### What It Does

When you run lead generation ads on Facebook or Instagram, the leads are automatically imported into CRM-WA as contacts.

### Setting Up

1. Go to **Lead Ads** in the sidebar
2. Click **"Configure"**
3. Connect your Facebook Business Page
4. Map ad form fields to CRM-WA contact fields
5. Save

### How It Works

1. A potential customer fills out your Facebook/Instagram lead ad form
2. The lead data is automatically sent to CRM-WA via webhook
3. A new contact is created with the lead's information
4. Automation rules can trigger (e.g., auto-send welcome message, assign to sales)

### Viewing Leads

- See all leads in the **Lead Ads** dashboard
- Filter by source (Facebook/Instagram), campaign, date
- View metrics: total leads, by platform, daily trends, top campaigns

### Benefits
- Zero manual data entry — leads flow in automatically
- Instant follow-up with automation rules
- Track which ad campaigns generate the most leads
- Seamless connection between advertising and CRM

---

## 22. User Flow Diagrams

### Flow 1: Registration & Onboarding

```
┌─────────────────────┐
│   Open CRM-WA URL   │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   Click "Register"  │
│   Fill in details   │
│   (name, email,     │
│    password, org)   │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Check email inbox  │
│  Click verify link  │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   Login with email  │
│   and password      │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   Dashboard loads   │
│   (You are Admin)   │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────────────────┐
│   First-Time Setup:             │
│   1. Connect WhatsApp (QR)     │
│   2. Invite team members       │
│   3. Create teams              │
│   4. Configure org settings    │
└─────────────────────────────────┘
```

### Flow 2: Daily Agent Workflow

```
┌──────────────┐
│  Agent Login │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│  Open Inbox      │
│  Check unread    │
│  messages        │
└──────┬───────────┘
       │
       ▼
┌──────────────────────────┐
│  Click conversation      │
│  Read customer message   │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  AI suggests replies         │
│  ┌─ Use suggestion ──────┐  │
│  │  OR                    │  │
│  ├─ Use canned response ─┤  │
│  │  OR                    │  │
│  └─ Type custom reply ───┘  │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────┐
│  Send message        │
│  Status: Sent →      │
│  Delivered → Read    │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────────┐
│  Issue resolved?         │
│  ├─ YES → Close convo   │
│  └─ NO → Continue chat  │
└──────────────────────────┘
```

### Flow 3: Campaign Lifecycle

```
┌────────────────────┐
│  Create Campaign   │
│  (name, message,   │
│   audience filter) │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Preview Audience  │
│  (X contacts       │
│   match filters)   │
└────────┬───────────┘
         │
         ▼
┌────────────────────────────┐
│  Choose:                   │
│  ├─ Send Now ────────────┐ │
│  └─ Schedule for Later ─┐│ │
│                          ││ │
└──────────────────────────┘│ │
         │                  │ │
         ▼                  │ │
┌────────────────────┐      │ │
│  Campaign Running  │◄─────┘ │
│  Status: RUNNING   │◄───────┘
└────────┬───────────┘
         │
    ┌────┼────────────────┐
    │    │                │
    ▼    ▼                ▼
┌──────┐ ┌──────┐  ┌──────────┐
│Pause │ │Cancel│  │ Sending  │
│      │ │      │  │ messages │
│Resume│ │      │  │ one by   │
│ ↻    │ │ ✕    │  │ one...   │
└──────┘ └──────┘  └────┬─────┘
                        │
                        ▼
              ┌──────────────────┐
              │  Campaign Done   │
              │  View Analytics: │
              │  • Sent: 1000    │
              │  • Delivered: 980│
              │  • Read: 750     │
              │  • Failed: 20   │
              └──────────────────┘
```

### Flow 4: Automation Rule Execution

```
┌─────────────────────────┐
│  EVENT OCCURS            │
│  (message received,      │
│   contact created, etc.) │
└────────────┬─────────────┘
             │
             ▼
┌─────────────────────────┐
│  Check: Any active       │
│  automation rules match? │
└────────────┬─────────────┘
             │
        ┌────┴────┐
        │         │
        ▼         ▼
    ┌──────┐  ┌───────┐
    │ YES  │  │  NO   │
    └──┬───┘  │ (stop)│
       │      └───────┘
       ▼
┌─────────────────────────┐
│  Check CONDITIONS        │
│  (keyword match? tag?    │
│   lead status?)          │
└────────────┬─────────────┘
             │
        ┌────┴────┐
        │         │
        ▼         ▼
    ┌──────┐  ┌───────┐
    │MATCH │  │NO MATCH│
    └──┬───┘  │(skip)  │
       │      └────────┘
       ▼
┌─────────────────────────┐
│  EXECUTE ACTIONS         │
│  • Send auto-reply       │
│  • Assign to agent       │
│  • Add tag               │
│  • Change lead status    │
│  • Close conversation    │
└─────────────────────────┘
```

### Flow 5: WhatsApp Connection

```
┌─────────────────────┐
│  Go to Settings →   │
│  WhatsApp           │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Click "Connect     │
│  WhatsApp"          │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  QR Code appears    │
│  on screen          │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────────┐
│  On your phone:         │
│  WhatsApp → Settings →  │
│  Linked Devices →       │
│  Link a Device          │
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────┐
│  Scan QR code with  │
│  your phone camera  │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Status: Connected  │
│  ✓ Ready to send    │
│    and receive      │
│    messages!        │
└─────────────────────┘
```

### Flow 6: Contact Lifecycle

```
┌────────────────────────────┐
│  NEW CONTACT               │
│  (auto-created from        │
│   WhatsApp message OR      │
│   manually created OR      │
│   imported from CSV OR     │
│   from lead ad)            │
└────────────┬───────────────┘
             │
             ▼
┌────────────────────────────┐
│  Lead Status: NEW          │
│  Lead Score: 0             │
│  Auto-assign to team       │
└────────────┬───────────────┘
             │
             ▼
┌────────────────────────────┐
│  Agent sends first message │
│  Status → CONTACTED        │
│  Score: +10                │
└────────────┬───────────────┘
             │
             ▼
┌────────────────────────────┐
│  Customer replies,         │
│  shows interest            │
│  Status → INTERESTED       │
│  Score: +20                │
└────────────┬───────────────┘
             │
             ▼
┌────────────────────────────┐
│  Qualified as buyer        │
│  Status → QUALIFIED        │
│  Score: +30                │
│  → Create Deal in Pipeline │
└────────────┬───────────────┘
             │
        ┌────┴────┐
        │         │
        ▼         ▼
┌────────────┐ ┌──────────┐
│ CONVERTED  │ │  LOST    │
│ (became a  │ │ (didn't  │
│  customer) │ │  convert)│
│ Score: 100 │ │          │
└────────────┘ └──────────┘
```

### Flow 7: Admin Setup Flow (Complete)

```
┌──────────────────────────────────────────────┐
│  STEP 1: Register & Login                    │
│  Register org → Verify email → Login         │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│  STEP 2: Connect WhatsApp                    │
│  Settings → WhatsApp → Scan QR              │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│  STEP 3: Add Channels (Optional)             │
│  Settings → Channels → Add Email/Instagram   │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│  STEP 4: Invite Team Members                 │
│  Admin → Users → Invite (email + role)       │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│  STEP 5: Create Teams                        │
│  Admin → Teams → Create "Sales", "Support"   │
│  → Assign members to teams                   │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│  STEP 6: Configure Permissions (Optional)    │
│  Admin → Roles & Permissions → Customize     │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│  STEP 7: Set Up Automation (Optional)        │
│  Automation → Create welcome message rule    │
│  Automation → Create auto-assign rule        │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│  STEP 8: Create Knowledge Base (Optional)    │
│  Knowledge Base → Add categories & articles  │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│  STEP 9: Configure Billing (Optional)        │
│  Settings → Billing → Choose plan            │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│  ✓ SETUP COMPLETE                            │
│  Your CRM-WA is ready to use!               │
│  Start messaging customers from the Inbox.   │
└──────────────────────────────────────────────┘
```

---

## Quick Reference — Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Ctrl+K** (or **⌘K** on Mac) | Open Command Palette / Global Search |
| **Enter** | Send message (in chat input) |

---

## Glossary

| Term | Meaning |
|------|---------|
| **Conversation** | A message thread with a customer |
| **Contact** | A customer or lead in your database |
| **Lead** | A potential customer who hasn't purchased yet |
| **Campaign** | A bulk message sent to many contacts at once |
| **Sequence** | An automated series of messages sent over time |
| **Automation Rule** | An "if-this-then-that" rule that runs automatically |
| **SLA** | Service Level Agreement — your response time commitment |
| **CSAT** | Customer Satisfaction Score — a rating from customers |
| **Pipeline** | Visual stages a deal moves through (like a Kanban board) |
| **Canned Response** | A pre-saved reply for common questions |
| **Template** | A pre-approved message format (required by WhatsApp for 24h+ conversations) |
| **RBAC** | Role-Based Access Control — who can do what |
| **Webhook** | An automatic notification sent to an external URL when an event happens |

---

*CRM-WA User Manual — Last updated: April 2026*
