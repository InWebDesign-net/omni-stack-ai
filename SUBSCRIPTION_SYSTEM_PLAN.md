# Umsetzungsplan: Abonnements-System (Subscriptions)

Stand: 2026-08-13  
Status: Konzeption & Vorbereitung für Ausführung

---

## 1. Zielsetzung & Funktionsumfang

Das Abonnements-System baut auf einer flexiblen, relationalen Strapi-Struktur auf (analog zum `fav`-System). Es ermöglicht Nutzern:
1. **Kanäle / Ersteller abonnieren**: Einem Nutzer oder Content-Creator folgen (z.B. `@catmania`).
2. **Chaträume abonnieren**: Wichtige Themen- oder Community-Chaträume abonnieren (z.B. *"Tech-Lounge"*).
3. **Persönlicher Abonnenten-Feed**: Filterung von Inhalten im Haupt-Feed nach abonnierten Kanälen.
4. **Benachrichtigung bei Neuveröffentlichungen**: Automatische Auslösung einer Benachrichtigung, wenn ein abonnierter Creator ein neues Video/Dokument veröffentlicht.
5. **Ersteller-Statistiken & Abonnenten-Liste**: Anzeige von Abonnenten-Zahlen auf Kanalseiten (`/user/[slug]`) und Freischaltung von exklusiven Inhalten/DMs (`allowDirectMessages = 'subscribers_only'`).

---

## 2. Backend-Datenmodell in Strapi 5 (`api::subscription.subscription`)

### Collection-Type: `api::subscription.subscription`
- `subscriber`: Relation (`manyToOne` zu `plugin::users-permissions.user`) — Der Nutzer, der abonniert.
- `targetUser`: Relation (`manyToOne` zu `plugin::users-permissions.user`) — Optional: Der abonnierte Creator/User.
- `targetChatRoom`: Relation (`manyToOne` zu `api::chat-room.chat-room`) — Optional: Der abonnierte Chatraum.
- `type`: enum (`'channel'`, `'chat_room'`) — Art des Abonnements.
- `createdAt`: datetime — Zeitpunkt des Abonnements.

---

## 3. Server Actions & API-Endpunkte

### REST API Endpunkte (`/api/subscriptions`):
- `POST /api/subscriptions/toggle`: Erstellt oder entfernt ein Abonnement für ein Ziel (Creator oder Chatraum).
- `GET /api/subscriptions/mine`: Lädt alle aktiven Abonnements des angemeldeten Nutzers.
- `GET /api/subscriptions/status?targetId=123&type=channel`: Liefert Abostatus + aktuelle Abonnentenzahl.

---

## 4. Frontend-Integration & UI Components

1. **Abonnieren-Button auf Kanalseite (`/user/[slug]`) & Video-Card**:
   - Interaktiver Status-Toggle (*"Abonnieren"* / *"Abonniert"* mit Glocken-Icon).
   - Dynamisches Inkrementieren/Dekrementieren der Abonnentenzahl ohne Reload.

2. **Abonnenten-Übersicht im Profil**:
   - Neuer Tab *"Abonnenten"* / *"Abonnements"* auf der eigenen Profilseite.

3. **Feed-Integration (`/videos` & `/`)**:
   - Neuer Schnellfilter im Feed: *"Meine Abos"*.

---

## 5. Verzahnung mit anderen Systemen

- **Chat-Privatsphäre**: Wenn der Empfänger `allowDirectMessages = 'subscribers_only'` gewählt hat, erlaubt das Backend 1:1 Chats erst, sobald ein aktiver `subscription`-Record vorliegt.
- **Benachrichtigungen**: Beim Erstellen eines neuen Videos sendet das Backend automatisch ein Event an alle Abonnenten des Creators.
