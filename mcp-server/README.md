# Wazelo MCP server

Lets an AI assistant (Claude Desktop, Claude Code, Cursor, any MCP client) work with your Wazelo CRM: find contacts, read conversations and deals, add notes and tags, change lead status, and send WhatsApp messages.

It calls the Wazelo Developer API with your API key, so the key's scopes, your plan's limits and the rate limit (60 requests a minute) all apply.

## Setup

1. In Wazelo, open **Settings → API Keys** and create a key. Give it `read` and `contacts`, plus `messages` to read conversations. Add `write` to let the assistant change data or send messages.
2. Build the server:

   ```sh
   cd mcp-server
   npm install
   npm run build
   ```

3. Add it to your MCP client. For Claude Desktop (`claude_desktop_config.json`):

   ```json
   {
     "mcpServers": {
       "wazelo": {
         "command": "node",
         "args": ["D:/projects/wazelo/mcp-server/dist/index.js"],
         "env": {
           "WAZELO_API_URL": "https://your-wazelo-domain/api/v1",
           "WAZELO_API_KEY": "crm_sk_..."
         }
       }
     }
   }
   ```

   For Claude Code:

   ```sh
   claude mcp add wazelo -e WAZELO_API_URL=https://your-wazelo-domain/api/v1 -e WAZELO_API_KEY=crm_sk_... -- node D:/projects/wazelo/mcp-server/dist/index.js
   ```

For local development, use `http://localhost:8080/api/v1` as the URL.

## Tools

| Area | Tools |
|---|---|
| Contacts | `search_contacts`, `get_contact`, `create_contact`, `update_contact`, `change_lead_status` |
| Notes and tags | `list_contact_notes`, `add_contact_note`, `list_tags`, `tag_contact`, `untag_contact` |
| Conversations | `list_conversations`, `get_conversation_messages`, `get_message_status` |
| Sending | `send_whatsapp_message`, `send_whatsapp_template`, `list_templates`, `get_whatsapp_status` |
| Deals | `list_pipelines`, `list_deals`, `get_deal`, `move_deal_stage` |

The two send tools are marked destructive, so MCP clients ask before running them. A message reaches a real person and can't be taken back.

Notes, tags and status changes are recorded as the person who created the API key, and they trigger the same automations and webhooks as changes made in the app.
