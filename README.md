# 🚀 Omni – Hyper-Personalized Media Network & Feed Assembly Engine

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)](https://nextjs.org/)
[![Strapi](https://img.shields.io/badge/Strapi-v5.51-purple?logo=strapi)](https://strapi.io/)
[![HLS AES-128](https://img.shields.io/badge/Security-Level_4_AES--128-emerald?logo=lock)](https://inwebdesign.net)
[![Ollama AI](https://img.shields.io/badge/Ollama-Llama_3.1-orange?logo=ollama)](https://ollama.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?logo=postgresql)](https://www.postgresql.org/)
[![PM2](https://img.shields.io/badge/PM2-Managed-green?logo=pm2)](https://pm2.io/)

**Omni** is a modern, high-performance open-core boilerplate for hyper-personalized social networks, encrypted video streaming platforms, and AI-driven media distribution hubs. Built with **Next.js 16 (App Router)**, **Strapi v5 (PostgreSQL)**, **Level 4 AES-128 HLS Video Transcoding**, and **Local Ollama AI Orchestration**, Omni introduces **Stateful Preference Vectors** to replace traditional, expensive event-logging databases.

---

## 🌐 Live Demo & Credentials

You can test the running production deployment online:

* 📱 **Live Web Application:** [https://omni-web.inwebdesign.net/](https://omni-web.inwebdesign.net/)
* ⚙️ **Strapi CMS Admin Panel:** [https://omni-cms.inwebdesign.net/admin](https://omni-cms.inwebdesign.net/admin)

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
* **Admin URL:** [https://omni-cms.inwebdesign.net/admin](https://omni-cms.inwebdesign.net/admin)
* **Identifier:** `admin@inwebdesign.net`
* **Password:** `AdminSecret2026!`

---

## 📄 License & Premium AI Features

The core boilerplate, standard feed assembly, video library catalog, batch tracking, content detail views, shorts feed, and authentication code in this repository are open-source and released under the **[MIT License](LICENSE)**. You are free to use, modify, and distribute this foundation for your own projects.

### 🌟 Unlock the Premium AI Engine & Managed Hosting
The advanced local LLM orchestration (Ollama Llama 3.1 & Moondream Vision AI), real-time intent classification, conversational memory, and automated vector mutation are part of the **InWebDesign Premium AI Engine**.

If you want to integrate the complete AI orchestration into your project without building it from scratch, we offer fully managed hosting, Proxmox LXC cluster deployments, and custom AI consulting.

📩 **[Contact InWebDesign for Premium AI Integration & Managed Hosting](https://inwebdesign.net)**

---

## 🧠 Key Features & Architectural Highlights

### 1. 🎯 Stateful Preference Vectors & Dynamic Vector Decay (Vision & Core Architecture)
Omni was built to solve a fundamental scalability flaw in modern recommendation platforms: traditional architectures log millions of individual click and view events into relational database rows, requiring expensive real-time queries and heavy infrastructure to compute user recommendations.

Omni replaces event-bloat with a lightweight, stateful **Preference Vector Engine** stored directly inside a single `affinityGraph` JSONB field per user in PostgreSQL:

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

* 📉 **Time-Weighted Vector Decay:** Older topic scores automatically decay over time using a time-weighted decay function. Active user engagements boost scores, while inactive topics naturally fade, ensuring recommendations always mirror current interest without manual resets.
* 🤖 **AI Dynamic Keyword Extraction:** As users consume media or talk to the AI Assistant, the system dynamically extracts new semantic keywords and intent tags, adding them to the user's `affinityGraph` in real time.
* ⚡ **Strict 50-Keyword Performance Cap:** To guarantee sub-10ms feed assembly and prevent memory bloat, `affinityGraph` enforces a strict cap of **maximum 50 topics**. Low-ranking or decayed topics are automatically pruned as new interests emerge.
* 🔄 **Self-Tuning Interest Graph:** Topics keep themselves automatically up-to-date based on organic user behavior, providing a frictionless, zero-form personalization experience.

### 2. 💬 Real-Time Chat Engine & Omni AI Assistant
The core vision of Omni is to make the entire platform, feed assembly, and discovery **controllable via AI directly inside the site chat**:

* 🤖 **In-Chat Feed Control & Intent Parsing (Ollama Llama 3.1):** Users can chat with the Omni AI Assistant to discover content ("Zeig mir Rezepte", "Wissenschafts-PDFs") or navigate the site. Intent parsing dynamically mutates user `affinityGraph` vectors and renders visual adjustment badges (`⚡ Algorithmus-Anpassung: Kochen +95%`) directly inside chat bubbles.
* 💬 **Dual-View Chat System:** WhatsApp/Telegram-style full-screen (2-column) and compact floating support widget. Supports 1:1 direct user messaging with multi-language locale awareness (`DE` / `EN`).
* 🔒 **Granular Privacy Controls:** Users can set direct message permissions (*Everyone*, *Subscribers Only*, *Nobody/Disabled*), toggle read receipts (`✓✓`), online indicators, and sound alerts.

### 3. 🔒 Level 4 AES-128 Encrypted HLS Video Pipeline
Omni implements an enterprise-grade content security architecture:

* 🔐 **On-Disk AES-128 Encryption (Level 4 Security):** Every `.ts` video segment file stored on disk is encrypted with a unique 128-bit AES key (`enc.key`). Raw `.ts` files are 100% unplayable if copied directly.
* 🔑 **JWT-Gated Key Authorization Endpoint (`/api/media/key/[slug]`):** Next.js & Strapi 5 serve the 16-byte AES decryption keys exclusively to authenticated users with valid session tokens.
* 🛡️ **Client Memory Isolation:** Native `hls.js` decodes segments into tab-scoped `blob:http://...` MediaSource buffers, preventing direct URL hotlinking, right-click downloads, and unauthorized media extraction.
* 💼 **Managed Transcoding Infrastructure:** *Note: The automated multi-quality HLS video transcoding pipeline runs on private cluster nodes. Developers who require full automated video encoding/transcoding and do not wish to build custom FFmpeg pipelines can license our managed video infrastructure or host directly with us at [InWebDesign.net](https://inwebdesign.net).*

### 4. 🎬 Custom YouTube-Style Video Player & Interactive Tag Engine
* 🎛️ **YouTube-Style Player Controls ([`CustomVideoPlayer.tsx`](file:///root/omni-stack-ai/web/src/components/CustomVideoPlayer.tsx)):** Includes a scrub bar with hover timestamp tooltips, smooth center play/pause splash animations, volume hover expansion, and full-screen toggle.
* ⚙️ **HLS Quality Selector:** Seamless manual or automatic quality resolution switching (`Auto`, `1080p`, `720p`, `480p`) via `hls.js`.
* 🛡️ **Branded Context Menu:** Custom right-click menu (`© 2026 Omni by InWebDesign.net`, copy link at current timestamp `?t=124`, loop toggle) replacing standard browser context popups.
* 🏷️ **Interactive Clickable Tag Engine:** All video tags on detail pages (`#Frühstück`, `#NextJS`) are interactive links navigating directly to `/videos?page=1&includetag=...`.

### 5. 🌐 Multilingual i18n Dictionary System
* 🇩🇪 🇬🇧 **Central Dictionary Infrastructure (`/dictionaries/de.json` & `/dictionaries/en.json`):** Complete UI internationalization covering headers, search bars, player controls, user profiles, chat widgets, privacy modals, and AI assistant prompts.
* 🔄 **Instant Language Switching:** Instant toggle between German (`DE`) and English (`EN`) with persistent local storage and cookie sync.

### 6. 📱 Dynamic Media-Type Routing & Views
* 🎞️ **Direct Video Catalog ([`/videos`](https://omni-web.inwebdesign.net/videos)):** Un-ranked video library with live title search (`q`), tag filtering (`includetag`, `excludetag`, `matchmode`), and multi-field sorting.
* 🎬 **Video Detail & Widescreen Theater ([`/video/[slug]`](https://omni-web.inwebdesign.net/video/sample-video)):** Cinema page with custom player, view counts, creator channel badges, like toggling, and interactive comment threads.
* 📱 **Vertical 9:16 Snap-Scroll Shorts Feed ([`/shorts`](https://omni-web.inwebdesign.net/shorts)):** TikTok / YouTube Shorts style vertical feed player with `snap-y` smooth snapping and floating action sidebars.
* 📄 **Universal Content Router ([`/content/[slug]`](https://omni-web.inwebdesign.net/content/sample-article)):** Unified detail router for Videos, PDF Documents (embedded viewer), and Typography-optimized Articles.

---

## 🛠️ Monorepo Structure

```
omni-stack-ai/
├── cms/                     # Strapi v5 Headless CMS (PostgreSQL & TypeScript Factories)
│   ├── config/              # PostgreSQL, CORS & Plugin configurations
│   └── src/api/             # Controllers, Services & AI Intent Feed Engines
├── web/                     # Next.js 16 App Router Frontend
│   ├── src/app/             # Pages, Catalog (/videos), Detail View (/video/[slug]), Shorts (/shorts), Key API (/api/media/key)
│   ├── src/components/      # CustomVideoPlayer, ChatWidget, Header, Settings & Modals
│   ├── src/context/         # AppContext (i18n), ChatContext (Rooms & Messages)
│   └── src/dictionaries/    # Multilingual i18n JSON Dictionaries (de.json, en.json)
├── converter_lxc/           # LXC Node 22 Transcoder (Level 4 AES-128 HLS, Watermarks, OG Images)
├── ecosystem.config.js      # PM2 Process Manager setup
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

# Start services under PM2
npm run start
```

Services will be online:
* **Frontend (Next.js):** `http://localhost:3000` (or [https://omni-web.inwebdesign.net/](https://omni-web.inwebdesign.net/))
* **CMS Backend (Strapi):** `http://localhost:1337` (or [https://omni-cms.inwebdesign.net/admin](https://omni-cms.inwebdesign.net/admin))

---

## 🌐 Managed Hosting & Consulting

For enterprise deployments, custom AI prompt engineering, or managed Proxmox LXC clustering:

* **Website:** [https://inwebdesign.net](https://inwebdesign.net)
* **Copyright:** © 2026 InWebDesign. All rights reserved.
