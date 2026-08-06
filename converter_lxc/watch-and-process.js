// /root/converter_lxc/watch-and-process.js (ESM)
// Watches /root/media/in (or /mnt/media/in) and triggers conversion instantly upon upload completion.

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import chokidar from 'chokidar';

const IN_DIR = process.env.MEDIA_IN_DIR || (fs.existsSync('/root/media/in') ? '/root/media/in' : '/mnt/media/in');
const PROCESS_SCRIPT = process.env.PROCESS_SCRIPT_PATH || path.join(path.dirname(new URL(import.meta.url).pathname), 'process-videos.js');

let isProcessing = false;
let queuedTrigger = false;

function log(msg) {
  console.log(`[${new Date().toISOString()}] [Watcher] ${msg}`);
}

log(`👀 Monitoring input directory: ${IN_DIR}`);
log(`⚙️ Using conversion script: ${PROCESS_SCRIPT}`);

// Ensure IN_DIR exists
if (!fs.existsSync(IN_DIR)) {
  fs.mkdirSync(IN_DIR, { recursive: true });
}

function runConverter() {
  if (isProcessing) {
    queuedTrigger = true;
    log('⏳ Conversion worker is currently busy. Queued next run.');
    return;
  }

  isProcessing = true;
  queuedTrigger = false;

  log('🚀 Executing video processing pipeline...');

  exec(`node "${PROCESS_SCRIPT}"`, (error, stdout, stderr) => {
    if (error) {
      log(`❌ Execution error: ${error.message}`);
    }
    if (stdout) {
      console.log(stdout.trim());
    }
    if (stderr) {
      console.error(stderr.trim());
    }

    isProcessing = false;
    log('✅ Processing run finished.');

    if (queuedTrigger) {
      log('🔄 Processing queued items...');
      setTimeout(runConverter, 1000);
    }
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
  if (filename.startsWith('.') || filename.endsWith('.tmp') || filename.endsWith('.part')) {
    return;
  }
  log(`📥 New file detected and write stabilized: ${filename}`);
  runConverter();
});

watcher.on('change', (filePath) => {
  const filename = path.basename(filePath);
  if (!filename.startsWith('.') && !filename.endsWith('.tmp') && !filename.endsWith('.part')) {
    log(`📝 File modification finished: ${filename}`);
    runConverter();
  }
});

watcher.on('error', (err) => {
  log(`⚠️ Watcher error: ${err.message}`);
});

// Run once on startup to pick up any existing un-processed files
runConverter();
