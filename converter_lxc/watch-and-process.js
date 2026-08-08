// /root/converter_lxc/watch-and-process.js (ESM)
// High-Reliability Queue Watcher for Video Transcoding Pipeline

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import chokidar from 'chokidar';

const IN_DIR = process.env.MEDIA_IN_DIR || (fs.existsSync('/root/media/in') ? '/root/media/in' : '/mnt/media/in');
const PROCESS_SCRIPT = process.env.PROCESS_SCRIPT_PATH || path.join(path.dirname(new URL(import.meta.url).pathname), 'process-videos.js');
const LOCK_FILE = '/tmp/converter_runner.lock';

function log(msg) {
  console.log(`[${new Date().toISOString()}] [Watcher] ${msg}`);
}

log(`👀 Monitoring input directory: ${IN_DIR}`);
log(`⚙️ Using conversion script: ${PROCESS_SCRIPT}`);

// Ensure IN_DIR exists
if (!fs.existsSync(IN_DIR)) {
  fs.mkdirSync(IN_DIR, { recursive: true });
}

// Clean stale lockfile on startup if older than 30 minutes
if (fs.existsSync(LOCK_FILE)) {
  try {
    const stats = fs.statSync(LOCK_FILE);
    if (Date.now() - stats.mtimeMs > 30 * 60 * 1000) {
      fs.unlinkSync(LOCK_FILE);
      log('🧹 Stale lockfile removed on startup.');
    }
  } catch (e) {}
}

let isRunning = false;

function triggerConverter() {
  if (isRunning || fs.existsSync(LOCK_FILE)) {
    return;
  }

  isRunning = true;
  try {
    fs.writeFileSync(LOCK_FILE, String(process.pid));
  } catch (e) {}

  log('🚀 Launching video converter worker loop...');

  exec(`node "${PROCESS_SCRIPT}"`, { maxBuffer: 50 * 1024 * 1024 }, (error, stdout, stderr) => {
    try {
      if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE);
    } catch (e) {}

    isRunning = false;

    if (error) {
      log(`⚠️ Worker exited with status: ${error.message}`);
    } else {
      log('✅ Worker processing run finished.');
    }

    if (stdout) console.log(stdout.trim());
    if (stderr) console.error(stderr.trim());

    // Check if there are still unprocessed files in IN_DIR
    try {
      const remainingFiles = fs.readdirSync(IN_DIR).filter(f => !f.startsWith('.') && !f.endsWith('.tmp') && !f.endsWith('.part') && f !== 'failed');
      if (remainingFiles.length > 0) {
        log(`🔄 ${remainingFiles.length} files remaining in queue. Triggering next worker batch...`);
        setTimeout(triggerConverter, 1000);
      }
    } catch (e) {}
  });
}

// Initialize Chokidar Watcher
const watcher = chokidar.watch(IN_DIR, {
  persistent: true,
  ignoreInitial: false,
  depth: 0,
  awaitWriteFinish: {
    stabilityThreshold: 3000,
    pollInterval: 500,
  },
});

watcher.on('add', (filePath) => {
  const filename = path.basename(filePath);
  if (filename.startsWith('.') || filename.endsWith('.tmp') || filename.endsWith('.part') || filename === 'failed') {
    return;
  }
  log(`📥 New video detected and write stabilized: ${filename}`);
  triggerConverter();
});

watcher.on('change', (filePath) => {
  const filename = path.basename(filePath);
  if (!filename.startsWith('.') && !filename.endsWith('.tmp') && !filename.endsWith('.part') && filename !== 'failed') {
    log(`📝 File modification finished: ${filename}`);
    triggerConverter();
  }
});

watcher.on('error', (err) => {
  log(`⚠️ Watcher error: ${err.message}`);
});

// Run once on startup to pick up any existing un-processed files
triggerConverter();
