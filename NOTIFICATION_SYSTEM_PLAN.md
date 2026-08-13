# Umsetzungsplan: Benachrichtigungs- & Glocken-System (Notifications)

Stand: 2026-08-13  
Status: Konzeption & Vorbereitung für Ausführung

---

## 1. Zielsetzung & Funktionsumfang

Das Benachrichtigungs-System informiert Nutzer in Echtzeit über Ereignisse auf der Plattform:
1. **Neue Chat-Nachrichten**: Benachrichtigung bei ungelesenen Nachrichten in abonnierten oder 1:1 Räumen ➔ Klick öffnet direkt den Chatraum im `ChatWidget`.
2. **Kommentar-Antworten**: Jemand hat auf deinen Kommentar geantwortet ➔ Klick springt direkt zum betreffenden Beitrag/Video und hebt den Kommentar hervor.
3. **Neue Videos abonnierter Creator**: Ein abonnierter Kanal hat ein neues Video hochgeladen ➔ Klick führt direkt zu `/video/[slug]`.
4. **Neue Abonnenten**: Jemand hat deinen Kanal abonniert ➔ Klick führt zum Profil des neuen Abonnenten.

---

## 2. Backend-Datenmodell in Strapi 5 (`api::notification.notification`)

### Collection-Type: `api::notification.notification`
- `recipient`: Relation (`manyToOne` zu `plugin::users-permissions.user`) — Der Empfänger.
- `sender`: Relation (`manyToOne` zu `plugin::users-permissions.user`) — Der Auslöser (optional).
- `type`: enum (`'chat_message'`, `'comment_reply'`, `'new_video'`, `'new_subscriber'`)
- `title`: string (Kurzer Betreff)
- `message`: string (Inhaltstext)
- `link`: string (Deep-Link Ziel z.B. `/video/katzenwelpen-2026#comment-42` oder `chat:room-123`)
- `isRead`: boolean — Default: `false`
- `createdAt`: datetime

---

## 3. Frontend UI Component & Header-Glocke (`NotificationDrawer`)

1. **Header-Glocke (`Header.tsx`)**:
   - Neben dem User-Avatar im Header platziert.
   - Zeigt ein pulsierendes rotes Badge mit der Anzahl der ungelesenen Benachrichtigungen an (`unreadCount`).

2. **Notification-Dropdown Overlay**:
   - Klick auf die Glocke öffnet das schwebende Benachrichtigungs-Panel (Dropdown).
   - **Filter**: *"Alle"* / *"Ungelesen"*.
   - **Buttons**: *"Alle als gelesen markieren"*, Einzelne Benachrichtigungen löschen.
   - **Intelligentes Navigation-Handling**:
     - Klick auf Chat-Benachrichtigung ➔ Ruft `openChat(roomId)` auf.
     - Klick auf Kommentar/Video-Benachrichtigung ➔ Navigiert zur Seite.

---

## 4. Echtzeit-Broadcasting (Socket.io / Server Events)

- Beim Erzeugen einer Benachrichtigung im Backend pusht der Strapi Socket.io Server das Event `notification:new` direkt an das verbundene Frontend des Nutzers.
- Das Glocken-Badge erhöht sich sofort ohne Seiten-Reload, und optional ertönt ein dezenter Notification-Sound.
