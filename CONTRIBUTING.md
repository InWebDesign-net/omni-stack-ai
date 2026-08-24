# 🤝 Contributing to Omni

Thank you for your interest in contributing to **Omni**. Contributions from human developers and autonomous AI agents are equally welcome.

This guide covers the development workflow, the standards a Pull Request is measured against, and the handful of repository conventions that are not obvious from reading the code.

---

## 📋 Table of Contents

1. [Code of Conduct](#-code-of-conduct)
2. [Getting Started & Local Setup](#️-getting-started--local-setup)
3. [Monorepo Architecture Overview](#️-monorepo-architecture-overview)
4. [Coding & Design Standards](#-coding--design-standards)
5. [Pull Request Workflow](#-pull-request-workflow)
6. [Conventional Commit Syntax](#️-conventional-commit-syntax)

---

## 📜 Code of Conduct

We aim to build an inclusive, respectful and innovative open-source ecosystem. Please stay respectful, constructive and collaborative in issues, code reviews and discussions.

---

## 🛠️ Getting Started & Local Setup

### 1. Prerequisites

- **Node.js**: `>=20.0.0 <=26.x.x` — CI builds on `22.23.2`
- **PostgreSQL**: `v15` or higher, on port `5432` with database `omni_stack_db`
- **FFmpeg**: `v6.0` or higher (optional, for local video processing)
- **PM2**: `npm install -g pm2` (optional, for service management)

### 2. Fork & Clone

```bash
git clone https://github.com/YOUR-USERNAME/omni-stack-ai.git
cd omni-stack-ai
npm install
```

### 3. Environment Configuration

All three services need configuration. `cms/.env.example`, `web/.env.example` and `socket/.env.example` describe every variable; the minimum to get running:

```env
# cms/.env
HOST=0.0.0.0
PORT=1337
DATABASE_CLIENT=postgres
DATABASE_HOST=127.0.0.1
DATABASE_PORT=5432
DATABASE_NAME=omni_stack_db
DATABASE_USERNAME=omni_user
DATABASE_PASSWORD=omni_password_secure
```

```env
# web/.env.local
STRAPI_URL=http://127.0.0.1:1337
STRAPI_API_TOKEN=your_strapi_api_token
```

```env
# socket/.env
JWT_SECRET=<same value as cms/.env>
STRAPI_URL=http://127.0.0.1:1337
ALLOWED_ORIGINS=http://localhost:3000
```

### 4. Build Verification

Both workspaces must compile cleanly before a PR is opened:

```bash
npm run build
```

CI runs the same build plus `npx tsc --noEmit` for the web workspace. A PR that does not build will not be reviewed on its merits, because nobody can tell yet what its merits are.

---

## 🏗️ Monorepo Architecture Overview

```
omni-stack-ai/
├── cms/                     # Strapi v5 headless CMS (PostgreSQL & TypeScript)
│   └── src/
│       ├── api/             # Content types, controllers, services & routes
│       ├── components/      # Dynamic-zone block schemas
│       ├── data/            # Seed fixtures (catalogue, creators, engagement layer)
│       └── index.ts         # Bootstrap: permissions, cron, visibility middleware
├── packages/
│   └── shared/              # @omni/shared — content-kind registry & affinity types
├── socket/                  # Standalone WebSocket microservice (omni-socket, port 4000)
│   └── src/index.ts         # Socket.io gateway: chat, typing, notification fan-out
├── web/                     # Next.js 16 App Router frontend
│   ├── src/proxy.ts         # Locale prefix handling
│   ├── src/app/             # Pages & BFF API routes
│   ├── src/components/      # UI components
│   ├── src/context/         # AppContext (i18n), ChatContext, UploadContext
│   └── src/dictionaries/    # UI dictionaries (de.json, en.json)
├── docs/                    # Service guides & architecture references
└── ecosystem.config.js      # PM2 process manager setup
```

The [media converter](docs/CONVERTER_SERVICE.md) and the [content-fill service](docs/CONTENT_FILL_SERVICE.md) run in their own LXC containers, keeping transcoding and Ollama inference off the web and CMS container.

---

## 🎨 Coding & Design Standards

### 1. Read the framework docs that ship with the repo

This repository pins a Next.js version whose conventions differ from most material online — `middleware.ts`, for one, is now `proxy.ts`. Before writing App Router code, read the relevant guide in `web/node_modules/next/dist/docs/`. `web/AGENTS.md` states this as a requirement, and it exists because guessing has cost real time here.

### 2. TypeScript strictness

- Avoid `any`. Define explicit interfaces in the component file or a helper module.
- Check nullability before dereferencing. `tsc --noEmit` runs in CI and is not advisory.

### 3. Next.js App Router

- Mark client components with `'use client';`.
- Keep server components to data fetching and metadata exports.
- Internal navigation goes through `LocaleLink` and `useLocaleRouter`, not bare `next/link` and `useRouter` — both languages have their own URL, and a bare link drops the reader back into German.

### 4. Strapi 5

- Address documents by `documentId`, not by numeric id. Handed a numeric id, Strapi answers `200` and does nothing.
- State the locale explicitly on every write and delete. An unspecified locale means *the default one*, never "all".
- A relation points at a row, not at a document. Draft-and-publish types keep two rows per language, and the Document Service returns the draft unless asked for `status: 'published'`.

See **[Localization & SEO](docs/I18N_AND_SEO.md)** for the reasoning behind all three.

### 5. Bilingual UI text

- Every user-facing string must exist in German and English.
- Add both keys to `web/src/dictionaries/de.json` and `en.json`.
- Read them through `useApp().t`.

### 6. Styling

- Tailwind classes and vanilla CSS.
- Colours come from the design tokens (`--bg-base`, `--surface`, `--surface-raised`, and the text and border tokens). Do not hard-code hex values — a theme is a token set, and a literal colour is invisible to it.
- Honour the global focus resets rather than adding per-component focus rings.

### 7. Storage and consent

Every write to `localStorage` or `document.cookie` goes through `web/src/lib/consent.ts`, which looks the key up in a registry and **refuses** unregistered keys. If your feature persists something, register it with its category in the same change.

---

## 🔄 Pull Request Workflow

1. **Branch**

   ```bash
   git checkout -b feat/short-description
   ```

2. **Implement**
   - Audit `lib/` and `packages/shared` before writing a helper that may already exist.
   - Match the surrounding code's comment density and naming.

3. **Verify**

   ```bash
   npm run build
   ```

   Zero build errors, zero type errors.

4. **Commit & push**

   ```bash
   git commit -m "feat(scope): concise description"
   git push origin feat/short-description
   ```

5. **Open the PR**
   - Say what problem it solves, not only what it changes.
   - Attach screenshots or a recording for anything visual.
   - If you found a defect while building the feature, say so — that is useful information, not noise.

### Security findings

Do not open a public issue for an unfixed vulnerability. Report it privately to the maintainers first; it is fixed before it is described.

---

## 🏷️ Conventional Commit Syntax

We follow [Conventional Commits](https://www.conventionalcommits.org/):

| Type | Use |
|---|---|
| `feat(scope)` | New feature or capability |
| `fix(scope)` | Bug fix |
| `docs(scope)` | Documentation |
| `refactor(scope)` | Restructuring without behaviour change |
| `perf(scope)` | Performance work |
| `style(scope)` | Formatting or visual adjustments |
| `test(scope)` | Tests |
| `chore(scope)` | Tooling, dependencies, housekeeping |

Examples:

- `feat(playlists): continue a list at the right video in the vertical view`
- `fix(seed): link likes and playlist entries to the published row`
- `docs(readme): group the feature list by area`

A commit message explains **why** the change was needed. The diff already shows what changed.

---

Thank you for helping build the future of hyper-personalized, open-source media networks. 🚀
