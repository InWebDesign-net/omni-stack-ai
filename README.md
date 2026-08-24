# 🚀 Omni – Hyper-Personalized Media Network & Feed Assembly Engine

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)](https://nextjs.org/)
[![Strapi](https://img.shields.io/badge/Strapi-v5.51-purple?logo=strapi)](https://strapi.io/)
<a href="https://inwebdesign.net" target="_blank" rel="noopener noreferrer">![HLS AES-128](https://img.shields.io/badge/Security-Level_4_AES--128-emerald?logo=lock)</a>
[![WebSocket](https://img.shields.io/badge/WebSocket-omni--socket-teal?logo=socketdotio)](https://omni-socket.inwebdesign.net)
[![Ollama AI](https://img.shields.io/badge/Ollama-Llama_3.1-orange?logo=ollama)](https://ollama.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?logo=postgresql)](https://www.postgresql.org/)
[![PM2](https://img.shields.io/badge/PM2-Managed-green?logo=pm2)](https://pm2.io/)

<p align="center">
  <img src="web/public/og_image.jpg" alt="Omni Media Network Preview" width="100%" style="border-radius: 12px;" />
</p>

**Omni** is a modern, high-performance open-core boilerplate for hyper-personalized social networks, encrypted video streaming platforms, real-time WebSocket chat networks, and AI-driven media distribution hubs. Built with **Next.js 16 (App Router)**, **Strapi v5 (PostgreSQL)**, a **standalone WebSocket microservice**, **Level 4 AES-128 HLS transcoding** and **local Ollama orchestration**, it replaces traditional event-logging databases with **Stateful Preference Vectors**.

---

## 🌐 Live Demo

* **Web Application:** <a href="https://omni-web.inwebdesign.net/" target="_blank" rel="noopener noreferrer">omni-web.inwebdesign.net</a>
* **Strapi Admin:** <a href="https://omni-cms.inwebdesign.net/admin" target="_blank" rel="noopener noreferrer">omni-cms.inwebdesign.net/admin</a>
* **WebSocket Service:** <a href="https://omni-socket.inwebdesign.net" target="_blank" rel="noopener noreferrer">omni-socket.inwebdesign.net</a>

**Frontend accounts** — also available as quick-login presets in the login modal:

| Account | Identifier | Password |
|---|---|---|
| Demo Tech User | `demotech@inwebdesign.net` | `DemoUser2026!` |
| Demo Gourmet User | `demogourmet@inwebdesign.net` | `DemoUser2026!` |

**Strapi editor:** `demo-editor1@inwebdesign.net` / `DemoSecret2026!`

---

## 🧠 Key Features

### 🎯 Stateful Preference Vectors

Personalization lives in a single `affinityGraph` JSONB field per user instead of an event log:

```json
{
  "contentTypes": { "video": 0.8, "pdf": 0.85, "article": 0.7, "short": 0.5 },
  "topics": {
    "Science": { "score": 95, "last_interacted": "2026-08-14T10:00:00Z" },
    "PostgreSQL": { "score": 100, "last_interacted": "2026-08-14T10:00:00Z" }
  },
  "creators": { "1": { "score": 50, "last_interacted": "2026-08-14T10:00:00Z" } }
}
```

Topic scores decay over time, so interest fades without anyone scheduling a cleanup. As users watch or talk to the assistant, intent is parsed, vectors mutate, and the change is shown rather than hidden (`⚡ Algorithm Adjustment: Cooking +95%`). A hard cap of 50 topics keeps feed assembly under 10 ms; low-ranking entries are pruned automatically.

### ⚡ Real-Time Layer

A dedicated WebSocket microservice (`socket/`, port 4000, behind Nginx SSL) replaces HTTP polling with bi-directional events.

* **Chat in two shapes** — a full-screen two-column view and a compact floating widget, covering 1:1 messages, group rooms and a global channel.
* **The assistant is a participant** — invite it into any room and remove it again; it joins and leaves over the same real-time signals as anyone else.
* **Granular DM permissions** — *Everyone*, *Subscribers Only* or *Nobody*, verified against live subscriptions before a message is delivered.
* **Typing indicators** expire locally after five seconds, so a client that crashes never leaves one standing.
* **Per-room notification rules** decided by room type: direct and global rooms notify by default, group rooms stay quiet until someone subscribes, and the assistant room never notifies because you are already looking at it.
* **Notification drawer** with unread badges, mark-as-read and deep links that open the target room, video or profile without a page load.
* **Incremental history** — the newest page loads with the room and older messages are fetched on scroll, with the scroll position corrected on prepend. The room list reads a denormalised preview per room instead of populating every message ever written.

### 🔒 Encrypted Media Pipeline

* **AES-128 on disk** — every `.ts` segment is encrypted with a 128-bit key (`enc.key`, written beside the renditions). Copied raw, the files are unplayable.
* **The key endpoint answers to visibility, not to sessions** — `/api/media/key/[slug]` releases the 16-byte key based on the video's own `visibility` field, so public videos stream for anonymous visitors while private ones return `401`/`403` unless the session owns them. The same check guards the MP4 renditions; segments need no gate of their own, being useless without the key.
* **Client memory isolation** — `hls.js` decodes into tab-scoped `blob:` buffers, so there is no URL to hotlink.
* **Chunked uploads with handles** — `UploadContext` returns a task id per file, so a modal or a content block can follow its own upload rather than guessing from a global list.
* **Private by default** — a file that just finished uploading has been reviewed by nobody. Publishing is one switch; unpublishing something strangers have already seen is not.
* **`orientation` recorded at ingest** — how the video was *shot*. The output is 16:9 either way, so this cannot be derived later, and a list that wants genuinely vertical material can ask for it.

### 🎬 Player & Vertical View

* **Custom player** with hover timestamps on the scrub bar, volume expansion, and a time display that toggles between elapsed and remaining.
* **Nested settings** that drill down like a phone settings screen — quality, ambient intensity, loop and vertical view.
* **Ambient mode** samples a 32×32 canvas five times a second and paints a blurred glow behind the player, pausing when the video does or the tab hides.
* **One HLS attachment path** (`useHlsSource`) shared by the detail player and the shorts feed, attaching only to the item on screen so a long feed never accumulates instances.
* **The vertical view is the same app** — likes, subscriptions, comments and sharing go through the same calls and components as the standard player. Its feed follows a playlist named by `?list=`, otherwise the affinity ranking, otherwise the catalogue; the video named in the URL is always fetched on its own, so a link opens what it says.
* **Cropped, not letterboxed** — a 9:16 source occupies a centred strip exactly `height × 9/16` wide, recovered at 39 dB PSNR against the original.
* **Clickable tags** navigate straight into a filtered catalogue (`/videos?includetag=...`).

### 🧩 Content Model

Video, article and image share list pages, edit modals, ownership checks, visibility rules and REST shapes. One table in `packages/shared` declares them and the rest derives from it:

```ts
export const CONTENT_KINDS = {
  video:   { uid: 'api::video.video',     plural: 'videos',   route: 'video',   listRoute: 'videos',   ownerField: 'creator', media: 'hls'  },
  article: { uid: 'api::article.article', plural: 'articles', route: 'article', listRoute: 'articles', ownerField: 'creator', media: 'none' },
  image:   { uid: 'api::image.image',     plural: 'images',   route: 'image',   listRoute: 'images',   ownerField: 'creator', media: 'webp' },
} as const;
```

`web/src/app/api/content/[kind]/[action]/route.ts` serves `list`, `mine`, `settings`, create, update and delete for all three; `mine` takes the owner from the session and never from the query string. Adding a fourth kind is an entry here plus its renderer. `feed-item` stays outside the table because it is a container with a different shape — an abstraction that has to be argued into place is the wrong abstraction.

* **Block editor in the frontend** — articles are a Strapi dynamic zone (`headline`, `rich-text`, `image`, `video`, `quote`, `pdf`) edited from the web app, with `@dnd-kit` reordering plus explicit up/down buttons, media pickers over your own library, drop-in upload, and video blocks that mount the player on click rather than eagerly.
* **Subscriptions** carry an explicit `isSubscribed` flag rather than encoding the answer in whether a row exists, so "subscribed", "muted" and "never decided" stay distinguishable. One model covers channels and chat rooms.
* **Likes** are one REST surface for videos, images, articles and feed items — named *like* in the code, the routes, the content type and the tables, because it is a single yes.
* **Playlists** are ordered, owned collections of videos, private by default and publishable by their owner under the same visibility rules as content. They appear beside the player when you watch inside one, and the vertical view continues *that* list at *that* video. A public playlist never publishes what it contains: entries are looked up again through the guarded path, and what a viewer may not see is dropped and reported as `hiddenCount`.

### 🌐 Two Languages, Two URLs

German is the default and stays unprefixed; English lives under `/en`. The server knows the language before it renders, so the first byte is already correct.

Every page declares a canonical for its own language and `hreflang` for the other, with `x-default` on German. `/sitemap.xml` lists every public item in both languages and `/robots.txt` points at it. UI text comes from `web/src/dictionaries/{de,en}.json`; articles, images, videos and comments are Strapi i18n documents.

Details, including the two Strapi i18n rules worth knowing in advance, are in **[Localization & SEO](docs/I18N_AND_SEO.md)**.

### 🛡️ Frontend Foundations

* **Design tokens, not hard-coded colours** — surfaces, text and borders come from CSS custom properties, so a theme is a token set rather than a sweep through every component. Three-state switching (system, dark, light) reacts to `prefers-color-scheme` without a reload.
* **Nothing is stored without consent** — every write to `localStorage` or `document.cookie` goes through one gate that looks the key up in a registry, and an unregistered key is *refused*. Withdrawing consent deletes what was collected instead of merely stopping collection. The banner's text, categories and storage mapping live in a Strapi single type, so changing them needs no deploy. Rejecting is one click, with the same visual weight as accepting.
* **Sessions in an httpOnly cookie** — no copy in `localStorage`, so there is no credential at rest for a script on the page to find. The WebSocket gateway runs on its own origin and cannot see the cookie, so it fetches a short-lived token from `/api/auth/socket-token` before *each* connection attempt; a reconnect after login or logout picks up the current session rather than a carried-over copy.
* **Zero third-party requests** — fonts are self-hosted variable files (95 KB for latin and latin-ext together), demo media is served from our own root, and the image optimizer's `remotePatterns` allows only hosts actually in use. Measured across the home, video and article pages: 234 requests, none external.
* **Demo data is maintained, not accumulated** — a `demo-reset` single type in Strapi controls what the nightly reset wipes and re-seeds, with a dry run as the default and a summary of what each run actually wrote.

---

## 🛠️ Monorepo Structure

```
omni-stack-ai/
├── cms/                     # Strapi v5 Headless CMS (PostgreSQL, TypeScript factories & schemas)
│   ├── config/              # Database, CORS & plugin configuration
│   └── src/
│       ├── api/             # Controllers & services (feed, subscriptions, likes, playlists, chat, notifications)
│       ├── components/      # Dynamic-zone block schemas (headline, rich-text, image, video, quote, pdf)
│       ├── data/            # Seed fixtures — catalogue, creators and the engagement layer
│       └── index.ts         # Bootstrap: permissions, cron, default-deny visibility middleware
├── packages/
│   └── shared/              # @omni/shared — content-kind registry & affinity types used by web + cms
├── socket/                  # Standalone WebSocket server (omni-socket, port 4000)
│   └── src/index.ts         # Socket.io gateway: chat, typing, notification fan-out (builds to dist/)
├── web/                     # Next.js 16 App Router frontend
│   ├── src/proxy.ts         # Locale prefix: rewrites /en/<path> and passes the language to the server
│   ├── src/app/             # Pages, catalogue, detail views, shorts, sitemap & robots
│   ├── src/app/api/         # BFF routes — the browser never talks to Strapi directly
│   ├── src/components/      # CustomVideoPlayer, ChatWidget, NotificationDrawer, GlobalUploadManager
│   ├── src/context/         # AppContext (i18n), ChatContext (rooms, socket), UploadContext (tasks)
│   ├── src/lib/hooks/       # useHlsSource, useContentEditForm, useUploadManager
│   └── src/dictionaries/    # UI dictionaries (de.json, en.json)
├── docs/                    # Service guides & architecture references
├── ecosystem.config.js      # PM2 setup (omni-cms, omni-web, omni-socket)
├── turbo.json               # Turborepo task pipeline
└── LICENSE                  # MIT License (InWebDesign)
```

The [media converter](docs/CONVERTER_SERVICE.md) and the [content-fill service](docs/CONTENT_FILL_SERVICE.md) run in their own LXC containers, keeping FFmpeg transcoding and Ollama inference off the web and CMS container.

---

## 🚀 Getting Started

### Prerequisites

* **Node.js** `v20` or higher (`cms/package.json` declares `>=20.0.0 <=26.x.x`)
* **PostgreSQL** `v15` or higher
* **FFmpeg** `v6.0` or higher, with QSV / HLS support
* **PM2** — `npm install -g pm2`

### 1. Installation

```bash
git clone git@github.com:InWebDesign-net/omni-stack-ai.git
cd omni-stack-ai
npm install
```

### 2. Database & Environment

Create the PostgreSQL database `omni_stack_db`, then configure all three services. Every variable is described in `cms/.env.example`, `web/.env.example` and `socket/.env.example`.

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
DEMO_MODE=false      # ON when unset: wipes demo content and every affinityGraph nightly at 04:00
```

```env
# web/.env.local
STRAPI_URL=http://127.0.0.1:1337
STRAPI_API_TOKEN=<full-access token created in the Strapi admin panel>
NEXT_PUBLIC_SOCKET_URL=http://127.0.0.1:4000
NEXT_PUBLIC_DEMO_USER_PASSWORD=      # empty hides the demo quick-login buttons
```

```env
# socket/.env
JWT_SECRET=<same value as cms/.env>
STRAPI_URL=http://127.0.0.1:1337
ALLOWED_ORIGINS=https://your-domain.example    # comma-separated
```

`STRAPI_API_TOKEN` stays server-side. The browser talks only to the Next.js routes under `web/src/app/api/`, which attach the token and, where ownership matters, the user id resolved from the session cookie.

`ALLOWED_ORIGINS` is what restricts which origins may open a socket connection, so set it in any deployment reachable from outside your own machine. Unset, the gateway falls back to local development origins and says so on startup; `ALLOW_ANY_ORIGIN=true` accepts any origin for throwaway environments and announces itself just as loudly.

Demo credentials come from the environment: `DEMO_USER_PASSWORD` and `DEMO_EDITOR_PASSWORD` seed the demo accounts, `NEXT_PUBLIC_DEMO_USER_PASSWORD` fills the quick-login buttons. Left unset, the demo accounts are never created — which is what you want in a real deployment, rather than accounts created with a password anyone can read in your repository.

### 3. Build & Run

```bash
npm run build      # both apps via Turborepo
npm run start      # omni-cms, omni-web, omni-socket under PM2
```

* **Frontend:** `http://localhost:3000`
* **CMS:** `http://localhost:1337`
* **WebSocket:** `http://localhost:4000`

---

## 📚 Documentation

* **[Media Converter Service](docs/CONVERTER_SERVICE.md)** — HLS transcoding pipeline, FFmpeg specs, folder-in/out and queue integration.
* **[Content Fill Service](docs/CONTENT_FILL_SERVICE.md)** — automated metadata generation, state database, and the human-in-the-loop workflow.
* **[Local AI Integration](docs/AI_VISION_AND_LLM_SERVICES.md)** — Ollama setup, Moondream2 vision, bilingual JSON generation and model swapping.
* **[Content Visibility](docs/OMNI_VIEWER.md)** — default-deny middleware and access policy architecture.
* **[Localization & SEO](docs/I18N_AND_SEO.md)** — locale routing, canonical and hreflang, and the Strapi i18n rules.

---

## 📄 License & Premium AI Engine

The core boilerplate is **[MIT licensed](LICENSE)**: feed assembly, the catalogue, content detail views, the shorts feed, real-time messaging and notifications, subscriptions, likes, playlists, authentication, the content-kind registry, the block editor, the upload pipeline and the encrypted HLS delivery path. Use, modify and distribute it freely.

The local LLM orchestration (Ollama Llama 3.1 and Moondream vision), real-time intent classification, conversational memory and automated vector mutation are part of the **InWebDesign Premium AI Engine**, available with fully managed hosting, Proxmox LXC cluster deployments and custom AI consulting.

📩 <a href="https://inwebdesign.net" target="_blank" rel="noopener noreferrer"><strong>Contact InWebDesign</strong></a> · © 2026 InWebDesign
