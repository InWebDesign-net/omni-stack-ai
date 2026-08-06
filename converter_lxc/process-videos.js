// /root/converter_lxc/process-videos.js (ESM)
// Complete Node 22 Video Transcoding Pipeline

import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import ffmpeg from 'fluent-ffmpeg';
import { promisify } from 'util';
import { exec as _exec } from 'child_process';
import fetch from 'node-fetch';

const execAsync = promisify(_exec);

// Path configuration (auto-detected or overridable via env)
const IN_DIR = process.env.MEDIA_IN_DIR || (fs.existsSync('/root/media/in') ? '/root/media/in' : '/mnt/media/in');
const OUT_DIR = process.env.MEDIA_OUT_DIR || (fs.existsSync('/root/media/out') ? '/root/media/out' : '/mnt/media/out');

const WATERMARK = process.env.WATERMARK_PATH || '/opt/video-utils/watermark.png';
const OG_WATERMARK = process.env.OG_WATERMARK_PATH || '/opt/video-utils/og_watermark.png';
const STRAPI_URL = process.env.STRAPI_URL || 'https://omni-cms.inwebdesign.net';

const ALLOWED_EXTENSIONS = [
  'mp4', 'mkv', 'avi', 'mov', 'flv', 'webm',
  'ts', 'mpeg', 'mpg', 'vob', 'mv4', 'm4v', '3gp'
];

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
}

async function getDuration(filePath) {
  try {
    const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
    const { stdout } = await execAsync(cmd);
    return parseFloat(stdout.trim()) || 0;
  } catch (e) {
    return 0;
  }
}

async function getHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = fs.createReadStream(filePath, { highWaterMark: 16 * 1024 * 1024 });
    stream.on('data', (c) => hash.update(c));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

// 1. Primary MP4 Transcoding with QSV / GPU or libx264 Fallback
async function convertVideo(input, output) {
  // Try QSV Hardware Acceleration first
  const qsvCmd = `LD_LIBRARY_PATH=/usr/local/ffmpeg-qsv/lib /usr/local/ffmpeg-qsv/bin/ffmpeg -y \
  -init_hw_device qsv=hw:0 -filter_hw_device hw \
  -hwaccel qsv -hwaccel_output_format qsv \
  -i "${input}" \
  -vf 'format=nv12,hwupload' \
  -c:v h264_qsv -preset fast -look_ahead 0 -b:v 3000k \
  -c:a aac -b:a 128k "${output}"`;

  try {
    await execAsync(qsvCmd);
    log(`✅ QSV Hardware conversion succeeded for: ${path.basename(input)}`);
    return true;
  } catch (err) {
    log(`⚠️ QSV Hardware encoding unavailable. Falling back to libx264 CPU...`);
    const fallbackCmd = `ffmpeg -y -hide_banner -loglevel error -i "${input}" \
      -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k "${output}"`;
    try {
      await execAsync(fallbackCmd);
      log(`✅ CPU libx264 conversion succeeded for: ${path.basename(input)}`);
      return true;
    } catch (fallbackErr) {
      log(`❌ CPU Conversion failed: ${fallbackErr.message}`);
      return false;
    }
  }
}

// 2. Extract 6 Thumbnails with Auto-Grid
async function createThumbnails(filePath, slug) {
  const thumbDir = path.join(OUT_DIR, 'thumbnails');
  fs.mkdirSync(thumbDir, { recursive: true });

  const duration = await getDuration(filePath);
  const safeDuration = Math.max(0.1, duration - 0.5);
  const fps = safeDuration > 0 ? (6 / safeDuration) : 6;

  const hasWatermark = fs.existsSync(WATERMARK);

  return new Promise((resolve, reject) => {
    let proc = ffmpeg(filePath);
    if (hasWatermark) {
      proc = proc.addInput(WATERMARK).complexFilter([
        '[0:v]split=2[rawbg][rawfg]',
        '[rawbg]scale=640:360:force_original_aspect_ratio=increase,crop=640:360,gblur=sigma=24[bg]',
        '[rawfg]scale=640:360:force_original_aspect_ratio=decrease[fg]',
        '[1:v]scale=-1:40[wm]',
        '[bg][fg]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2[comp]',
        `[comp][wm]overlay=10:10,fps=${fps}`
      ]);
    } else {
      proc = proc.complexFilter([
        '[0:v]split=2[rawbg][rawfg]',
        '[rawbg]scale=640:360:force_original_aspect_ratio=increase,crop=640:360,gblur=sigma=24[bg]',
        '[rawfg]scale=640:360:force_original_aspect_ratio=decrease[fg]',
        `[bg][fg]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2,fps=${fps}`
      ]);
    }

    proc
      .output(path.join(thumbDir, `${slug}-%d.png`))
      .frames(6)
      .on('end', resolve)
      .on('error', (err) => {
        log(`⚠️ Thumbnail filter error, using simple snapshot fallback: ${err.message}`);
        ffmpeg(filePath)
          .screenshots({
            count: 6,
            folder: thumbDir,
            filename: `${slug}-%i.png`,
            size: '640x360',
          })
          .on('end', resolve)
          .on('error', reject);
      })
      .run();
  });
}

// 3. Create 1200x630 OpenGraph Share Image
async function createOgImage(filePath, slug) {
  const ogDir = path.join(OUT_DIR, 'og');
  fs.mkdirSync(ogDir, { recursive: true });
  const outPath = path.join(ogDir, `${slug}.jpg`);
  const tmpPng = path.join(ogDir, `${slug}.tmp.png`);

  const duration = await getDuration(filePath);
  const t = Math.max(0.1, duration > 0 ? duration / 2 : 2);

  const hasWm = fs.existsSync(OG_WATERMARK);

  // Extract single frame
  await new Promise((res, rej) => {
    ffmpeg(filePath)
      .setStartTime(t)
      .noAudio()
      .outputOptions(['-frames:v', '1', '-update', '1', '-y'])
      .output(tmpPng)
      .on('end', res)
      .on('error', rej)
      .run();
  });

  // Composite frame to 1200x630 JPG
  await new Promise((res, rej) => {
    let proc = ffmpeg().input(tmpPng);
    if (hasWm) {
      proc = proc
        .input(OG_WATERMARK)
        .complexFilter([
          '[0:v]scale=1200:630:force_original_aspect_ratio=decrease,pad=1200:630:(ow-iw)/2:(oh-ih)/2:black[bg]',
          '[1:v]scale=-1:60[wm]',
          '[bg][wm]overlay=10:main_h-overlay_h-10[out]'
        ])
        .outputOptions(['-map', '[out]']);
    } else {
      proc = proc.complexFilter([
        '[0:v]scale=1200:630:force_original_aspect_ratio=decrease,pad=1200:630:(ow-iw)/2:(oh-ih)/2:black[out]'
      ]).outputOptions(['-map', '[out]']);
    }

    proc
      .noAudio()
      .output(outPath)
      .outputOptions(['-frames:v', '1', '-q:v', '2', '-pix_fmt', 'yuvj420p', '-f', 'mjpeg'])
      .on('end', res)
      .on('error', rej)
      .run();
  });

  try { fs.unlinkSync(tmpPng); } catch (e) {}
  return outPath;
}

// 4. Adaptive Bitrate (ABR) HLS Stream Generation
async function createHLS(inputPath, baseName) {
  const finalHlsDir = path.join(OUT_DIR, 'hls', baseName);
  const tempHlsDir = path.join('/tmp/hls_processing', baseName);

  if (fs.existsSync(finalHlsDir)) {
    log(`[Skip] HLS stream already exists for ${baseName}`);
    return;
  }

  // Get video dimensions
  let origH = 1080;
  let origW = 1920;
  try {
    const cmdMeta = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${inputPath}"`;
    const { stdout: metaOut } = await execAsync(cmdMeta);
    const [w, h] = metaOut.trim().split(',').map((n) => parseInt(n, 10));
    if (w && h) {
      origW = w;
      origH = h;
    }
  } catch (e) {}

  const ratio = origW / origH;
  const is16_9 = ratio > 1.7 && ratio < 1.8;

  // Check audio stream presence
  let hasAudio = false;
  try {
    const cmdAudio = `ffprobe -v error -select_streams a:0 -show_entries stream=codec_type -of csv=p=0 "${inputPath}"`;
    const { stdout: audioOut } = await execAsync(cmdAudio);
    if (audioOut.trim().toLowerCase() === 'audio') {
      hasAudio = true;
    }
  } catch (err) {
    hasAudio = false;
  }

  const renditions = [];
  if (origH >= 1080) {
    renditions.push({ name: '1080p', w: 1920, h: 1080, vb: '5000k', maxb: '5300k', buf: '7500k', ab: '128k' });
  }
  if (origH >= 720) {
    renditions.push({ name: '720p', w: 1280, h: 720, vb: '2800k', maxb: '3000k', buf: '4200k', ab: '128k' });
  }
  renditions.push({ name: '480p', w: 854, h: 480, vb: '1400k', maxb: '1500k', buf: '2100k', ab: '96k' });

  fs.mkdirSync(tempHlsDir, { recursive: true });
  renditions.forEach((r) => fs.mkdirSync(path.join(tempHlsDir, r.name), { recursive: true }));

  let filterComplex = '';
  if (!is16_9) {
    filterComplex += `[0:v]split=2[bg][fg];`;
    filterComplex += `[bg]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,gblur=sigma=20[bg_blur];`;
    filterComplex += `[fg]scale=1920:1080:force_original_aspect_ratio=decrease[fg_scaled];`;
    filterComplex += `[bg_blur][fg_scaled]overlay=(W-w)/2:(H-h)/2[master];`;
  } else {
    filterComplex += `[0:v]null[master];`;
  }

  const splitBlocks = renditions.map((_, i) => `[v${i}]`).join('');
  filterComplex += `[master]split=${renditions.length}${splitBlocks};`;

  let mapString = '';
  let varStreamMap = '';

  renditions.forEach((r, i) => {
    filterComplex += `[v${i}]scale=w=${r.w}:h=${r.h}[v${i}out];`;
    mapString += `-map "[v${i}out]" -c:v:${i} libx264 -b:v:${i} ${r.vb} -maxrate:v:${i} ${r.maxb} -bufsize:v:${i} ${r.buf} `;

    if (hasAudio) {
      mapString += `-map a:0 -c:a:${i} aac -b:a:${i} ${r.ab} `;
      varStreamMap += `v:${i},a:${i},name:${r.name} `;
    } else {
      varStreamMap += `v:${i},name:${r.name} `;
    }
  });

  filterComplex = filterComplex.slice(0, -1);

  const ffmpegCmd = `ffmpeg -hide_banner -loglevel error \
    -i "${inputPath}" \
    -filter_complex "${filterComplex}" \
    ${mapString} \
    -g 48 -keyint_min 48 -sc_threshold 0 \
    -hls_time 6 \
    -hls_playlist_type vod \
    -master_pl_name master.m3u8 \
    -var_stream_map "${varStreamMap.trim()}" \
    -hls_segment_filename "${tempHlsDir}/%v/segment_%03d.ts" \
    "${tempHlsDir}/%v/index.m3u8"`;

  log(`🌊 Generating ABR HLS stream for ${baseName} (${renditions.length} renditions)...`);

  try {
    await execAsync(ffmpegCmd);
    fs.cpSync(tempHlsDir, finalHlsDir, { recursive: true });
    log(`✅ HLS stream generated successfully for: ${baseName}`);
  } catch (err) {
    log(`⚠️ HLS creation warning: ${err.message}`);
  } finally {
    if (fs.existsSync(tempHlsDir)) {
      fs.rmSync(tempHlsDir, { recursive: true, force: true });
    }
  }
}

// 5. Notify Strapi CMS Endpoint
async function notifyStrapi(slug, duration) {
  try {
    log(`📡 Notifying Strapi CMS ingestion endpoint for slug=${slug}...`);
    const res = await fetch(`${STRAPI_URL}/api/feed/ingest-finalized`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, duration }),
    });

    if (res.ok) {
      const data = await res.json();
      log(`🎉 Strapi ingestion clean success: ${JSON.stringify(data)}`);
    } else {
      const text = await res.text();
      log(`⚠️ Strapi ingestion response ${res.status}: ${text}`);
    }
  } catch (err) {
    log(`⚠️ Strapi notification error: ${err.message}`);
  }
}

// Process Single File
async function processFile(filePath) {
  const filename = path.basename(filePath);
  const ext = path.extname(filename).slice(1).toLowerCase();
  const base = path.basename(filename, path.extname(filename));
  const outputPath = path.join(OUT_DIR, base + '.mp4');

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    log(`⚠️ Ignoring ${filename} - unsupported extension .${ext}`);
    return;
  }

  const st = fs.statSync(filePath);
  if (st.size === 0) {
    log(`⚠️ Ignoring ${filename} - empty file`);
    return;
  }

  if (fs.existsSync(outputPath)) {
    log(`⏩ Skipping ${filename} - output file already exists`);
    return;
  }

  try {
    await execAsync(`ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of csv=p=0 "${filePath}"`);
  } catch (e) {
    log(`❌ ${filename} has no valid video stream - skipping.`);
    return;
  }

  log(`🚀 Starting transcoding: ${filename} -> ${outputPath}`);

  const success = await convertVideo(filePath, outputPath);
  if (!success) {
    log(`❌ Transcoding failed for ${filename}`);
    if (fs.existsSync(outputPath)) {
      try { fs.unlinkSync(outputPath); } catch (e) {}
    }
    return;
  }

  const hash = await getHash(outputPath);
  const duration = await getDuration(outputPath);

  fs.writeFileSync(path.join(OUT_DIR, base + '.meta'), `hash=${hash}\nduration=${duration}\n`);
  log(`📃 Meta file created: ${base}.meta`);

  await createThumbnails(outputPath, base);
  log(`🖼️ Thumbnails generated for: ${base}`);

  await createOgImage(outputPath, base);
  log(`🖼️ OpenGraph share image created for: ${base}`);

  await createHLS(outputPath, base);
  log(`🌊 HLS adaptive streaming playlist generated for: ${base}`);

  fs.writeFileSync(path.join(OUT_DIR, base + '.done'), '');
  log(`📌 Done marker created: ${base}.done`);

  // Remove source file from IN_DIR
  try {
    fs.unlinkSync(filePath);
    log(`🗑️ Source raw video removed: ${filename}`);
  } catch (e) {}

  const jsonMeta = filePath.replace(path.extname(filePath), '.json');
  if (fs.existsSync(jsonMeta)) {
    try { fs.unlinkSync(jsonMeta); } catch (e) {}
  }

  // Notify Strapi CMS immediately
  await notifyStrapi(base, duration);
}

// Main Execution Loop
(async () => {
  log('--- Starting Video Converter Run ---');
  fs.mkdirSync(IN_DIR, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const entries = fs.readdirSync(IN_DIR, { withFileTypes: true });
  for (const e of entries) {
    if (e.isFile() && !e.name.startsWith('.') && !e.name.endsWith('.tmp') && !e.name.endsWith('.part')) {
      await processFile(path.join(IN_DIR, e.name));
    }
  }
  log('--- Video Converter Run Completed ---');
})();
