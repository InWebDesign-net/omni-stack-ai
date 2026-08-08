#!/usr/bin/env python3
import os
import glob
import time
import json
import urllib.request

OUT_DIR = '/root/media/out'
ENV_FILE = '/root/omni-stack-ai/web/.env.local'

def get_api_token():
    if os.path.exists(ENV_FILE):
        with open(ENV_FILE, 'r') as f:
            for line in f:
                if line.startswith('STRAPI_API_TOKEN='):
                    return line.strip().split('=', 1)[1]
    return ''

def main():
    token = get_api_token()
    print("Auto-Ingest Watcher started... monitoring /root/media/out/")
    
    while True:
        mp4_files = glob.glob(os.path.join(OUT_DIR, '*.mp4'))
        if mp4_files:
            for mp4_path in mp4_files:
                filename = os.path.basename(mp4_path)
                slug = os.path.splitext(filename)[0]

                url = 'http://127.0.0.1:1337/api/feed/ingest-finalized'
                payload = json.dumps({
                    'slug': slug,
                    'workerSecret': 'omni_ingest_worker_secret_2026'
                }).encode('utf-8')

                headers = {'Content-Type': 'application/json'}
                if token:
                    headers['Authorization'] = f"Bearer {token}"

                try:
                    req = urllib.request.Request(url, data=payload, headers=headers)
                    with urllib.request.urlopen(req) as resp:
                        res = json.loads(resp.read().decode('utf-8'))
                        print(f"[Auto Ingest] ✅ Finalized video: {slug}")
                except Exception as e:
                    print(f"[Auto Ingest] Error finalising {slug}: {e}")

        time.sleep(2)

if __name__ == '__main__':
    main()
