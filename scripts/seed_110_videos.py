#!/usr/bin/env python3
import json
import os
import shutil
import urllib.request
import re
import time

VIDEOS_JSON = '/root/test_videos/videos.json'
TEST_VIDEOS_DIR = '/root/test_videos'
IN_DIR = '/root/media/in'
ENV_FILE = '/root/omni-stack-ai/web/.env.local'
WORKER_SECRET = 'omni_ingest_worker_secret_2026'

def get_api_token():
    if os.path.exists(ENV_FILE):
        with open(ENV_FILE, 'r') as f:
            for line in f:
                if line.startswith('STRAPI_API_TOKEN='):
                    return line.strip().split('=', 1)[1]
    return ''

def clean_slug(text):
    text = text.lower()
    text = text.replace('ä', 'ae').replace('ö', 'oe').replace('ü', 'ue').replace('ß', 'ss')
    text = re.sub(r'[^a-z0-9]+', '-', text).strip('-')
    return text

def main():
    token = get_api_token()
    if not token:
        print("Warning: No STRAPI_API_TOKEN found in .env.local")

    if not os.path.exists(VIDEOS_JSON):
        print(f"Error: {VIDEOS_JSON} not found!")
        return

    os.makedirs(IN_DIR, exist_ok=True)
    
    with open(VIDEOS_JSON, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Pick 110 videos
    videos = data.get('videos', [])[:110]
    print(f"Starting seeding for {len(videos)} test videos...")

    # The 7 Strapi Creator User IDs:
    # 1: Astro, 2: Database Guru (demotech), 3: Culinary Masterclass, 4: Green Planet, 5: Omni Architect, 6: Catmania, 7: FinanzKompass
    creator_ids = [1, 2, 3, 4, 5, 6, 7]

    # Category Tag Pools
    tag_pools = [
        ['Wissenschaft', 'Dokumentation', 'Tech'],
        ['Natur', 'Umwelt', 'Dokumentation'],
        ['Kochen', 'Rezepte', 'Kulinarik'],
        ['Tiere', 'Humor', 'Familie'],
        ['Finanzen', 'Tech', 'Wirtschaft'],
        ['Sport', 'Tech', 'Video Tutorial'],
        ['Ollama', 'NextJS', 'Strapi']
    ]

    created_slugs = []

    for i, v in enumerate(videos):
        vid = v.get('id')
        title = v.get('title') or f"Omni Media Entry {i+1}"
        desc = v.get('description') or title
        raw_file = v.get('downloaded_file')
        creator_id = creator_ids[i % len(creator_ids)]
        tags = tag_pools[i % len(tag_pools)]

        # Generate clean slug
        base_slug = clean_slug(title)[:35].strip('-')
        slug = f"{base_slug}-{vid}" if vid else f"{base_slug}-{i+1}"

        src_path = os.path.join(TEST_VIDEOS_DIR, raw_file)
        dest_path = os.path.join(IN_DIR, f"{slug}.mp4")

        if not os.path.exists(src_path):
            print(f"[{i+1}/{len(videos)}] Warning: Source file {src_path} not found, skipping.")
            continue

        # 1. Copy raw MP4 file to /root/media/in/
        shutil.copyfile(src_path, dest_path)

        # 2. Call Strapi create-video endpoint
        url = 'http://127.0.0.1:1337/api/feed/create-video'
        payload = json.dumps({
            'title': title,
            'slug': slug,
            'tags': tags,
            'userId': creator_id,
            'visibility': 'public',
            'summary': desc
        }).encode('utf-8')

        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f"Bearer {token}"

        req = urllib.request.Request(url, data=payload, headers=headers)
        try:
            with urllib.request.urlopen(req) as response:
                res_data = json.loads(response.read().decode('utf-8'))
                doc_id = res_data.get('documentId')
                created_slugs.append(slug)
                print(f"[{i+1}/{len(videos)}] ✅ Seeded: {slug} (DocID: {doc_id}, Creator User: {creator_id})")
        except Exception as e:
            print(f"[{i+1}/{len(videos)}] ❌ Error creating Strapi record for {slug}: {e}")

    print(f"\nAll {len(created_slugs)} video entries successfully queued into /root/media/in and created in Strapi!")

if __name__ == '__main__':
    main()
