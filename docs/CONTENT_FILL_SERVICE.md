# Omni Stack Content Fill Service & Automated Metadata Pipeline

This document explains the architecture, execution pipeline, and production adaptation options for the **Content Fill Service** within the Omni Stack AI ecosystem.

---

## 🎯 Overview & Purpose

The **Content Fill Service** bridges Computer Vision and Large Language Models (LLMs) to automatically populate converted media assets with rich, bilingual (German/English) metadata:

1. **AI Vision Frame Analysis**: Visual content understanding using the **Moondream2** vision model.
2. **Bilingual Metadata Generation**: Structured JSON payload synthesis (bilingual titles, summaries, 10 relevant tags per language) using **Llama 3.1**.
3. **Strapi CMS Synchronization**: Document creation and publishing via the Strapi 5 REST API.
4. **State Persistence & Deduplication**: SQLite tracking database (`content_fill_state.db`) to ensure media items are processed exactly once.

---

## 🏗️ Architecture & Pipeline Flow

```
 ┌────────────────┐     ┌───────────────────┐     ┌─────────────────────┐     ┌────────────────┐
 │ 1. New Media   │────>│ 2. Moondream2     │────>│ 3. Llama 3.1        │────>│ 4. Strapi API  │
 │    Detected in │     │    Visual Frame   │     │    JSON Metadata    │     │    Document    │
 │    Output Dir  │     │    Analysis       │     │    Generation       │     │    Publish     │
 └────────────────┘     └───────────────────┘     └─────────────────────┘     └────────────────┘
```

### Processing Steps:
1. **Scrubber Loop**: The service scans output directories (`/mnt/media/out/videos` & `/mnt/media/out/images`) for unprocessed assets.
2. **Vision Analysis (`ollama.js`)**: 
   - Keyframe thumbnails are passed to **Moondream**.
   - Moondream returns a descriptive English summary (*"A video showing boats docked at a serene lake shore under green trees..."*).
3. **Metadata Synthesis (`ollama.js`)**:
   - The visual description is passed to **Llama 3.1** with instructions to return strict JSON containing bilingual titles (`title_de`, `title_en`), summaries (`summary_de`, `summary_en`), and 10 tags (`tags_de`, `tags_en`).
4. **Publishing (`strapi.js`)**:
   - The service authenticates with Strapi CMS (`http://127.0.0.1:1337`), assigns a demo creator profile, and publishes the document.

---

## 🔄 Design Patterns: Dev/Demo vs. Production (Customization)

In development and demo setups, this service acts as an autonomous background poller to continuously seed realistic content into the platform.

For production systems, fully autonomous background publishing may not always be desirable. Developers can adapt the core AI components into various workflow patterns:

### 💡 Production Customization Options:

1. **Human-in-the-Loop Admin Assistant (Button Trigger)**:
   - Editors upload media manually via the CMS.
   - Clicking a **"✨ Generate AI Metadata"** button invokes the AI pipeline.
   - Generated titles, summaries, and tags populate admin form fields, allowing manual review and editing before publishing.

2. **Draft & Moderation Queue**:
   - The service processes uploads automatically, but sets the Strapi document status to `draft`. Editors receive a notification to review and approve items (`published`).

3. **Custom Prompts & Domain Taxonomies**:
   - System prompts in `ollama.js` can be customized to enforce specific e-commerce categories, corporate brand guidelines, or niche tag taxonomies.

---

## 🚀 Setup & Environment Configuration

### File Structure (`/root/omni-root/omni-content-fill`):
- `index.js`: Main event loop and file scrubber.
- `ollama.js`: Ollama client interface (Moondream & Llama 3.1).
- `strapi.js`: REST client for Strapi CMS Documents API.
- `db.js`: SQLite state manager (`content_fill_state.db`).

### Environment Variables (`.env`):
```env
STRAPI_URL=http://127.0.0.1:1337
STRAPI_API_TOKEN=your_strapi_api_token
OLLAMA_HOST=http://10.0.0.6:11434
MEDIA_OUT_DIR=/mnt/media/out
```

### PM2 Process Execution:
```bash
pm2 start ecosystem.config.js --env production
```
