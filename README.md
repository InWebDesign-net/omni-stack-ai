# 🚀 Omni – Hyper-Personalized Media Network & Feed Assembly Engine

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)](https://nextjs.org/)
[![Strapi](https://img.shields.io/badge/Strapi-v5.51-purple?logo=strapi)](https://strapi.io/)
<a href="https://inwebdesign.net" target="_blank" rel="noopener noreferrer">![HLS AES-128](https://img.shields.io/badge/Security-Level_4_AES--128-emerald?logo=lock)</a>
[![WebSocket](https://img.shields.io/badge/WebSocket-omni--socket-teal?logo=socketdotio)](https://omni-socket.inwebdesign.net)
[![Ollama AI](https://img.shields.io/badge/Ollama-Llama_3.1-orange?logo=ollama)](https://ollama.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?logo=postgresql)](https://www.postgresql.org/)
[![PM2](https://img.shields.io/badge/PM2-Managed-green?logo=pm2)](https://pm2.io/)

**Omni** is a modern, high-performance open-core boilerplate for hyper-personalized social networks, encrypted video streaming platforms, real-time WebSocket chat networks, and AI-driven media distribution hubs. Built with **Next.js 16 (App Router)**, **Strapi v5 (PostgreSQL)**, **Standalone WebSocket Microservice (`omni-socket`)**, **Level 4 AES-128 HLS Video Transcoding**, and **Local Ollama AI Orchestration**, Omni introduces **Stateful Preference Vectors** to replace traditional, expensive event-logging databases.

---

## 🌐 Live Demo & Credentials

You can test the running production deployment online:

* 📱 **Live Web Application:** <a href="https://omni-web.inwebdesign.net/" target="_blank" rel="noopener noreferrer">https://omni-web.inwebdesign.net/</a>
* ⚙️ **Strapi CMS Admin Panel:** <a href="https://omni-cms.inwebdesign.net/admin" target="_blank" rel="noopener noreferrer">https://omni-cms.inwebdesign.net/admin</a>
* ⚡ **WebSocket Service:** <a href="https://omni-socket.inwebdesign.net" target="_blank" rel="noopener noreferrer">https://omni-socket.inwebdesign.net</a> (Port 4000)

### 🔑 Demo Login Credentials

#### 1. Frontend Test User Accounts (Web App)
You can log in directly via the Quick-Login presets in the login modal or use these credentials:
* **Demo Tech User (Tech & Science Focus):**
  * **E-Mail / Identifier:** `demotech@inwebdesign.net`
  * **Password:** `DemoUser2026!`
* **Demo Gourmet User (Cooking & Nature Focus):**
  * **E-Mail / Identifier:** `demogourmet@inwebdesign.net`
  * **Password:** `DemoUser2026!`

#### 2. Strapi CMS Admin Access
* **Admin URL:** <a href="https://omni-cms.inwebdesign.net/admin" target="_blank" rel="noopener noreferrer">https://omni-cms.inwebdesign.net/admin</a>
* **Identifier:** `admin@inwebdesign.net`
* **Password:** `AdminSecret2026!`

---

## 📄 License & Premium AI Features

The core boilerplate, standard feed assembly, video library catalog, batch tracking, content detail views, shorts feed, real-time messaging, subscriptions, and authentication code in this repository are open-source and released under the **[MIT License](LICENSE)**. You are free to use, modify, and distribute this foundation for your own projects.

### 🌟 Unlock the Premium AI Engine & Managed Hosting
The advanced local LLM orchestration (Ollama Llama 3.1 & Moondream Vision AI), real-time intent classification, conversational memory, and automated vector mutation are part of the **InWebDesign Premium AI Engine**.

If you want to integrate the complete AI orchestration into your project without building it from scratch, we offer fully managed hosting, Proxmox LXC cluster deployments, and custom AI consulting.

📩 <a href="https://inwebdesign.net" target="_blank" rel="noopener noreferrer"><strong>Contact InWebDesign for Premium AI Integration & Managed Hosting</strong></a>

---

## 🧠 Key Features & Architectural Highlights

### 1. 🎯 Stateful Preference Vectors & Dynamic Vector Decay (Vision & Core Architecture)
Omni replaces traditional event-log database bloat with a lightweight, stateful **Preference Vector Engine** stored directly inside a single `affinityGraph` JSONB field per user in PostgreSQL:

```json
{
  "contentTypes": { "video": 0.8, "pdf": 0.85, "article": 0.7, "short": 0.5 },
  "topics": {
    "Wissenschaft": { "score": 95, "last_interacted": "2026-08-14T10:00:00Z" },
    "PostgreSQL": { "score": 100, "last_interacted": "2026-08-14T10:00:00Z" }
  },
  "creators": { "1": { "score": 50, "last_interacted": "2026-08-14T10:00:00Z" } }
}
```

* 📉 **Time-Weighted Vector Decay:** Older topic scores automatically decay over time using a time-weighted decay function. Active user engagements boost scores, while inactive topics naturally fade.
* 🤖 **AI Dynamic Keyword Extraction:** As users consume media or talk to the AI Assistant, the system dynamically extracts new semantic keywords and intent tags, adding them to the user's `affinityGraph` in real time.
* ⚡ **Strict 50-Keyword Performance Cap:** To guarantee sub-10ms feed assembly and prevent memory bloat, `affinityGraph` enforces a strict cap of **maximum 50 topics**. Low-ranking or decayed topics are automatically pruned.

### 2. ⚡ Standalone WebSocket Microservice (`omni-socket`) & Real-Time Chat Engine
Omni features a dedicated, low-latency WebSocket microservice (`socket/`) running on port 4000 behind Nginx SSL (`omni-socket.inwebdesign.net`):

* 🔌 **Zero-Polling Architecture:** Replaces expensive HTTP polling with instant, bi-directional WebSocket event delivery.
* 💬 **Dual-View Chat System:** Full-screen 2-column view and compact floating support widget. Supports 1:1 direct user DMs, global community channels, and group chat rooms.
* 🤖 **Dynamic AI Assistant Invitation (`[+ KI einladen]` / `[x KI entfernen]`):** Users can dynamically invite the Omni AI Assistant into any chat room. When invited, the bot responds contextually; when removed, it leaves the room cleanly via real-time WebSocket signals.
* 🔒 **Granular Privacy & Subscriber-Only DMs:** Users can set direct message permissions (*Everyone*, *Subscribers Only*, *Nobody*). When set to *Subscribers Only*, the system verifies active channel subscriptions before allowing DMs.

### 3. 🔔 In-App Notifications & Real-Time Drawer
Omni features a centralized notification engine (`api::notification.notification`):

* 📬 **Header Notification Drawer:** Real-time unread badges (`NotificationsBadge`) in the top navigation bar with quick mark-as-read and mark-all-read controls.
* 🚀 **Automated Notification Triggers:** Fires automated notifications for `new_subscriber`, `chat_invite`, and comment replies.
* 🔗 **Smart Deep-Linking:** Clicking a notification automatically opens the target chat room (`openChat(roomId)`), video player, or user profile without page reloads.

### 4. 🔔 Subscriptions & Standardized Favorites System
* 🔔 **Subscriptions Engine (`api::subscription.subscription`):** Supports channel subscriptions (Creators) and chat room subscriptions with live subscriber counting.
* ⚡ **Interactive `<SubscribeButton>` Component:** Features optimistic UI updates, state synchronization, and floating Toast notifications (*"Kanal erfolgreich abonniert! 🎉"*).
* ❤️ **Standardized Favorites (`api::favorite.favorite`):** Unified REST API (`/api/favorites`) allowing users to favorite and bookmark videos, articles, and feed items across the platform.

### 5. 🔒 Level 4 AES-128 Encrypted HLS Video Pipeline
Omni implements an enterprise-grade content security architecture:

* 🔐 **On-Disk AES-128 Encryption (Level 4 Security):** Every `.ts` video segment file stored on disk is encrypted with a unique 128-bit AES key (`enc.key`). Raw `.ts` files are 100% unplayable if copied directly.
* 🔑 **JWT-Gated Key Authorization Endpoint (`/api/media/key/[slug]`):** Next.js & Strapi 5 serve the 16-byte AES decryption keys exclusively to authenticated users with valid session tokens.
* 🛡️ **Client Memory Isolation:** Native `hls.js` decodes segments into tab-scoped `blob:http://...` MediaSource buffers, preventing direct URL hotlinking and unauthorized media extraction.

### 6. 🎬 Custom YouTube-Style Video Player & Interactive Tag Engine
* 🎛️ **YouTube-Style Player Controls ([`CustomVideoPlayer.tsx`](file:///root/omni-stack-ai/web/src/components/CustomVideoPlayer.tsx)):** Includes scrub bar hover timestamp tooltips, smooth play/pause animations, volume hover expansion, and full-screen toggle.
* ⚙️ **HLS Quality Selector:** Seamless manual or automatic quality resolution switching (`Auto`, `1080p`, `720p`, `480p`).
* 🏷️ **Interactive Clickable Tag Engine:** All video tags on detail pages (`#Frühstück`, `#NextJS`) are interactive links navigating directly to `/videos?page=1&includetag=...`.

### 7. 🌐 Multilingual i18n Dictionary System
* 🇩🇪 🇬🇧 **Central Dictionary Infrastructure (`/dictionaries/de.json` & `/dictionaries/en.json`):** Complete UI internationalization covering headers, search bars, player controls, user profiles, chat widgets, privacy modals, and AI assistant prompts.
* 🔄 **Instant Language Switching:** Instant toggle between German (`DE`) and English (`EN`) with persistent local storage and cookie sync.

---

## 🛠️ Monorepo Structure

```
omni-stack-ai/
├── cms/                     # Strapi v5 Headless CMS (PostgreSQL, TypeScript Factories & Schemas)
│   ├── config/              # PostgreSQL, CORS & Plugin configurations
│   └── src/api/             # Controllers, Services (subscriptions, favorites, notifications, chat)
├── socket/                  # Standalone Real-Time WebSocket Server (omni-socket, Port 4000)
│   └── server.js            # Socket.io / WebSocket Server handling real-time chat & AI events
├── web/                     # Next.js 16 App Router Frontend
│   ├── src/app/             # Pages, Catalog (/videos), Detail View (/video/[slug]), Shorts (/shorts)
│   ├── src/app/api/         # REST API Routes (/api/subscriptions, /api/favorites, /api/chat)
│   ├── src/components/      # SubscribeButton, CustomVideoPlayer, ChatWidget, NotificationDrawer
│   ├── src/context/         # AppContext (i18n), ChatContext (Rooms, Socket & Messages)
│   └── src/dictionaries/    # Multilingual i18n JSON Dictionaries (de.json, en.json)
├── converter_lxc/           # LXC Node 22 Transcoder (Level 4 AES-128 HLS, Watermarks, OG Images)
├── ecosystem.config.js      # PM2 Process Manager setup (omni-cms, omni-web, omni-socket)
├── turbo.json               # Turborepo task pipeline (Turbo v2)
├── package.json             # Monorepo workspaces configuration
└── LICENSE                  # MIT License (InWebDesign)
```

---

## 🚀 Getting Started

### Prerequisites
* **Node.js:** `v22.15.1` or higher
* **PostgreSQL:** `v15` or higher
* **FFmpeg:** `v6.0` or higher (with QSV / HLS support)
* **PM2:** `npm install -g pm2`

### 1. Installation
```bash
git clone git@github.com:InWebDesign-net/omni-stack-ai.git
cd omni-stack-ai
npm install
```

### 2. Database & Environment Setup
Create PostgreSQL database `omni_stack_db` and configure `cms/.env` & `web/.env.local`:

```env
# cms/.env
DATABASE_CLIENT=postgres
DATABASE_HOST=127.0.0.1
DATABASE_PORT=5432
DATABASE_NAME=omni_stack_db
DATABASE_USERNAME=omni_user
DATABASE_PASSWORD=omni_password_secure
OLLAMA_URL=http://10.0.0.6:11434/v1/chat/completions
OLLAMA_MODEL=llama3.1:latest
```

### 3. Build & Run with PM2
```bash
# Build both apps via Turborepo
npm run build

# Start services under PM2 (omni-cms, omni-web, omni-socket)
npm run start
```

Services will be online:
* **Frontend (Next.js):** `http://localhost:3000` (or <a href="https://omni-web.inwebdesign.net/" target="_blank" rel="noopener noreferrer">https://omni-web.inwebdesign.net/</a>)
* **CMS Backend (Strapi):** `http://localhost:1337` (or <a href="https://omni-cms.inwebdesign.net/admin" target="_blank" rel="noopener noreferrer">https://omni-cms.inwebdesign.net/admin</a>)
* **WebSocket Service:** `http://localhost:4000` (or <a href="https://omni-socket.inwebdesign.net" target="_blank" rel="noopener noreferrer">https://omni-socket.inwebdesign.net</a>)

---

## 🌐 Managed Hosting & Consulting

For enterprise deployments, custom AI prompt engineering, or managed Proxmox LXC clustering:

* **Website:** <a href="https://inwebdesign.net" target="_blank" rel="noopener noreferrer">https://inwebdesign.net</a>
* **Copyright:** © 2026 InWebDesign. All rights reserved.
