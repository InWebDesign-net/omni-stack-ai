# Omni Stack Media Converter Service & Transcoding Pipeline

This document details the architecture, internal mechanics, and production adaptation guidelines for the **Media Converter Service** within the Omni Stack AI ecosystem.

---

## 🎯 Overview & Purpose

The **Media Converter Service** transforms raw media uploads (`.mp4`, `.mov`, `.png`, `.jpg`, etc.) into optimized, web-ready formats:

1. **HLS Multi-Bitrate Streams**: Generates `.m3u8` master playlists and segmented TS files for seamless video playback in the frontend (`CustomVideoPlayer.tsx`).
2. **WebP Thumbnails & OG Images**: Extracts high-quality WebP video thumbnails (at keyframes such as 25%, 50%, 75% of duration) and OpenGraph social preview images (`/media/og/`).
3. **Metadata Extraction**: Reads resolution, frame rate, duration, file size, and audio streams using `ffprobe`.

---

## 🏗️ Reference Architecture (Folder-Based LXC Pattern)

In development and demo environments, the converter operates as an isolated background service (e.g., inside a LXC container or dedicated LXC node) utilizing an event-driven folder watcher pattern:

```
                  ┌───────────────────────────────┐
                  │ 1. File Upload to             │
                  │    /mnt/media/in/ (Raw Input) │
                  └──────────────┬────────────────┘
                                 │
                                 ▼
                  ┌───────────────────────────────┐
                  │ 2. Chokidar Watcher Detects   │
                  │    Write Stabilization        │
                  └──────────────┬────────────────┘
                                 │
                                 ▼
                  ┌───────────────────────────────┐
                  │ 3. Worker Process Triggers    │
                  │    FFmpeg / FFprobe           │
                  └──────────────┬────────────────┘
                                 │
                                 ▼
                  ┌───────────────────────────────┐
                  │ 4. Output Rendered to         │
                  │    /mnt/media/out/            │
                  │    (.mp4, .m3u8, .webp)       │
                  └───────────────────────────────┘
```

### Key Components:
- **`watch-and-process.js`**: Utilizes [Chokidar](https://github.com/paulmillr/chokidar) with `awaitWriteFinish` (stability threshold 3s) to prevent processing incomplete uploads.
- **`process-videos.js`**: Executes the core FFmpeg transcode pipeline, generates HLS streams, extracts WebP frames, and produces JSON metadata payloads.

### Watermark sizing

The watermark's height is a fraction of the frame it is drawn on
(`WATERMARK_HEIGHT_RATIO`, default `0.045`, overridable by environment), not a
fixed pixel value.

It has to be, because the HLS master is not always the same size: for 16:9 input
the converter keeps the source resolution. A fixed 48px mark therefore covered
4.4% of a 1080p frame and 20% of a 240p one — a low-resolution upload came out
branded across a fifth of the picture. The default reproduces the previous
appearance on a 1080p master, so a correctly-sized source is unchanged.

`processImage` is deliberately separate: it scales the mark to 15% of the image
width, which was set on purpose for that surface.

### The `.meta` sidecar

Written next to the output as `key=value` lines and read by the ingest:

```
duration=3.35
sourceWidth=426
sourceHeight=240
orientation=landscape
```

`orientation` is there because the conversion is lossy about it by design —
portrait footage comes out as a 16:9 frame with a blurred pillarbox, so nothing
downstream can tell a video shot vertically from one shot wide. It cannot be
recovered later, so it is recorded here.

---

## ⚙️ Transcoding Specifications

### 1. HLS Video Stream Transcoding (FFmpeg)
```bash
ffmpeg -i input.mp4 \
  -c:v libx264 -crf 22 -preset medium -g 48 -keyint_min 48 \
  -sc_threshold 0 -c:a aac -b:a 128k -ac 2 \
  -hls_time 4 -hls_playlist_type vod \
  -hls_segment_filename "/path/to/hls/segment_%03d.ts" \
  "/path/to/hls/master.m3u8"
```

### 2. WebP Preview Thumbnail Extraction
```bash
ffmpeg -ss 00:00:02 -i input.mp4 \
  -vframes 1 -vf "scale=1280:-1" -c:v libwebp -quality 85 \
  "/path/to/thumbnails/preview.webp"
```

---

## 🔄 Adapting for Production Environments

While the folder-watcher pattern provides clean decoupling for standalone converter containers, production systems can adapt or swap this architecture based on scale and operational preference:

### 💡 Production Customization Patterns:

1. **Admin Panel Button-Triggered Workflows**:
   - Replace the persistent folder watcher with an explicit API action in the Strapi Admin Panel or Next.js admin UI (`POST /api/convert-media`), allowing editors to initiate conversion on demand.

2. **Asynchronous Queue Workers (BullMQ / Redis)**:
   - File uploads push a job to a Redis Queue (BullMQ). Distributed worker nodes process jobs asynchronously and push status updates via WebSockets (`omni-socket`).

3. **Cloud Event Pipelines (AWS S3 / Lambda / Cloudflare Stream)**:
   - Direct-to-S3 uploads trigger Lambda functions or AWS Elemental MediaConvert, posting completion webhooks back to the CMS.

---

## 🚀 Setup & Execution

### Prerequisites:
- Node.js >= 18
- `ffmpeg` and `ffprobe` installed and available in system `PATH`.

### Commands:
```bash
cd /root/omni-root/example_converter_lxc
npm install

# Single-pass execution over /mnt/media/in:
node process-videos.js

# Persistent Watcher Service:
node watch-and-process.js
```

### PM2 Process Configuration (`ecosystem.config.js`):
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
