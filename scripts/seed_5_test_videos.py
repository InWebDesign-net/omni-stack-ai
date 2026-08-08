#!/usr/bin/env python3
import json
import os
import shutil
import urllib.request
import re

VIDEOS_JSON = '/root/test_videos/videos.json'
TEST_VIDEOS_DIR = '/root/test_videos'
IN_DIR = '/root/media/in'
ENV_FILE = '/root/omni-stack-ai/web/.env.local'

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

    videos = data.get('videos', [])[:5]
    print(f"Loaded {len(videos)} test videos from {VIDEOS_JSON}")

    # Map Creators across Users (IDs: 1..7)
    creator_ids = [6, 4, 1, 5, 2] # catmania, greenplanet, astro, omniarchitect, demotech

    # Map default tags for the test batch
    tag_sets = [
        ['Tiere', 'Humor', 'Natur'],
        ['Natur', 'Wissenschaft', 'Dokumentation'],
        ['Wissenschaft', 'Natur', 'Dokumentation'],
        ['Wissenschaft', 'Dokumentation', 'Tech'],
        ['Sport', 'Tech', 'Video Tutorial']
    ]

    for i, v in enumerate(videos):
        vid = v.get('id')
        title = v.get('title') or f"Test Video {i+1}"
        desc = v.get('description') or title
        raw_file = v.get('downloaded_file')
        creator_id = creator_ids[i % len(creator_ids)]
        tags = tag_sets[i % len(tag_sets)]

        # Generate clean ascii slug
        base_slug = clean_slug(title)[:40].strip('-')
        slug = f"{base_slug}-{vid}" if vid else f"{base_slug}-{i+1}"

        src_path = os.path.join(TEST_VIDEOS_DIR, raw_file)
        dest_path = os.path.join(IN_DIR, f"{slug}.mp4")

        if not os.path.exists(src_path):
            print(f"[{i+1}/5] Warning: Source file {src_path} not found, skipping.")
            continue

        # 1. Copy raw MP4 to /root/media/in/
        shutil.copyfile(src_path, dest_path)
        print(f"[{i+1}/5] Copied raw MP4 to {dest_path}")

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
                print(f"[{i+1}/5] ✅ Strapi Entry Created! DocumentID: {doc_id}, Slug: {slug}, Creator User ID: {creator_id}")
        except Exception as e:
            print(f"[{i+1}/5] ❌ Error creating Strapi record for {slug}: {e}")

if __name__ == '__main__':
    main()
