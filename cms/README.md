# ⚙️ Omni Backend – Strapi v5 Headless CMS

This is the Strapi v5 (PostgreSQL) backend for **Omni** – Hyper-Personalized Video Network & Media Hub by InWebDesign.

---

## 🌐 Live Admin Panel & Credentials

* ⚙️ **Strapi CMS Admin Panel:** <a href="https://omni-cms.inwebdesign.net/admin" target="_blank" rel="noopener noreferrer">https://omni-cms.inwebdesign.net/admin</a>
* 📱 **Frontend Web App:** <a href="https://omni-web.inwebdesign.net/" target="_blank" rel="noopener noreferrer">https://omni-web.inwebdesign.net/</a>

### 🔑 Demo Admin Credentials (Editor Role)
* **Identifier:** `demo-editor1@inwebdesign.net`
* **Password:** `DemoSecret2026!`

---

## 🧩 Custom API Endpoints & Services

* `POST /api/feed/assemble`: Assembles personalized feeds across 4 parallel content buckets using `affinityGraph` PostgreSQL JSONB vector scores.
* `POST /api/feed/ingest-finalized`: Ingestion endpoint called by LXC converter workers (`workerSecret: 'omni_ingest_worker_secret_2026'`) to finalize video processing, generate media paths, and update publication status.
* `POST /api/feed/seed-demo`: Dual-locale (`de` + `en`) demo data seeding service for 110+ videos and creator channels.
* `POST /api/tracking/batch`: High-performance batch tracking endpoint to update user preference vectors.

---

## 🚀 Development

```bash
# Start development server on http://localhost:1337
npm run develop

# Build admin panel
npm run build

# Start production server
npm run start
```
