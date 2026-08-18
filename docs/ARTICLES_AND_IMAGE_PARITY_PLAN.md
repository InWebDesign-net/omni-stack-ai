# 📋 Masterplan & Ticket-Board: Articles Content-Type, Images Features-Parität & Profile Tabs

**Projekt:** `InWebDesign-net/omni-stack-ai`  
**Pfad:** `/root/omni-root/ARTICLES_AND_IMAGE_PARITY_PLAN.md`  
**Datum:** 2026-08-18  
**Status:** In Planung / Bereit zur Abarbeitung durch Hermes & Jules  

---

## 🎯 Übersicht & Gesamtziel

Ziel dieser Roadmap ist die Fertigstellung der Content-Architektur:
1. **Images Feature-Parität**: Bilder erhalten dieselben Verwaltungsmöglichkeiten für Ersteller wie Videos (Bearbeiten, Sichtbarkeit, Löschen) und Integration in das Benutzerprofil (Tabs & Favoriten).
2. **Neuer Content-Typ `/articles`**: Ersatz für den alten `/content`-Feed durch ein vollwertiges Magazin-/Artikel-System mit Component Blocks (Markdown, Bildgalerien, Video-Embeds), Tags, KI-Interessen-Sortierung und Interaktionen (Likes, Kommentare, Views).
3. **Erweitertes Benutzerprofil (`/user/[slug]`)**: 5 klare Tabs: **Articles**, **Videos**, **Images**, **Favoriten** und **Kanal-Info**.
4. **Clean-Up & Rückbau von `/content`**: Geordnete Migration und Weiterleitung von `/content` auf `/articles` nach erfolgreicher Fertigstellung.

---

## 🧩 PHASE 1: Images Feature-Parität & Profil-Erweiterung

### 🎫 Ticket 1.1: Image-Bearbeitungs-Modal für Ersteller (`ImageEditModal.tsx`)
- **Ziel**: Ersteller eigenen Bild-Contents sollen den Titel, die Zusammenfassung, Tags und Sichtbarkeit (Öffentlich/Privat) nachträglich bearbeiten oder das Bild löschen können.
- **Komponenten / Dateien**:
  - Neu: `web/src/components/image/ImageEditModal.tsx`
  - Anpassen: `web/src/app/image/[slug]/ImageDetailPageClient.tsx`
  - Neu/Anpassen: `web/src/app/api/image/settings/route.ts` (API für Update `PUT` & Delete `DELETE`)
- **Akzeptanzkriterien**:
  - Button "Bild bearbeiten" erscheint auf der Detailseite `/image/[slug]`, wenn `currentUser.id === image.creator.id`.
  - Modal erlaubt Bearbeitung von `title`, `summary`, `tags` und `visibility` (`public` / `private`).
  - Löschaktion verlangt Bestätigung und entfernt das Bild soft/hard aus Strapi.
  - Nach Speichern wird die Detailseite automatisch aktualisiert.

---

### 🎫 Ticket 1.2: Fünf-Tab-Struktur im Benutzerprofil (`/user/[slug]`)
- **Ziel**: Das Profil `/user/[slug]` erhält eine übersichtliche Tab-Navigation mit 5 Rubriken:
  1. **Articles**: Vom Nutzer verfasste Artikel
  2. **Videos**: Vom Nutzer hochgeladene Videos
  3. **Images**: Vom Nutzer hochgeladene Bilder
  4. **Favoriten**: Alle vom Nutzer gefallenen Medien (Videos, Bilder, Artikel)
  5. **Kanal-Info**: Bio, Statistiken, Abonnenten, Erstellungsdatum
- **Komponenten / Dateien**:
  - Anpassen: `web/src/app/user/[slug]/UserProfileClient.tsx`
  - Neu: `web/src/components/user/UserImagesTab.tsx`
  - Neu: `web/src/components/user/UserArticlesTab.tsx`
  - Neu: `web/src/components/user/UserFavoritesTab.tsx`
- **Akzeptanzkriterien**:
  - Alle 5 Tabs sind klickbar und laden die jeweiligen Medien per SWR.
  - Auf eigenen Profilen hat der Ersteller bei Videos, Images und Articles direkte Schnellzugriffs-Buttons zum Bearbeiten/Löschen.
  - Mobil ist die Tab-Leiste horizontal scrollbar ohne Layout-Brüche.

---

### 🎫 Ticket 1.3: Favoriten-Aggregations-API & Like-Synchronisation
- **Ziel**: Vom Nutzer gelikete Bilder (`omni_user_likes`), Videos und Artikel erscheinen gebündelt im Profil-Tab "Favoriten".
- **Komponenten / Dateien**:
  - Anpassen/Neu: `web/src/app/api/profile/favorites/route.ts`
  - Anpassen: `cms/src/api/profile/controllers/profile.ts` / `services/profile.ts`
- **Akzeptanzkriterien**:
  - API aggregiert gelikete Video-, Image- und Artikel-Dokumente für den jeweiligen Benutzer.
  - Ein Klick auf das Like-Herz auf `/images`, `/videos` oder `/articles` fügt das Medium sofort zu den Favoriten im Profil hinzu oder entfernt es wieder.

---

## 📑 PHASE 2: Neuer Content-Typ `Article` im Strapi CMS & API

### 🎫 Ticket 2.1: Strapi Schema für `Article` (`api::article.article`)
- **Ziel**: Definition des Strapi 5 Content-Typs für Artikel mit wiederverwendbaren Component Blocks.
- **Komponenten / Dateien**:
  - Neu/Update: `cms/src/api/article/content-types/article/schema.json`
- **Schema-Felder**:
  - `title` (String, required)
  - `slug` (UID based on title, required, unique)
  - `summary` (Text, optional)
  - `content` (Dynamic Zone / Component Blocks: Rich Text Markdown, Image Gallery, Video Embed, Callout/Quote)
  - `thumbnail` (Media oder String-URL)
  - `creator` (Relation zu `plugin::users-permissions.user` / Profile)
  - `viewsCount` (Integer, default 0)
  - `likesCount` (Integer, default 0)
  - `commentsCount` (Integer, default 0)
  - `tags` (JSON / Array von Strings)
  - `visibility` (Enum: `public`, `private`)
  - `isProcessing` (Boolean, default false)
  - `publishedAt` (DateTime)
  - i18n Aktivierung für `de` und `en`.
- **Akzeptanzkriterien**:
  - Schema kompiliert fehlerfrei in Strapi 5 (`npm run build` in `cms`).
  - Strapi Admin zeigt die Eingabemasken für Artikel inklusive Component-Blocks an.

---

### 🎫 Ticket 2.2: Strapi Article Service (`findFilteredArticles` & `getAllTags`)
- **Ziel**: Bereitstellung der nativen Strapi 5 Filter-, Sortier- und Tag-Aggregationslogik für Artikel mit strikter Sprachtrennung.
- **Komponenten / Dateien**:
  - Neu: `cms/src/api/article/services/article.ts`
- **Akzeptanzkriterien**:
  - `findFilteredArticles(params)` unterstützt:
    - Strikte Sprachfilterung (`locale: targetLocale`, kein erzwungenes `*` bei Suche).
    - Suche `q` über `title` und `summary`.
    - Tag-Filterung (`includetag`, `excludetag`, `matchmode=any|all`).
    - Sortierungen: `createdatasc` (Neueste), `trending`, `affinity` (KI-Interessen), `mostliked`, `mostcommented`, `createdatdesc` (Älteste), `titleasc`, `titledesc`.
    - Exakte 24-Item Seitennummerierung (`meta.pagination`).
    - `documentId`-Deduplizierung.
  - `getAllTags(params)` aggregiert Artikel-Tags gefiltert nach `locale`.

---

### 🎫 Ticket 2.3: Strapi Article Controller & Custom Routes
- **Ziel**: Exposition der API-Endpunkte für gefilterte Artikel und Tag-Clouds.
- **Komponenten / Dateien**:
  - Neu: `cms/src/api/article/routes/01-custom-article.ts`
  - Neu: `cms/src/api/article/controllers/article.ts`
- **Akzeptanzkriterien**:
  - `GET /api/articles/filtered` gibt das paginierte Artikel-Array zurück.
  - `GET /api/articles/tags` gibt die aggregierte Tag-Cloud mit Counts zurück.

---

### 🎫 Ticket 2.4: Next.js API-Proxy-Routen für Artikel
- **Ziel**: Sichere Weiterleitung der Frontend-Anfragen an das Strapi-Backend.
- **Komponenten / Dateien**:
  - Neu: `web/src/app/api/article/list/route.ts`
  - Neu: `web/src/app/api/article/tags/route.ts`
  - Neu: `web/src/app/api/article/settings/route.ts` (für Erstellen, Bearbeiten, Löschen)
- **Akzeptanzkriterien**:
  - Alle Parameter (`page`, `pageSize`, `sort`, `q`, `lang`, `includetag`, `excludetag`, `matchmode`) werden sauber durchgereicht.

---

## 📰 PHASE 3: Frontend `/articles` Galerie & Detailansicht

### 🎫 Ticket 3.1: Artikel Übersichtsseite ([`/articles`](file:///root/omni-stack-ai/web/src/app/articles/page.tsx))
- **Ziel**: Vollständige Galerie-Seite analog zu `/videos` und `/images`.
- **Komponenten / Dateien**:
  - Neu: `web/src/app/articles/page.tsx`
  - Neu: `web/src/app/articles/ArticlesPageClient.tsx`
  - Neu: `web/src/components/article/ArticleCard.tsx`
  - Neu: `web/src/lib/hooks/useArticles.ts`
- **Akzeptanzkriterien**:
  - Hero-Banner mit Seitentitel & Kurzbeschreibung.
  - Suchleiste, Sortier-Dropdown (✨ Neueste, 🔥 Trending, 🎯 KI-Interessen, ❤️ Beliebteste, 💬 Meist-Kommentiert, 🔤 Titel A-Z, 🔤 Titel Z-A).
  - Interaktive Multi-Tag-Cloud mit Emojis.
  - Responsive Grid mit `ArticleCard`-Komponenten (Thumbnail, Titel, Zusammenfassung, Lesezeit-Schätzung, Autor-Avatar, Views & Likes).

---

### 🎫 Ticket 3.2: Artikel Detailseite ([`/article/[slug]`](file:///root/omni-stack-ai/web/src/app/article/[slug]/page.tsx))
- **Ziel**: Hochwertige Leseansicht für Magazin-Artikel.
- **Komponenten / Dateien**:
  - Neu: `web/src/app/article/[slug]/page.tsx`
  - Neu: `web/src/app/article/[slug]/ArticleDetailPageClient.tsx`
  - Neu: `web/src/components/article/ArticleBlockRenderer.tsx`
- **Akzeptanzkriterien**:
  - Hero-Header mit Artikel-Thumbnail, Titel, Lesezeit, Ersteller-Info, Veröffentlichungsdatum und Follow-Button.
  - `ArticleBlockRenderer`:
    - Rendert Markdown/Rich Text mit Syntax-Highlighting und Math/KaTeX.
    - Rendert eingebettete Bildgalerien mit Lightbox.
    - Rendert eingebettete HLS/MP4-Videoplayer.
  - Interaktions-Leiste (Like-Herz, Teilen-Modal, Bookmark-Button).
  - Vollständiges Kommentar-System (`CommentsSection.tsx`).

---

### 🎫 Ticket 3.3: Artikel-Erstellung & -Bearbeitung durch Ersteller
- **Ziel**: Ersteller können neue Artikel mit Inhalts-Blöcken verfassen und bestehende Artikel anpassen.
- **Komponenten / Dateien**:
  - Neu: `web/src/components/article/ArticleCreateModal.tsx`
  - Neu: `web/src/components/article/ArticleEditModal.tsx`
- **Akzeptanzkriterien**:
  - Modal bietet Formular für Titel, Zusammenfassung, Haupt-Thumbnail, Tags und Sichtbarkeit.
  - Block-Editor ermöglicht Hinzufügen von Textblöcken, Bild-Galerien und Video-Embeds.
  - Nach Erstellung/Bearbeitung wird der Artikel sofort in Strapi gespeichert und der Nutzer weitergeleitet.

---

## 🧹 PHASE 4: Deprecation & Rückbau von `/content` / Feed-Items

### 🎫 Ticket 4.1: URL-Weiterleitungen & Migration
- **Ziel**: Saubere Überleitung alter `/content`-Links auf die neue `/article`-Struktur.
- **Komponenten / Dateien**:
  - Anpassen: `web/next.config.ts` (Weiterleitungen `/content/[slug]` -> `/article/[slug]` & `/content` -> `/articles`).
- **Akzeptanzkriterien**:
  - Aufruf von `/content/mein-artikel` leitet per 301-Redirect auf `/article/mein-artikel` um.
  - Nach erfolgreichem Testbetrieb wird der alte `feed-item` Endpunkt deaktiviert.

---

## ⚙️ Regeln für autonome Agenten (Hermes & Jules)

1. **Ein Ticket pro Durchgang**: Jedes Ticket (z. B. Ticket 1.1) wird als eigenständiger Schritt abgearbeitet.
2. **Build- & Smoke-Test Verpflichtung**: Nach jedem Ticket müssen `npm run build` in `web` (und ggf. `cms`), `pm2 restart` und `python3 scripts/smoke_test.py` erfolgreich durchlaufen.
3. **Keine Test-Frameworks**: Wie in `HERMES_JULES_WORKFLOW_HOWTO.md` geregelt, dürfen keine Playwright- oder Unit-Test-Setups installiert werden.
