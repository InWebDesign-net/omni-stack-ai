# 🚀 AGY Setup & Projekt-Handbuch: Omni Stack AI

> **Wichtiger Hinweis für KI-Assistenten / Chat-Sessions:**
> Dieses Dokument dient als zentrale Anleitung und Status-Referenz für alle KI-Coding-Sessions im Projekt **Omni Stack AI** (`/root/omni-stack-ai`).

---

## 📌 Wichtigste Arbeitsregeln für KI-Agenten

1. **Regelmäßiges Git-Versionieren & Pushen:**
   - Nach jedem abgeschlossenen Feature oder Bugfix **MUSS** der Stand sauber committet und nach GitHub gepusht werden.
   - Befehl: `cd /root/omni-stack-ai && git add . && git commit -m "..." && git push origin main`
2. **PM2 & Production Build:**
   - Das Frontend läuft im Production Build unter PM2 (`omni-web`).
   - Nach Code-Änderungen in `web/` immer zuerst Typen prüfen: `cd /root/omni-stack-ai/web && npx tsc --noEmit`.
   - Danach neu bauen und PM2 neustarten: `npm run build && pm2 restart omni-web`.
3. **Keine Symptom-Flickerei:**
   - Typsicherheit, sauberes Fehler-Handling und durchgängige Datenstrukturen einhalten.

---

## 🏗️ Projekt-Architektur & Stack

- **Monorepo:** `/root/omni-stack-ai`
- **Frontend (`web/`):** Next.js 16 (App Router), React, TailwindCSS v4, Lucide Icons, Hanken Grotesk + JetBrains Mono.
- **Backend (`cms/`):** Strapi v5 Headless CMS auf PostgreSQL (`127.0.0.1:1337`).
- **KI Engine:** Ollama local LLM (`10.0.0.6:11434`) für Natural Language Intent Processing.
- **Process Manager:** PM2 (`omni-web` auf Port 3000, `omni-cms` auf Port 1337).
- **GitHub Repository:** `git@github.com:InWebDesign-net/omni-stack-ai.git` (Branch: `main`)

---

## 🌟 Aktuell implementierte Features & Routen

### 1. Navigation & Feed-Modi (`/`)
- **Startseite (`Home`):** Hero KI-Chat-Assistent mit Natural Language Prompting & Thema-Pills.
- **Trending:** Feeds sortiert nach Aufrufen & KI-Relevanz mit `🔥 HOT #1`, `#2`, `#3` Rank-Badges auf Thumbnails.
- **Abonnements:** Filtert Beiträge von abonnierten Creator-Kanälen (mit Creator-Strip zum Verwalten).
- **Bibliothek:** Eigene und gemerkte Beiträge.

### 2. Medientypen & Thumbnail Hover-Icons
- 🎬 **Video:** Hover-Icon `▶` (Play)
- 📱 **Short:** Hover-Icon `▶` (Play)
- 📄 **PDF:** Hover-Icon `📄` (Dokument)
- 📖 **Artikel:** Hover-Icon `📖` (Buch/Artikel)

### 3. Detailseiten (`/content/[slug]`)
YouTube-Style Breites Theater-Layout für reguläre Medien:
- **Video:** 16:9 Cinema-Player mit ausklappbarer Beschreibung, Like/Bookmark/Share Bar, Kommentaren & KI-Seitenleiste.
- **PDF:** Eigener Dokumenten-Hub mit Vorschau-Canvas, Direct-Download-Button und Vollbild-Viewer-Link.
- **Artikel:** Lesemodus mit Hero-Banner, Lesezeit-Schätzung und formatierten Callouts.

### 4. Vertikaler Shorts Feed (`/shorts` & `/shorts/[slug]`)
- **Nativer Snap-Scroll (`snap-y snap-mandatory`):** 9:16 Vollbild-Player mit sanftem Einrasten (wischen/scrollen oder Pfeiltasten ⬆️/⬇️).
- **Live URL-Sync:** Aktualisiert beim Scrollen die Browser-URL auf `/shorts/[slug]`.
- **Floating Action Controls:** Like (❤️), Kommentar-Drawer (💬), Teilen (🔗), Abonnieren-Badge & rotierende Sound-Disk.

### 5. Benutzer-Authentifizierung, Upload Manager & Kanal-Verwaltung
- **Multi-Video Upload Manager (`VideoUploadModal.tsx`):** Drag & Drop Upload Zone mit 2 MB Chunked Upload nach `/api/upload/chunk`. Zeigt Live-Fortschritt der Konvertierung & Strapi-Anlegung.
- **Auth Modals:** Login & Registrierung an Strapi Users-Permissions gekoppelt.
- **Kanal-Profil Modal:** Zeigt Kanal-Banner, Avatar, Bio, Follower und Beiträge.
- **Einstellungen Modal:** Bearbeitung von Benutzername, Handle (`@name`), Avatar & Bio.
- **Universal Navigation Drawer:** Dynamisches Slide-Over-Menü im `<Header />` für plattformweite Navigation.
- **Reaktives Sprach- & Parameter-Routing:** Nahtloses Next.js Client Routing ohne harte Seitenloads (`window.location.reload()` eliminiert).
- **Strapi 5 i18n Document Linking:** Verknüpfung von DE-Lokalisierungen an EN Master-Dokumente via Document Service API.

---

## 🛠️ Schnell-Befehle für die Entwicklung

```bash
# Projektpfad
cd /root/omni-stack-ai

# Frontend Typcheck & Build
cd web && npx tsc --noEmit && npm run build

# PM2 Neustart & Status
pm2 restart omni-web
pm2 status

# Git Commit & Push
git add .
git commit -m "feat/fix: Beschreibung"
git push origin main
```
