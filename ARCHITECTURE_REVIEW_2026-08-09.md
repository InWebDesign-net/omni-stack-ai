# 🏛️ Architektur-Review & Umsetzungsplan — Omni Stack AI

**Reviewer:** Claude (Architekt/Planer-Rolle) · **Datum:** 2026-08-09
**Für Umsetzung durch:** Antigravity / günstigere Modelle
**Scope:** Stand nach Phasen 1–4 (AffinityGraph, Seeding/Cron, Security, Visibility) + neue `/videos`- und `/video/[slug]`-Architektur.

---

## TL;DR — Sind wir auf Kurs?

**Ja.** Die vier abgeschlossenen Phasen sind sauber umgesetzt und live verifizierbar (kanonischer AffinityGraph greift, Boot löscht nichts mehr, destruktive Routen sind geschützt, Visibility-Middleware ist zentral). Die neue `/videos` + `/video/[slug]`-Struktur ist **architektonisch genau richtig** und sollte das Vorbild für den Rest werden.

Aber: Es gibt **6 konkrete Baustellen**, davon **2 kritisch** (Video-Streaming ohne Range; eingeloggte User bekommen auf `/videos` 403) und **2 sicherheitsrelevant** (Middleware-Bypass über URL-Query; Secrets als hartkodierte Fallbacks im öffentlichen Repo). Details + Umsetzungsschritte unten.

---

## ✅ Was gut ist (nicht anfassen)

- **`/videos` + `/video/[slug]` folgen dem korrekten Next-16-Muster:** Server Component holt Daten backendseitig + rendert JSON-LD (VideoObject/Breadcrumb/CollectionPage) → Client Component hydriert aus Props (`initialVideo`/`initialRelated`) statt clientseitig nachzuladen. `useVideos` (SWR) + typisierter Hook + dedizierte Proxy-Route `/api/video/list` mit Sort-/Such-/Pagination-Mapping. Das ist die Referenz-Architektur — der Rest der App sollte da hin migriert werden.
- **Zentrale Datenschicht-Durchsetzung** (`strapi.documents.use` Visibility-Middleware, `normalizeAffinityGraph` als einzige Format-Wahrheit, Identity nur aus `ctx.state.user`). Genau der Ansatz, den wir gegen das alte `isVisibleInFrontend`-Problem wollten.
- **Idempotentes Seeding + nächtlicher Cron** statt destruktivem Boot.

---

## 🔴 Baustellen (nach Priorität)

### B1 — KRITISCH: Media-Auslieferung ohne HTTP-Range/Streaming
**Datei:** `web/src/app/media/[...path]/route.ts` (~Zeile 50)
**Problem:** `fs.readFileSync(filePath)` lädt die **komplette** Datei in den RAM und liefert sie ohne `Accept-Ranges`/`206 Partial Content` aus. Bei jetzt **113 Videos** heißt das: kein Seeking im Player (Springen lädt alles neu), hoher Speicherverbrauch, keine parallelen Streams. Das ist die größte technische Schuld nach dem `/videos`-Ausbau.
**Lösung:**
- Range-Requests unterstützen: `Range`-Header parsen → `fs.createReadStream(path, { start, end })` → Status `206` mit `Content-Range`, `Accept-Ranges: bytes`, `Content-Length`.
- Ohne Range-Header: `200` + `createReadStream` (nicht `readFileSync`).
- MIME per Endung (`.mp4` → `video/mp4`, `.m3u8` → `application/vnd.apple.mpegurl`, `.ts`, `.png`, `.jpg`).
- Path-Traversal absichern: resolvten Pfad gegen `/root/media` prüfen (`resolved.startsWith(MEDIA_ROOT + path.sep)`), Symlinks bedenken.
- **Prüfen:** Kann NGINX/Reverse-Proxy `/media` direkt ausliefern (X-Accel-Redirect / try_files)? Das wäre die sauberere Lösung als Node im Pfad — mit Antigravity/User klären, wie das Proxy-Setup aussieht.
**Test:** `curl -s -D- -o /dev/null -H 'Range: bytes=0-1023' http://127.0.0.1:3000/media/videos/<slug>.mp4` → muss `206` + `Content-Range` liefern.

### B2 — KRITISCH: Eingeloggte User bekommen auf `/videos` 403
**Dateien:** `web/src/app/api/video/list/route.ts` + `web/src/app/video/[slug]/page.tsx` (nutzen `/api/videos` Core-Route) · `cms/src/index.ts` (Permissions)
**Problem:** Die Strapi-Core-Route `api::video.video.find` ist **weder für `public` noch `authenticated` freigeschaltet** (im Bootstrap fehlt der Grant — geprüft: authenticated hat nur `user.me`). Es funktioniert anonym nur, weil der Proxy als Fallback den `STRAPI_API_TOKEN` setzt. **Sobald ein User eingeloggt ist**, überschreibt der Proxy den API-Token mit dem User-JWT → Strapi antwortet **403**.
Live verifiziert:
- `/api/video/list` anonym → `200`
- `/api/video/list` mit gültigem User-JWT → `403`
- `/api/videos` direkt mit User-JWT → `403`
**Lösung (eine von zwei Varianten wählen):**
- **A (empfohlen):** `api::video.video.find` + `.findOne` im Bootstrap für `public` **und** `authenticated` granten. Die Visibility-Middleware filtert private Inhalte ohnehin zentral, d. h. der offene `find` ist safe. Konsistent mit der „Datenschicht entscheidet"-Linie.
- **B:** Proxy so bauen, dass er für Listen-Requests **immer** den API-Token nutzt und den User-JWT nur separat für den `omniViewer`-Kontext durchreicht. Mehr Sonderfall-Logik → weniger schön.
**Test:** Nach Fix `/api/video/list` mit User-JWT → `200`; eigene private Videos tauchen für den Owner auf, fremde nicht.

### B3 — SICHERHEIT: Visibility-Middleware per URL-Query umgehbar
**Datei:** `cms/src/index.ts` (Zeile ~28–36, `isAdminRequest`)
**Problem:** Der Admin-Bypass prüft u. a. `koaCtx.url.includes('/content-manager') || koaCtx.url.includes('/admin')`. `koaCtx.url` **enthält den Query-String**. Damit deaktiviert **jeder** anonyme Aufruf die Default-Deny-Regel, indem er `?x=/admin` anhängt — z. B. `POST /api/feed/assembly?x=/admin`. Aktuell leakt nichts, weil es **noch keine privaten Inhalte** gibt; sobald Uploads standardmäßig `visibility:'private'` sind (Phase 4!), ist das ein echtes Datenleck.
**Lösung:** Admin-Erkennung **nur** über den Auth-Strategy-/State prüfen, nicht über die URL:
- `koaCtx?.state?.auth?.strategy?.name === 'admin'` ODER User-Objekt mit `roles`/`registrationToken`.
- Wenn ein URL-Check nötig bleibt: nur `koaCtx.request.path` (ohne Query) und exakt gegen `/content-manager`-Präfix matchen, nicht `includes`.
**Test:** `curl -X POST 'http://127.0.0.1:1337/api/feed/assembly?x=/admin' -d '{"locale":"de","includeDrafts":true}'` darf **keine** privaten/Draft-Items liefern (nach Anlegen eines privaten Test-Items prüfen).

### B4 — SICHERHEIT: Secrets sind hartkodierte Fallbacks im öffentlichen Repo
**Dateien:** `cms/src/index.ts` (`INGEST_WORKER_SECRET` Fallback `'omni_ingest_worker_secret_2026'`), Feed-Service/Controller (`SEED_SECRET` Fallback `'omni_seed_secret_2026'`)
**Problem:** Beide Secrets sind **nicht** in `.env` gesetzt (geprüft), es greifen die Fallbacks — und die stehen im Klartext im **public** GitHub-Repo. Der Schutz aus Phase 3 ist damit wirkungslos.
**Lösung:**
- Echte Werte in `cms/.env` setzen (nicht committen; `.env` ist gitignored — verifizieren).
- Fallback-Strings aus dem Code entfernen; bei fehlendem Secret **hart fehlschlagen** (Route 403 / Boot-Warnung), statt still auf einen bekannten Default zu gehen.
- Converter-LXC-Skript muss dasselbe `INGEST_WORKER_SECRET` aus seiner Umgebung lesen.
**Test:** Ohne gesetztes Env → Ingest/Seed-Routen antworten 403; mit Env → 200.

### B5 — Phase-4-Lücke: `/video/[slug]`-Detailseite & privater Owner-Zugriff
**Datei:** `web/src/app/video/[slug]/page.tsx` (`getData`)
**Problem:** `getData` holt das Video serverseitig per Slug mit dem **API-Token**, ohne `omniViewer`-Kontext. Die Visibility-Middleware filtert private Inhalte → private Videos liefern `notFound()` **auch für den Autor**, weil die Server Component kein JWT/keinen Viewer kennt. Die Primär-Abfrage hat zudem keinen expliziten `visibility`-Filter (verlässt sich ganz auf die Middleware — okay, aber fragil).
**Lösung (Design-Entscheidung nötig — mit User klären):**
- Owner-Vorschau privater Videos: entweder Detailseite bei Login **clientseitig** mit JWT nachladen (SWR, wie `/videos`), oder eine dedizierte authentifizierte SSR-Route, die den Viewer-Kontext (`omniViewer.userId` aus verifiziertem JWT) an die Query hängt.
- Lock-Screen-Logik konsistent auf `visibility` statt `!publishedAt` ziehen (Handoff Phase 4 nennt das, für die neue Server-Component-Seite aber noch offen).

### B6 — Zwei Lesepfade für „Video" driften auseinander
**Kontext:** `/videos` + `/video/[slug]` lesen jetzt sauber die **Core-Route `api::video.video`**. Der Home-Feed (`assembleFeed`) baut Videos weiterhin über das **FeedItem-Pseudo-Video-Mapping**. Zusätzlich hat `video.feedItems mappedBy 'video'` weiterhin kein Gegenstück-Attribut auf FeedItem (dangling relation aus dem Ur-Audit).
**Empfehlung (nicht dringend, aber vor weiterem Ausbau entscheiden):**
- Kanonischen Lesepfad festlegen: Standalone-`video` ist die Wahrheit für Videos, FeedItem referenziert nur (via `shared.video`-Block). Feed-Assembly langfristig auf denselben Pfad wie `/videos` bringen, statt zweifach zu mappen.
- Die tote `mappedBy`-Relation bereinigen oder korrekt verdrahten.
- `page.tsx` (Home, ~1300 Zeilen) bleibt der große Monolith — schrittweise ins `/videos`-Muster (Server Component + Client-Hydration + Hook) überführen.

---

## 📋 Empfohlene Reihenfolge für die Umsetzung

1. **B2** (403 für eingeloggte User) — kleiner Fix, direkt spürbar, blockiert Testen von allem anderen im eingeloggten Zustand.
2. **B3 + B4** (Security-Paar) — zusammen erledigen, bevor private Inhalte real werden. Klein, hohe Wirkung.
3. **B1** (Media-Range) — mittlerer Aufwand; vorher Proxy-Setup mit User klären (NGINX vs. Node).
4. **B5** (Owner-Vorschau privat) — braucht Design-Entscheidung, dann Umsetzung.
5. **B6** (Lesepfad-Konsolidierung) — Architektur-Weichenstellung, planbar für später.

**Jede Aufgabe abschließen mit:** `cd cms && npm run build` bzw. `cd web && npx tsc --noEmit && npm run build` → `pm2 restart` → Test-`curl` (siehe je Baustelle) → commit & push. `web/AGENTS.md` beachten (Next 16 Docs).

---

## Offene Fragen an den User
- **B1:** Wie wird `/media` in Produktion ausgeliefert — direkt über NGINX oder immer über die Next-Route? (Bestimmt, ob wir Range in Node bauen oder an den Proxy delegieren.)
- **B5:** Sollen Autoren ihre privaten Videos in der Detailseite vorab sehen können (Vorschau vor „public"-Schalten)? Wenn ja: clientseitig oder authentifizierte SSR?
- **B2:** Variante A (offener `find` + Middleware filtert) ok? Das ist mein Vorschlag.
