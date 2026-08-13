# Umsetzungsplan: Ganzheitliches Chat-System & Realtime-Architektur

Stand: 2026-08-13  
Status: Konzeption & Vorbereitung für Ausführung

---

## 1. Antwort auf die Echtzeit- & WebSocket-Frage

> **Frage**: *"Wie ist das mit den Websockets, dass das auch bei allen Teilnehmern entsprechend gleich ankommt? Brauchen wir da unbedingt einen parallelen Service mit extra URL?"*

### 💡 Klare Antwort: NEIN! Wir brauchen KEINEN separaten Server oder extra URL.

In unserer modernen Architektur haben wir zwei elegante Möglichkeiten:

### 🏆 Empfehlung: Integriertes Socket.io im Strapi-Backend (0 Zusatz-Ports / 0 Zusatz-URLs)
- Strapi läuft auf Node.js. In der `bootstrap()`-Phase von Strapi lässt sich `socket.io` direkt an den bereits existierenden HTTP-Server binden (`strapi.server.httpServer`).
- **Vorteil**: Die WebSockets laufen über die **exakt gleiche URL und den gleichen Port** wie das Strapi-CMS (`http://127.0.0.1:1337/socket.io` bzw. unter `https://omni-web.inwebdesign.net/socket.io`).
- **Verteilung**: Wenn ein Nutzer eine Nachricht sendet, verteilt Strapi die Nachricht in `< 5ms` per WebSocket-Room an alle verbundenen Teilnehmer des Raums.

---

## 2. Backend-Datenmodell in Strapi 5 (`chat-room` & `chat-message`)

Ein Chatraum ist immer einsprachig und kann für **1:1 Direktnachrichten**, **Gruppen-Chats** oder **KI-Assistenten-Chats** genutzt werden.

### A. Collection-Type: `api::chat-room.chat-room`
- `name`: string (z.B. *"KI Assistent"*, *"Tech Talk"* oder Username des 1:1 Gegenübers)
- `slug`: uid (eindeutige Raum-ID)
- `type`: enum (`'direct'`, `'group'`, `'ai'`, `'global'`)
- `language`: string (`'de'` / `'en'`, monolingual)
- `participants`: Relation (`manyToMany` zu `plugin::users-permissions.user`)
- `isAiEnabled`: boolean (true für KI-Chaträume)
- `aiSystemPrompt`: text (Optionale System-Anweisungen/Steuerungen für die KI)
- `lastMessageAt`: datetime (für Sortierung der Raumliste im Frontend)

### B. Collection-Type: `api::chat-message.chat-message`
- `room`: Relation (`manyToOne` zu `chat-room`)
- `sender`: Relation (`manyToOne` zu `user`, `null` bei KI oder Systemnachrichten)
- `senderType`: enum (`'user'`, `'ai'`, `'system'`)
- `content`: text (Nachrichtentext)
- `meta`: json (Optional: KI-Intent Aktionen, Video-Empfehlungen, System-Events)
- `createdAt`: datetime

---

## 3. Frontend-Architektur (Globaler `ChatProvider` & Floating/Fullscreen Widget)

Das Chat-System wird über einen **globalen React Context (`ChatProvider`)** in `layout.tsx` eingebunden. Dadurch bleibt der Zustand (geöffnete Räume, Ungelesen-Badge, Nachrichtenverlauf) bei der Navigation über die gesamte Website hinweg nahtlos erhalten.

### A. `ChatProvider.tsx` (`src/context/ChatProvider.tsx`)
Der Provider verwaltet den globalen Zustand:
- `isOpen`: boolean (Widget unten rechts sichtbar/geöffnet)
- `isExpanded`: boolean (Vollbild/Großansicht aktiv)
- `activeRoomId`: string | null (Aktuell gewählter Raum)
- `rooms`: Liste aller verfügbaren Räume des Nutzers
- `unreadCount`: Gesamtzahl ungelesener Nachrichten (für Badge im User-Menü)
- **Methoden**:
  - `openChat(roomId?: string)`
  - `closeChat()`
  - `toggleExpand()`
  - `createRoom({ name, type, participants })`
  - `sendMessage(roomId, text)`

### B. `ChatWidget.tsx` (`src/components/chat/ChatWidget.tsx`)
Stellt das visuelle Interface im Frontend bereit:

1. **Floating Trigger Button (Support-Widget unten rechts)**:
   - Feste Position unten rechts (`fixed bottom-6 right-6 z-50`).
   - Zeigt Ungelesen-Badge an.
   - Ein Klick öffnet das Chat-Fenster.

2. **Kompaktes Modales Fenster (Support-Style Overlay)**:
   - Größe: ca. `400px × 580px`.
   - Schwebender Card-Look mit Header, Raum-Auswahl-Dropdown und Nachrichtenfenster.
   - Buttons im Header: **Maximieren** (Großansicht), **Minimieren**, **Schließen**.

3. **Erweiterter Vollbild-Modus (WhatsApp / Telegram Style)**:
   - Füllt bei Klick auf "Maximieren" das gesamte Fenster oder das große Desktop-Layout.
   - **Linke Spalte (Sidebar)**: Liste aller Chaträume, Suchfeld & Button "Neuen Chat erstellen".
   - **Rechte Spalte (Hauptfenster)**: Aktiver Chatverlauf, KI-Steuerungsanzeige, Eingabefeld & Voice/Emoji/Aktionen.

4. **Integration im User-Menü & Header**:
   - Neuer Menüpunkt **"Chat"** im User-Menü und Header.
   - Ein Klick ruft direkt `openChat()` im `ChatProvider` auf.

---

## 4. KI-Integration im Chatraum (`type: 'ai'`)

Wenn ein Nutzer in einem Chatraum vom Typ `'ai'` eine Nachricht schreibt:
1. Die Nutzereingabe wird im Raum gerendert und via Strapi/WebSocket gespeichert.
2. Der Server leitet die Nachricht + Raum-Historie an unser **Ollama / Llama 3.1** KI-Modul weiter.
3. Die KI antwortet im Chatraum in Echtzeit (mit Text + optionalen Steuerungs-Aktionen wie z.B. Video-Empfehlungen).

---

## 5. Umsetzungs-Schritte für die Implementierung

1. **Schritt 1 (Strapi Backend)**:
   - Erstellen der Content-Types `chat-room` & `chat-message` in Strapi.
   - Anbinden von `socket.io` am Strapi HTTP Server für Realtime-Broadcasting.
   - REST API Endpunkte für Raum-Erstellung & Verlauf-Laden.

2. **Schritt 2 (Next.js Frontend)**:
   - Erstellen von `ChatProvider.tsx` mit Socket.io Client & SWR Fallback.
   - Bau von `ChatWidget.tsx` (Schwebend + Vollbild WhatsApp-Style).
   - Einbindung im User-Menü & Header.

3. **Schritt 3 (KI-Anbindung & Polish)**:
   - KI-Antwort-Logik für AI-Chaträume verknüpfen.
   - Testen von 1:1, Gruppen- & KI-Chats.
