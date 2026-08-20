# 🤝 Contributing to Omni

Thank you for your interest in contributing to **Omni**! We welcome contributions from human developers and autonomous AI agents alike.

This guide outlines our development workflow, coding standards, and step-by-step procedures for submitting high-quality Pull Requests (PRs).

---

## 📋 Table of Contents
1. [Code of Conduct](#code-of-conduct)
2. [Getting Started & Local Setup](#getting-started--local-setup)
3. [Monorepo Architecture Overview](#monorepo-architecture-overview)
4. [Coding & Design Standards](#coding--design-standards)
5. [Pull Request Workflow](#pull-request-workflow)
6. [Conventional Commit Syntax](#conventional-commit-syntax)

---

## 📜 Code of Conduct

We aim to build an inclusive, respectful, and innovative open-source ecosystem. Please remain respectful, constructive, and collaborative in all issues, code reviews, and discussions.

---

## 🛠️ Getting Started & Local Setup

### 1. Prerequisites
- **Node.js**: `v22.15.1` or higher
- **PostgreSQL**: `v15` or higher (running locally on port `5432` with database `omni_stack_db`)
- **FFmpeg**: `v6.0` or higher (optional, for local video processing)
- **PM2**: `npm install -g pm2` (optional, for service management)

### 2. Fork & Clone
```bash
git clone https://github.com/YOUR-USERNAME/omni-stack-ai.git
cd omni-stack-ai
npm install
```

### 3. Environment Configuration
Copy environment files for both `cms` and `web`:

- **CMS Environment (`cms/.env`)**:
  ```env
  HOST=0.0.0.0
  PORT=1337
  DATABASE_CLIENT=postgres
  DATABASE_HOST=127.0.0.1
  DATABASE_PORT=5432
  DATABASE_NAME=omni_stack_db
  DATABASE_USERNAME=omni_user
  DATABASE_PASSWORD=omni_password_secure
  ```

- **Web Environment (`web/.env.local`)**:
  ```env
  STRAPI_URL=http://127.0.0.1:1337
  STRAPI_API_TOKEN=your_strapi_api_token
  ```

### 4. Build & Verification
Always verify that both workspaces compile cleanly before submitting PRs:
```bash
# Build all workspaces via Turborepo
npm run build
```

---

## 🏗️ Monorepo Architecture Overview

```
omni-stack-ai/
├── cms/                     # Strapi v5 Headless CMS (PostgreSQL & TypeScript)
│   └── src/api/             # Content Types, Controllers, Services & Routes
├── socket/                  # Standalone Real-Time WebSocket Microservice (omni-socket, Port 4000)
│   └── server.js            # Real-time WebSocket server handling chat & AI signals
├── web/                     # Next.js 16 App Router Frontend
│   ├── src/app/             # Pages & Next.js API Routes
│   ├── src/components/      # UI Components (SubscribeButton, CustomVideoPlayer, ChatWidget)
│   ├── src/context/         # AppContext (i18n), ChatContext (Rooms, Socket & Messages)
│   └── src/dictionaries/    # Multilingual Dictionaries (de.json, en.json)
└── ecosystem.config.js      # PM2 Process Manager setup
```

*Note: The [media converter](docs/CONVERTER_SERVICE.md) and the [content-fill service](docs/CONTENT_FILL_SERVICE.md) run in separate LXC containers by design to keep heavy transcoding and Ollama LLM load off the web/CMS container.*

---

## 🎨 Coding & Design Standards

### 1. TypeScript Strictness
- Avoid `any` types wherever possible. Define explicit interfaces in component files or helper modules.
- Check variable signatures and nullability before dereferencing properties.

### 2. Next.js 16 App Router Rules
- Mark client components explicitly with `'use client';` at the top of the file.
- Keep server components focused on data fetching and SEO metadata exports.

### 3. Multilingual i18n Dictionary Requirement
- All user-facing UI text MUST support both German (`DE`) and English (`EN`).
- Add missing translations to both `web/src/dictionaries/de.json` and `web/src/dictionaries/en.json`.
- Access translations via `useApp().t` or `(t as any)`.

### 4. Styling & UI Design
- Use Vanilla CSS and Tailwind CSS classes.
- Avoid cluttered designs; maintain fluid responsiveness and dark-theme aesthetic harmony (`bg-[#080e1e]`, `text-[#dae2fd]`, `indigo-500` accents).
- Do not introduce inline focus ring duplication; honor global focus resets.

---

## 🔄 Pull Request Workflow

1. **Create a Feature Branch**:
   ```bash
   git checkout -b feat/short-description
   ```
2. **Implement Changes & Tests**:
   - Write clean, self-contained code.
   - Audit existing utilities in `lib/` before inventing custom helpers.
3. **Run Build Verification**:
   ```bash
   npm run build
   ```
   Ensure 0 build errors and 0 TypeScript compilation failures.
4. **Commit & Push**:
   ```bash
   git add .
   git commit -m "feat(scope): concise description of changes"
   git push origin feat/short-description
   ```
5. **Open a Pull Request**:
   - Describe what problem your PR solves.
   - Attach screenshots or recording gifs for UI modifications.

---

## 🏷️ Conventional Commit Syntax

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat(scope)`: New feature or capability
- `fix(scope)`: Bug fix or corrective patch
- `docs(scope)`: Documentation updates
- `style(scope)`: Formatting or visual design adjustments
- `refactor(scope)`: Code restructuring without changing functionality
- `test(scope)`: Unit or integration test updates

Examples:
- `feat(subscriptions): add subscriber-only DM check to /api/chat`
- `fix(favorites): update GET endpoint to query api::favorite.favorite`
- `docs(readme): add WebSocket service architecture breakdown`

---

Thank you for helping build the future of hyper-personalized, open-source media networks! 🚀
