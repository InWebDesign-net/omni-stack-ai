# 🔄 Handoff: AffinityGraph-Vereinheitlichung (WIP, Session 2026-08-07)

**Status:** Phase 1 von 4 ist zu ~85 % implementiert, aber **noch nicht typgeprüft, gebaut oder deployed**.
Die laufenden pm2-Dienste sind unverändert (alte Builds). Dieser Branch (`wip/affinity-unification`)
enthält den Zwischenstand. CMS-Build wurde erfolgreich getestet (`cd cms && npm run build` ✅),
Web-Build/`tsc` noch NICHT.

## Kontext / Ziel

Der Kern-Bug: `tracking.ts` schrieb `affinityGraph = {topics: 0–100, creators, contentTypes}`,
während Feed-Engine/Registrierung/Algorithm-Panel `{interests: 0–1, contentTypes, activePattern}`
in **dasselbe Feld** schrieben. Jeder Like zerstörte damit das Profil fürs Ranking.
Außerdem vertraute der Server dem vom Client mitgeschickten Profil (spoofbar).

**Neues kanonisches Format** (einzige Wahrheit, überall):
```ts
{
  topics:       Record<string, { score: 0–100, last_interacted, last_decayed? }>,
  contentTypes: Record<string, 0–1>,
  creators:     Record<string, { score: 0–100, last_interacted }>,
  activePattern: 'discovery' | 'deep_dive'
}
```
Eingeloggte User werden **serverseitig** gegen ihren DB-Graph gerankt (JWT → `ctx.state.user`),
anonyme Besucher schicken ihren localStorage-Graph mit (Legacy-Formate werden via
`normalizeAffinityGraph()` überall akzeptiert und konvertiert).

## Bereits umgesetzt (in diesem Branch)

### CMS
- **`cms/src/lib/affinity.ts` (NEU):** Kanonisches Modell, `defaultAffinityGraph()`,
  `normalizeAffinityGraph()` (akzeptiert beide Legacy-Formate), `isCanonicalAffinityGraph()`,
  `topicWeight()`, `creatorWeight()`.
- **`tracking/services/tracking.ts`:** komplett auf kanonisches Format; Decay-Fix
  (halbiert max. 1× pro 14-Tage-Fenster via `last_decayed` statt bei jedem Batch);
  Creator-Scores jetzt mit Untergrenze 0; neue Punkte: `share: 12`, `comment: 8`.
- **`feed/services/feed.ts`:**
  - `assembleFeed(input, viewerId?)` — lädt bei `viewerId` den Graph aus der DB;
    `activePattern` darf der Client weiterhin per Body überschreiben (Panel-UX).
  - Scoring: `topicWeight` (0–1) × contentType-Gewicht × Recency × `(1 + 0.3 × creatorAffinity)`.
  - Network-Bucket: `isSubscribedAuthor || creatorAffinity ≥ 60/100` (war vorher immer leer).
  - Feed-Dedupe über `documentId` statt numerischer `id` (Kollision feed-item/video behoben).
  - `processAiIntent` arbeitet kanonisch (LLM-Vertrag bleibt 0–1-"interests", wird ×100 konvertiert).
  - Totes `SAMPLE_SEED_ITEMS`-Array (~130 Zeilen) entfernt.
- **`feed/controllers/feed.ts`:** `viewerId`/`userId` kommen NUR noch aus `ctx.state.user`
  (Body-`userId` wird ignoriert → kein Fremdschreiben mehr); `processAiIntent` persistiert
  den Graph für eingeloggte User; **NEU: `updateProfile`-Action** (schreibt nur den eigenen Graph).
- **`feed/routes/feed.ts` + `tracking/routes/tracking.ts`:** `assembly`, `ai-intent`,
  `interaction`, `interaction-status`, `user-favorites`, `tracking/batch` laufen jetzt über
  **users-permissions-Rollen** statt `auth: false` (JWT wird verifiziert, wenn vorhanden);
  NEU `POST /feed/profile` (nur authenticated).
- **`src/index.ts` Bootstrap:** Permission-Grants für obige Actions (public + authenticated;
  `updateProfile` nur authenticated); einmalige idempotente **Migration aller User-Graphen**
  auf das kanonische Format.

### Web
- **`web/src/lib/affinity.ts` (NEU):** Spiegel des CMS-Moduls + Browser-Helfer
  (`loadStoredAffinityGraph`, `storeAffinityGraph`, `getStoredJwt`).
- **`lib/feed.ts`:** `InterestProfile`/`DEFAULT_PROFILE` entfernt; `getAuthorBio`/`getAuthorSubscribers` ergänzt.
- **`context/AppContext.tsx`:** Profil ist jetzt `AffinityGraph`; `updateProfileState` ist async,
  speichert localStorage UND persistiert für eingeloggte User via `POST /api/profile` (JWT).
- **NEU `app/api/profile/route.ts`:** Proxy → `POST /api/feed/profile` (JWT-Weiterleitung).
- **`app/api/strapi-feed/route.ts`:** leitet Client-JWT weiter (sonst API-Token-Fallback).
- **`app/api/tracking/batch/route.ts`:** JWT aus Header ODER `body.jwt` (für sendBeacon) → Authorization.
- **`lib/tracking.ts`:** sendet JWT im Header (flush) bzw. im Body (beacon); `userId` nicht mehr im Body.
- **`app/api/auth/register/route.ts`:** seedet `defaultAffinityGraph()` (kanonisch).
- **`app/page.tsx`:** lokale Duplikate (DEFAULT_PROFILE, InterestProfile, updateProfileState) entfernt →
  nutzt Context; Algorithm-Panel auf `profile.topics` mit Slidern 0–100 (Step 5, Anzeige gerundet);
  `updateInterestScore`/Pattern-Buttons/AI-Chat **awaiten** `updateProfileState` vor `fetchFeed`
  (Server rankt gegen DB-Graph → Persist muss vor Refetch abgeschlossen sein); `fetchFeed` sendet JWT.
- **`app/content/[slug]/page.tsx` + `app/video/[slug]/page.tsx`:** `jsonAuthHeaders()`-Helfer
  (JWT an interaction/interaction-status/strapi-feed); Profil-Load über `loadStoredAffinityGraph()`
  — fixt nebenbei den falschen localStorage-Key `omni_interest_profile` in der Video-Seite;
  `userId` aus den Bodies entfernt.

## ⚠️ Noch offen für Phase 1 (in dieser Reihenfolge)

1. **Restliche Format-Referenzen prüfen:**
   `grep -rn "\.interests\|DEFAULT_PROFILE\|InterestProfile" web/src` — insbesondere
   `app/shorts/page.tsx` wurde noch NICHT geprüft/angepasst. Auch `AuthModal.tsx` und
   `UserSettingsModal.tsx` gegenlesen (wohin PUTtet das Settings-Modal? Falls auf
   `/api/users/:id` → auf neue Struktur/Route umstellen).
2. **Typcheck + Builds:**
   `cd web && npx tsc --noEmit` (Fehler fixen) → `npm run build` →
   `cd ../cms && npm run build` → `pm2 restart omni-cms omni-web`.
3. **Funktionstests:**
   - Anonym: `curl -X POST 127.0.0.1:1337/api/feed/assembly -H 'Content-Type: application/json' -d '{"locale":"de"}'` → 200, `meta.userProfile.topics` vorhanden.
   - Login `demotech@inwebdesign.net` / `DemoUser2026!` → JWT → assembly mit `Authorization` → Ranking gegen DB-Graph.
   - `POST /api/feed/interaction` (like, mit JWT) → in Postgres prüfen: `SELECT affinity_graph FROM up_users WHERE id=…` → topics-Format, Score +15.
   - UI: Algorithm-Panel-Slider bewegen → Feed ändert sich; als eingeloggter User liken → Panel-Wert steigt nach Reload.
   - **Achtung Permissions:** Die Routen sind nun rollenbasiert. Wenn nach dem Restart 403 kommt,
     prüfen ob die Bootstrap-Grants angelegt wurden (`up_permissions`-Tabelle, Actions wie
     `api::feed.feed.assembleFeed` für public + authenticated Role).
4. Bei Erfolg: auf `main` mergen + pushen, diesen Branch löschen.

## 📋 Danach: Phasen 2–4 (vom User priorisiert und abgesegnet)

### Phase 2 — Boot-Seeding entschärfen + nächtlicher Reset-Cron
- `cms/src/index.ts`: `seedDemoData(true)` → `seedDemoData(false)` (löscht dann nichts mehr,
  seedet nur bei leerer DB — Idempotenz-Check via James-Webb-Slug existiert schon).
- In `assembleFeed` die beiden Per-Request-Blöcke entfernen („Auto-check .done" + „Auto-seed") —
  der 3s-Watcher in `index.ts` übernimmt den Ingest bereits.
- Strapi-Cron (Strapi 5: `config/server.ts` → `cron: { enabled: true, tasks: {...} }`):
  nächtlich z. B. `'0 4 * * *'` (Europe/Berlin beachten) → `seedDemoData(true)` +
  affinityGraphs der 7 Demo-User auf `defaultAffinityGraph()` zurücksetzen.
- Optional: verwaiste Media-Dateien gelöschter Videos aufräumen (VORSICHT: Seed-Videos
  referenzieren `/root/media/videos` + `thumbnails` — nur nicht-referenzierte Slugs löschen).

### Phase 3 — Berechtigungen & destruktive Endpoints
- `toggle-publish`: auth erforderlich + Ownership-Check (Dokument-Autor == `ctx.state.user.id`).
- `create-video`: auth erforderlich; `creator` aus JWT statt Body-`userId`.
  Die Upload-Kette muss das JWT durchreichen: `VideoUploadModal` → `/api/upload/chunk` → `create-video`.
- `ingest-finalized`: `workerSecret` gegen env `INGEST_WORKER_SECRET` prüfen (Param existiert, wird nie validiert!).
- `test-i18n`-Route + Controller-Action entfernen (Dev-Artefakt, `cms/test_i18n_link.js` reicht).
- `demo-reset`/`seed-demo`: Secret-Header (env, z. B. `SEED_SECRET`) prüfen; der „Re-Seed"-Button
  im Frontend (page.tsx `handleReSeedStrapi`, ruft Strapi direkt) über eine Next-Proxy-Route
  leiten, die das Secret serverseitig anhängt.
- users-permissions: sicherstellen, dass `user.update` für die authenticated-Rolle NICHT
  freigeschaltet ist (Profil-Schreibpfad ist jetzt `/feed/profile`; Settings-Modal ggf. auf
  eigene geschützte Route umstellen).
- Demo-Zugänge bleiben bewusst bestehen (Demo-Plattform): Frontend-User (`DemoUser2026!`)
  + Strapi-Editoren (`DemoEditor2026!`), User selbst ist Admin, dazu Antigravity- und Claude-Admin.

### Phase 4 — `visibility`-Enum mit zentraler Durchsetzung
- Schema: `visibility` enum `['private','public']`, default `public`, NICHT lokalisiert,
  auf **video UND feed-item** (User will beide harmonisch über den Algo steuerbar).
- **Document-Service-Middleware** (`strapi.documents.use(...)` in `register()` von `index.ts`):
  für die beiden UIDs bei `findMany/findOne/findFirst` default `visibility='public'` erzwingen —
  **default-deny**: Wer den Viewer-Kontext nicht explizit übergibt (z. B. `params.omniViewer = { userId }`),
  bekommt private Inhalte NIE. Vergessen ⇒ verstecken statt leaken (Umkehrung des alten
  `isVisibleInFrontend`-Problems aus dem example_old_project).
- Upload: beide Locales weiter `published`, aber `visibility:'private'` (vermeidet das
  Draft-Drift-Problem — Zähler-Updates laufen heute nur auf published-Versionen).
- „Veröffentlichen" in „Meine Bibliothek" = `visibility` auf `public` setzen (statt publish/unpublish);
  `togglePublish` entsprechend zu `toggleVisibility` umbauen (+ Ownership aus Phase 3).
- Frontend: Lock-Screen in `video/[slug]` auf visibility statt `!publishedAt` umstellen;
  Library zeigt eigene private Items (Feed-Query mit Viewer-Kontext).

## Wichtige Arbeitsregeln (aus agy_setup.md)
- `web/AGENTS.md` beachten: Next 16 hat Breaking Changes — vor Next-Code
  `web/node_modules/next/dist/docs/` konsultieren.
- Nach cms-Änderungen: `npm run build && pm2 restart omni-cms`; nach web-Änderungen:
  `npx tsc --noEmit && npm run build && pm2 restart omni-web`.
- Nach jedem Feature committen & pushen.
- Strapi-Admin für Claude: `claude-agent@inwebdesign.net` (Passwort beim User erfragen/ändern!).
