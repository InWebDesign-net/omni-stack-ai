# 🚀 Omni – Hyper-Personalized Video Network & Feed Assembly Engine

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)](https://nextjs.org/)
[![Strapi](https://img.shields.io/badge/Strapi-v5.51-purple?logo=strapi)](https://strapi.io/)
[![Turborepo](https://img.shields.io/badge/Turborepo-v2.10-red?logo=turborepo)](https://turbo.build/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?logo=postgresql)](https://www.postgresql.org/)
[![PM2](https://img.shields.io/badge/PM2-Managed-green?logo=pm2)](https://pm2.io/)

**Omni** is a modern, high-performance open-core boilerplate for hyper-personalized social networks and video streaming platforms. Built with **Next.js 16 (App Router)**, **Strapi v5 (PostgreSQL)**, **Turborepo**, and **PM2**, Omni introduces **Stateful Preference Vectors** to replace traditional, expensive event-logging databases.

---

## 📄 License & Premium AI Features

The core boilerplate, standard feed assembly, batch tracking, and authentication code in this repository are open-source and released under the **[MIT License](LICENSE)**. You are free to use, modify, and distribute this foundation for your own projects.

### 🌟 Unlock the Premium AI Engine
The advanced local LLM orchestration (Ollama CPU/GPU inference), real-time intent classification, and automated vector mutation are part of the **InWebDesign Premium AI Engine**.

If you want to integrate the complete AI orchestration into your project without building it from scratch, we offer fully managed hosting, Proxmox LXC cluster deployments, and custom AI consulting.

📩 **[Contact InWebDesign for Premium AI Integration & Hosting](https://inwebdesign.net)**

---

## 🧠 Key Features & Architectural Highlights

### 1. Stateful Preference Vectors (`affinityGraph`)
Instead of logging millions of individual click events in separate database rows, Omni mutates a single, highly-optimized **`affinityGraph` JSONB field** in PostgreSQL:

```json
{
  "contentTypes": { "video": 0.8, "pdf": 0.85, "article": 0.7, "short": 0.5 },
  "topics": {
    "Wissenschaft": { "score": 95, "last_interacted": "2026-08-04T18:00:00Z" },
    "PostgreSQL": { "score": 100, "last_interacted": "2026-08-04T18:00:00Z" }
  },
  "creators": { "1": { "score": 50, "last_interacted": "2026-08-04T18:00:00Z" } }
}
```

### 2. Hyper-Personalized Feed Assembly
Feeds are assembled dynamically by querying **4 Parallel Buckets**:
* 🎯 **High Intent:** Content matching user affinities (Score > 0.45).
* 👥 **Network & Subs:** Subscribed authors & recent channels.
* 🧭 **Exploration:** Wildcard / novelty content for filter bubble breakout.
* 🔥 **Fresh & Trending:** High view/like velocity across the platform.

Content is interleaved according to configurable **Slot Patterns** (*Discovery Pattern* vs. *Deep Dive Pattern*).

### 3. Batch Tracking & 14-Day Time Decay Engine
* **Client-side Batching:** Next.js buffers impressions (+1 pt), clicks (+5 pts), and completions (+20 pts) and flushes them every 15 seconds or via `navigator.sendBeacon`.
* **Server-side Time Decay:** Automatically halves historical topic scores if `last_interacted` exceeds 14 days.

### 4. Fullstack Authentication & User Profiles
* **Strapi Users-Permissions Integration:** JWT authentication, registration, and login.
* **1:1 User Profiles:** Linked `user-profile` documents holding custom bio, avatar, and personal `affinityGraph` vectors.

### 5. Modern Widescreen "Vivid Narrative" UI
* **Far-Left Desktop Navigation Sidebar:** Aligned to the desktop viewport edge (YouTube-style).
* **Hero AI Chat Mask:** Conversational prompt input box for instant intent steering.
* **Algorithm Control Drawer:** Real-time sliders and pattern toggles.

---

## 🛠️ Monorepo Structure

```
omni-stack-ai/
├── cms/                     # Strapi v5 Headless CMS (PostgreSQL)
│   ├── config/              # PostgreSQL & Plugin configurations
│   └── src/api/             # Custom Controllers & Services (feed, tracking, user-profile)
├── web/                     # Next.js 16 App Router Frontend
│   ├── src/app/             # Pages, Hero AI Chat Mask, Media Preview Modals
│   └── src/lib/             # Batch Tracking Manager (IntersectionObserver + sendBeacon)
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
```

### 3. Build & Run with PM2
```bash
# Build both apps via Turborepo
npm run build

# Start services under PM2
npm run start
```

Services will be online:
* **Frontend (Next.js):** `http://localhost:3000`
* **CMS Backend (Strapi):** `http://localhost:1337`

---

## 🌐 Managed Hosting & Consulting

For enterprise deployments, custom AI prompt engineering, or managed Proxmox LXC clustering:

* **Website:** [https://inwebdesign.net](https://inwebdesign.net)
* **Copyright:** © 2026 InWebDesign. All rights reserved.
