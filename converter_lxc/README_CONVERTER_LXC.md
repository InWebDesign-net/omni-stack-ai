# 🚀 Omni Video Converter LXC Container Setup Guide

Dies ist die vollständige Anleitung zur Einrichtung des dedizierten **Omni Converter LXC Containers** für sofortige Video-Konvertierung, Thumbnail-Erstellung, OpenGraph-Bilder, HLS-Streaming und direkte Strapi-CMS Ingestion.

---

## 📁 Mountpoints & Ordnerstruktur

Der LXC-Container teilt sich über Proxmox/LXC-Mountpoints den Ordner `/root/media` (oder `/mnt/media`):

```bash
/root/media/
├── in/          # Upload-Eingangsordner für Rohvideos
├── out/         # Konvertierungs-Arbeitsordner (.mp4, .meta, .done, hls/)
├── videos/      # Fertige MP4 & HLS-Streams für Auslieferung
├── thumbnails/  # Miniaturbilder (6-Grid PNGs)
└── og/          # OpenGraph Share-Bilder (1200x630 JPGs)
```

---

## 🛠️ 1. Paket-Installation im LXC Container

Führe folgende Befehle im **LXC Container** aus:

```bash
# System-Pakete aktualisieren und FFmpeg + Node.js 22 installieren
apt update && apt upgrade -y
apt install -y ffmpeg nodejs npm inotify-tools curl git

# Globale Node-Utilities & PM2 Prozess-Manager installieren
npm install -g pm2
```

---

## 📄 2. Skripte im LXC Container anlegen

Erstelle den Ordner `/opt/video-utils/` und erstelle ein `package.json` mit ESM-Unterstützung:

```bash
mkdir -p /opt/video-utils
cd /opt/video-utils

cat << 'EOF' > package.json
{
  "name": "omni-video-converter",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "chokidar": "^4.0.3",
    "fluent-ffmpeg": "^2.1.3",
    "node-fetch": "^3.3.2"
  }
}
EOF

npm install
```

Kopiere die beiden vorbereiteten Skripte:
- `watch-and-process.js` ➡️ `/opt/video-utils/watch-and-process.js`
- `process-videos.js` ➡️ `/opt/video-utils/process-videos.js`

---

## ⚙️ 3. PM2 Process Manager & Autostart einrichten

Damit der Konverter rund um die Uhr in Echtzeit läuft:

```bash
# PM2 Daemon starten
pm2 start /opt/video-utils/watch-and-process.js --name "omni-converter"

# Systemd Autostart aktivieren
pm2 save
pm2 startup
```

---

## 🧪 4. Funktionsweise & Testen

1. Sobald ein Video hochgeladen wird (z. B. via Web-Upload in Strapi oder Kopieren nach `/root/media/in/video.mp4`):
2. Erkennt `chokidar` in **Echtzeit** die fertige Datei.
3. `process-videos.js` konvertiert das Video in MP4 & HLS, baut Thumbnails + OG-Image.
4. Nach Abschluss ruft der Converter automatisch den Endpoint auf:
   `POST https://omni-cms.inwebdesign.net/api/feed/ingest-finalized`
5. Das Strapi CMS aktualisiert den Video-Status sofort auf `isProcessing: false` und stellt das fertige Video im Feed bereit!
