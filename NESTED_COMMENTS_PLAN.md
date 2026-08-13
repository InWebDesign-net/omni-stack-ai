# Umsetzungsplan: Mehrstufiges Kommentar-Antwort-System (Nested Comments)

Stand: 2026-08-13  
Status: Konzeption & Vorbereitung für Ausführung

---

## 1. Zielsetzung & Funktionsumfang

Erweiterung des bestehenden Kommentar-Systems zu einer mehrstufigen, verschachtelten Diskussion (YouTube / Reddit Style):
1. **Mehrstufige Antworten (2–3 Einrückungsebenen)**:
   - **Ebene 0 (Hauptkommentar)**: Bildet die Grundbasis, volle Breite.
   - **Ebene 1 (Direkte Antwort)**: Leicht eingerückt mit vertikaler Verbindungslinie.
   - **Ebene 2 (Antwort auf Antwort)**: Zweite Einrückungsstufe.
   - **Ab Ebene 3**: Weiter untereinander dargestellt (ohne tiefere Einrückung), um auf Mobilgeräten Platz zu sparen.
2. **Aufklappbare Antwort-Threads**:
   - Antworten werden initial eingeklappt dargestellt (z.B. *"▼ 3 Antworten anzeigen"*).
   - Verhindert Überladung der Seite bei langen Diskussionen.
3. **Inline-Antwort-Eingabe**:
   - Klick auf *"Antworten"* öffnet direkt unter dem jeweiligen Kommentar ein kompaktes Antwort-Feld.
4. **Benachrichtigungsauslösung**:
   - Jede Antwort auf einen Kommentar löst automatisch eine `comment_reply`-Benachrichtigung an den Autor des vorherigen Kommentars aus.

---

## 2. Backend-Datenmodell in Strapi 5 (`api::comment.comment`)

Erweiterung der bestehenden Schema-Datei [`cms/src/api/comment/content-types/comment/schema.json`](file:///root/omni-stack-ai/cms/src/api/comment/content-types/comment/schema.json):

- `parent`: Relation (`manyToOne` zu `api::comment.comment`) — Der übergeordnete Vater-Kommentar (null bei Hauptkommentaren).
- `replies`: Relation (`oneToMany` zu `api::comment.comment`, mappedBy: `parent`) — Liste der direkten Antworten.
- `depth`: integer — Tiefe im Baum (`0` für Hauptkommentar, `1` für erste Antwortstufe, etc.).
- `repliesCount`: integer — Anzahl vorhandener Antworten.

---

## 3. Frontend Component Architecture (`CommentThread.tsx`)

### Komponentenhierarchie:
- `CommentsSection.tsx` — Haupt-Container auf Video-/Beitragsseiten.
  - `CommentItem.tsx` — Einzelner Kommentar mit Autorendaten, Text, Likes, *"Antworten"*-Button & Thread-Linie.
  - `CommentInput.tsx` — Eingabefeld (für Hauptkommentar oder Inline-Antwort).

### Visuelle Ebenen-Darstellung:
- **Ebene 0**: `ml-0` (Hauptkommentar)
- **Ebene 1**: `ml-4 sm:ml-8 border-l-2 border-slate-800/80 pl-3 sm:pl-4`
- **Ebene 2**: `ml-4 sm:ml-8 border-l-2 border-indigo-500/30 pl-3 sm:pl-4`
- **Ebene 3+**: `ml-0 border-l border-slate-800/50 pl-2` (Spares mobile screen real-estate)

---

## 4. REST API & Baumstruktur-Verarbeitung

- `GET /api/comments?feedSlug=...`: Lädt Hauptkommentare + tief verschachtelte Antworten (`populate[replies][populate]=user`).
- `POST /api/comments`: Nimmt optional `parentId` entgegen, berechnet `depth = parent.depth + 1` und sendet das `comment_reply`-Event.
