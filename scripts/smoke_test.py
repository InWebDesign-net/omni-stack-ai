#!/usr/bin/env python3
import urllib.request
import sys
import time

ENDPOINTS = [
    ("Web Homepage", "http://127.0.0.1:3000/"),
    ("Web Videos Page", "http://127.0.0.1:3000/videos"),
    ("Web Images Page", "http://127.0.0.1:3000/images"),
    ("Web Image List API", "http://127.0.0.1:3000/api/content/image/list"),
    ("Web Notifications API", "http://127.0.0.1:3000/api/notifications"),
    ("Web Comments API", "http://127.0.0.1:3000/api/comments?slug=test"),
    ("CMS Health Endpoint", "http://127.0.0.1:1337/_health"),
]

def run_smoke_test():
    print("🔍 Starting Omni Stack Smoke Test...")
    failed = False
    for label, url in ENDPOINTS:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Omni-SmokeTest/1.0"})
            with urllib.request.urlopen(req, timeout=5) as resp:
                status = resp.getcode()
                if status in (200, 204):
                    print(f"  ✅ {label} ({url}) -> HTTP {status}")
                else:
                    print(f"  ❌ {label} ({url}) -> Unexpected HTTP {status}")
                    failed = True
        except Exception as e:
            print(f"  ❌ {label} ({url}) -> Failed: {e}")
            failed = True

    if failed:
        print("💥 Smoke Test FAILED! Check PM2 logs or server errors.")
        sys.exit(1)
    else:
        print("🎉 Smoke Test PASSED! All key endpoints are healthy.")
        sys.exit(0)

if __name__ == "__main__":
    time.sleep(1)
    run_smoke_test()
