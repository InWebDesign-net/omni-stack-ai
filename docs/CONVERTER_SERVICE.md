# Omni Stack Media Converter Service & Transcoding Pipeline

Diese Dokumentation beschreibt die Funktionsweise, Architektur und Anpassungsmöglichkeiten des **Media Converter Services** zur automatisierten Konvertierung von Videos und Bildern im Omni Stack AI Ökosystem.

---

## 🎯 Überblick & Zweck

Der **Media Converter Service** verwandelt rohes Bild- und Videomaterial (z. B. hochgeladene `.mp4`, `.mov`, `.png`, `.jpg` Dateien) in hochkomprimierte, weboptimierte Formate:

1. **HLS Multi-Bitrate Streams**: Erzeugung von `.m3u8` Master-Playlists und HLS-Segmenten für unterbrechungsfreies Video-Streaming im Frontend (`CustomVideoPlayer.tsx`).
2. **WebP Thumbnails & OG Images**: Automatische Generierung von WebP-Vorschaubildern (z. B. Frame-Extraktion bei 25 %, 50 %, 75 % der Videodauer) und Social-Media OpenGraph Bildern (`/media/og/`).
3. **Metadaten-Extraktion**: Auslesen von Auflösung, Bildrate, Dauer, Dateigröße und Audio-Streams mittels `ffprobe`.

---

## 🏗️ Referenz-Architektur (Ordner-basiertes LXC Muster)

In der Entwicklungs- und Evaluierungsumgebung läuft der Converter als isolierter Hintergrund-Dienst (z. B. in einem LXC-Container) mit folgendem Ordner-basierten Workflow:

```
                  ┌───────────────────────────────┐
                  │ 1. Datei ablegen in           │
                  │    /mnt/media/in/ (Raw Input) │
                  └──────────────┬────────────────┘
                                 │
                                 ▼
                  ┌───────────────────────────────┐
                  │ 2. Chokidar Watcher erkennt   │
                  │    Schreib-Stabilisierung     │
                  └──────────────┬────────────────┘
                                 │
                                 ▼
                  ┌───────────────────────────────┐
                  │ 3. Worker-Prozess startet     │
                  │    FFmpeg / FFprobe           │
                  └──────────────┬────────────────┘
                                 │
                                 ▼
                  ┌───────────────────────────────┐
                  │ 4. Output schreiben nach      │
                  │    /mnt/media/out/            │
                  │    (.mp4, .m3u8, .webp)       │
                  └───────────────────────────────┘
```

### Komponenten im Detail:
- **`watch-and-process.js`**: Nutzt [Chokidar](https://github.com/paulmillr/chokidar) mit `awaitWriteFinish` (Stability Threshold 3s), um zu verhindern, dass unvollständig hochgeladene Dateien verarbeitet werden.
- **`process-videos.js`**: Führt die eigentliche Transkodierung via FFmpeg aus, erstellt HLS-Streams, Thumbnails und Metadaten-JSON-Dateien.

---

## ⚙️ Transkodierungs-Spezifikationen

### 1. Video HLS-Streaming (FFmpeg)
```bash
ffmpeg -i input.mp4 \
  -c:v libx264 -crf 22 -preset medium -g 48 -keyint_min 48 \
  -sc_threshold 0 -c:a aac -b:a 128k -ac 2 \
  -hls_time 4 -hls_playlist_type vod \
  -hls_segment_filename "/path/to/hls/segment_%03d.ts" \
  "/path/to/hls/master.m3u8"
```

### 2. Vorschaubild-Extraktion (WebP)
```bash
ffmpeg -ss 00:00:02 -i input.mp4 \
  -vframes 1 -vf "scale=1280:-1" -c:v libwebp -quality 85 \
  "/path/to/thumbnails/preview.webp"
```

---

## 🔄 Anpassung für den Produktionsbetrieb (Customization)

Das Ordner-basierte In-Out-Muster eignet sich hervorragend zur Entwicklung und für entkoppelte Serverumgebungen. Im Produktivbetrieb kann und sollte die Integration an die eigenen Anforderungen angepasst werden:

### 💡 Mögliche Produktions-Integrationen:

1. **Button-basierter Trigger im Admin-Dashboard**:
   - Statt eines dauerhaften Ordner-Watchers löst ein Klick im Strapi CMS Admin-Panel oder Next.js Admin-Dashboard ein Konvertierungs-Event aus (`POST /api/convert-media`).

2. **Async Queue Worker (BullMQ / Redis)**:
   - Beim Datei-Upload wird ein Job in eine Redis Queue (BullMQ) gepusht. Ein Worker-Knoten arbeitet die Queue ab und benachrichtigt das Frontend via WebSockets (`omni-socket`).

3. **Cloud Event Pipelines (AWS S3 / Lambda / Cloudflare Stream)**:
   - Datei-Upload direkt in S3 Bucket -> S3 Event-Notification startet Lambda / Elemental MediaConvert -> Speicher-Benachrichtigung an Webhook.

---

## 🚀 Setup & Betrieb der Beispiel-Umgebung

### Voraussetzungen:
- Node.js >= 18
- `ffmpeg` und `ffprobe` im `PATH` installiert.

### Befehle:
```bash
cd /root/omni-root/example_converter_lxc
npm install

# Einmaliger Durchlauf aller Dateien in /mnt/media/in:
node process-videos.js

# Dauerhafter Watcher-Service:
node watch-and-process.js
```

### PM2 Service Einbindung (`ecosystem.config.js`):
```javascript
module.exports = {
  apps: [{
    name: 'omni-converter',
    script: 'watch-and-process.js',
    cwd: '/root/omni-root/example_converter_lxc',
    env: {
      MEDIA_IN_DIR: '/mnt/media/in',
      MEDIA_OUT_DIR: '/mnt/media/out'
    }
  }]
};
```
