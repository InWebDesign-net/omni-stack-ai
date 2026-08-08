#!/usr/bin/env python3
import os
import glob
import subprocess
import json
import urllib.request
import shutil
import sys

IN_DIR = '/root/media/in'
OUT_DIR = '/root/media/out'
ENV_FILE = '/root/omni-stack-ai/web/.env.local'
WORKER_SECRET = 'omni_ingest_worker_secret_2026'

def get_api_token():
    if os.path.exists(ENV_FILE):
        with open(ENV_FILE, 'r') as f:
            for line in f:
                if line.startswith('STRAPI_API_TOKEN='):
                    return line.strip().split('=', 1)[1]
    return ''

def main():
    token = get_api_token()
    os.makedirs(os.path.join(OUT_DIR, 'thumbnails'), exist_ok=True)
    os.makedirs(os.path.join(OUT_DIR, 'og'), exist_ok=True)

    files = sorted(glob.glob(os.path.join(IN_DIR, '*.mp4')))
    total = len(files)
    print(f"Starting batch video processing for {total} files in /root/media/in/...")

    processed = 0
    errors = 0

    for i, src_mp4 in enumerate(files):
        filename = os.path.basename(src_mp4)
        slug = os.path.splitext(filename)[0]

        # 1. Get video duration via ffprobe
        duration = 15
        try:
            res = subprocess.check_output(['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', src_mp4])
            info = json.loads(res)
            duration = int(float(info.get('format', {}).get('duration', 15)))
        except Exception as e:
            pass

        # 2. Extract thumbnail frame via ffmpeg
        thumb_path = os.path.join(OUT_DIR, 'thumbnails', f'{slug}-1.png')
        try:
            subprocess.call(
                ['ffmpeg', '-y', '-ss', '00:00:01', '-i', src_mp4, '-vframes', '1', '-vf', 'scale=640:-1', thumb_path],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
        except Exception as e:
            pass

        # 3. Copy MP4 to OUT_DIR & write meta
        out_mp4 = os.path.join(OUT_DIR, f'{slug}.mp4')
        meta_path = os.path.join(OUT_DIR, f'{slug}.meta')
        try:
            shutil.copyfile(src_mp4, out_mp4)
            with open(meta_path, 'w') as f:
                f.write(f'duration={duration}\n')
        except Exception as e:
            print(f"[{i+1}/{total}] Error copying to out: {e}")

        # 4. Call Strapi ingestFinalizedVideo endpoint
        url = 'http://127.0.0.1:1337/api/feed/ingest-finalized'
        payload = json.dumps({
            'slug': slug,
            'duration': duration,
            'workerSecret': WORKER_SECRET
        }).encode('utf-8')

        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f"Bearer {token}"

        try:
            req = urllib.request.Request(url, data=payload, headers=headers)
            with urllib.request.urlopen(req) as resp:
                res = json.loads(resp.read().decode('utf-8'))
                processed += 1
                print(f"[{i+1}/{total}] ✅ Processed: {slug} (Duration: {duration}s)")
        except Exception as e:
            errors += 1
            print(f"[{i+1}/{total}] ❌ Ingest Error for {slug}: {e}")

        # Remove raw input file after ingestion
        try:
            if os.path.exists(src_mp4):
                os.remove(src_mp4)
        except Exception as e:
            pass

    print(f"\nBatch processing complete! Processed: {processed}/{total}, Errors: {errors}")

if __name__ == '__main__':
    main()
