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

The core boilerplate, standard feed assembly, batch tracking, content detail views, shorts feed, and authentication code in this repository are open-source and released under the **[MIT License](LICENSE)**. You are free to use, modify, and distribute this foundation for your own projects.

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

### 2. Dynamic Media-Type Routing & Views
* 🎬 **YouTube-Style Widescreen Theater (`/content/[slug]`):** 16:9 cinema video player with expandable description, likes, share links, channel subscribe cards, and comments.
* 📄 **PDF Document Viewer & Download Hub (`/content/[slug]`):** Clean document preview canvas with direct download links and fullscreen viewer toolbar.
* 📰 **Article Reader (`/content/[slug]`):** Typography-optimized article reader with estimated reading time, callouts, and author bio.
* 📱 **Vertical 9:16 Snap-Scroll Shorts Feed (`/shorts/[slug]`):** TikTok / YouTube Shorts style vertical feed player with `snap-y snap-mandatory` smooth snapping, keyboard navigation (Up/Down arrows), floating action sidebar (Like, Comment Drawer, Share, Sound Toggle), and real-time URL synchronization.

### 3. Hyper-Personalized Feed Assembly & Navigation Modes
Feeds are assembled dynamically by querying **4 Parallel Buckets**:
* 🎯 **High Intent:** Content matching user affinities (Score > 0.45).
* 👥 **Network & Subs:** Subscribed authors & followed channels.
* 🧭 **Exploration:** Wildcard / novelty content for filter bubble breakout.
* 🔥 **Fresh & Trending:** High view/like velocity across the platform (featuring `🔥 HOT #1`, `#2`, `#3` rank badges).

### 4. Fullstack Authentication, User Profiles & Creator Channels
* **Strapi Users-Permissions Integration:** JWT authentication, registration, and login tabs.
* **1:1 User Profiles & Channel Management:** Edit profile modal (Username, Handle `@name`, Avatar URL, Bio), Creator Channel View with follower toggling, and user post publication.

---

## 🛠️ Monorepo Structure

```
omni-stack-ai/
├── cms/                     # Strapi v5 Headless CMS (PostgreSQL)
│   ├── config/              # PostgreSQL & Plugin configurations
│   └── src/api/             # Custom Controllers & Services (feed, tracking, user-profile)
├── web/                     # Next.js 16 App Router Frontend
│   ├── src/app/             # Pages, Content Detail (/content/[slug]), Shorts Feed (/shorts/[slug]), Auth & Modals
│   └── src/lib/             # Batch Tracking & Shared Feed Dataset Helpers
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
