# 🤖 AGENTS.md – Guidelines for Autonomous AI Coding Agents

Welcome, AI Agent! This document contains machine-readable instructions, architectural directives, build verification requirements, and repository constraints for automated software agents submitting issues, code edits, or Pull Requests to **Omni**.

---

## 🎯 Core Operating Directives

### 1. Mandatory Build & Verification Rule
- **NEVER** declare a task complete or open a Pull Request without executing `npm run build` in both `web` and `cms` (or running root `npm run build`).
- Ensure TypeScript compilation completes with **0 type errors** and **0 exit code failures**.

### 2. Strapi 5 REST & Relation Standards
- In Strapi 5, Content Types use the Document Service schema.
- When performing queries or relational deletes, use `documentId` (e.g. `DELETE /api/subscriptions/:documentId`) instead of raw integer IDs.
- Primary schemas:
  - Subscriptions: `api::subscription.subscription` (Collection: `subscriptions`)
  - Favorites: `api::favorite.favorite` (Collection: `favorites`)
  - Notifications: `api::notification.notification` (Collection: `notifications`)
  - Chat Rooms: `api::chat-room.chat-room` (Collection: `chat-rooms`)

### 3. Dual-Language i18n Dictionary Enforcement
- Any new user-visible text or UI label MUST be added to both translation dictionaries:
  - `web/src/dictionaries/de.json` (German)
  - `web/src/dictionaries/en.json` (English)
- Avoid hardcoding untranslated strings directly in JSX/TSX components.

### 4. Codebase Audit & Utility Reuse
- **Do NOT re-invent existing utilities**:
  - Auth JWT retrieval: Use `getStoredJwt()` from `@/lib/affinity`.
  - Date formatting: Use `formatAbsoluteDate()` from `@/lib/date`.
  - UI Icons: Use icons from `lucide-react`.

### 5. WebSocket Microservice (`omni-socket`) Protocol
- Real-time communication runs on port `4000` via Socket.io (`socket/server.js`).
- Nginx reverse proxy endpoint: `https://omni-socket.inwebdesign.net`.
- Events emitted:
  - `join_room` / `leave_room`
  - `send_message` / `new_message`
  - `typing_start` / `typing_stop`
  - `ai_status_change`

### 6. Video Security & Encrypted HLS Player
- HLS Video Streams are Level 4 AES-128 encrypted on disk.
- Decryption keys are authorized via Next.js API route `/api/media/key/[slug]`.
- Custom player logic resides in `web/src/components/CustomVideoPlayer.tsx`. Do not mutate private third-party DOM properties directly.

---

## 📂 Repository Workspace Structure

```
omni-stack-ai/
├── cms/                     # Strapi v5 Headless CMS (PostgreSQL, TypeScript Factories & Schemas)
├── socket/                  # Standalone Real-Time WebSocket Server (Port 4000)
├── web/                     # Next.js 16 App Router Frontend
│   ├── src/app/             # Pages, Catalog (/videos), Detail View (/video/[slug]), Shorts (/shorts)
│   ├── src/app/api/         # App Router REST API Routes (/api/subscriptions, /api/favorites, /api/chat)
│   ├── src/components/      # React UI Components
│   ├── src/context/         # AppContext (i18n), ChatContext (Rooms, Socket & Messages)
│   └── src/dictionaries/    # Multilingual i18n Dictionaries (de.json, en.json)
├── converter_lxc/           # LXC Node 22 Transcoder (Level 4 AES-128 HLS)
└── ecosystem.config.js      # PM2 Process Manager setup
```

---

## 🧪 Verification Commands for Agents

Run these bash commands in order when executing modifications:

```bash
# 1. Typecheck and build all workspace packages
npm run build

# 2. Check PM2 service status if testing locally
pm2 status
```

---

## 🏷️ Commit & PR Style Protocol

When submitting commits or opening PRs, use Conventional Commit syntax:
- `feat(scope): concise description`
- `fix(scope): concise description`
- `docs(scope): concise description`

Example:
`feat(subscriptions): add subscriber-only DM check to /api/chat`
