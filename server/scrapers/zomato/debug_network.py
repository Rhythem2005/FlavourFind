# save as: debug_network.py
# Run from the same folder as your scraper.py
# Goal: capture and save EVERY json response from Zomato
# so we can see exactly what APIs fire and what they contain

import json
import time
from playwright.sync_api import sync_playwright

def run():
    all_responses = []

    def handle_response(response):
        url = response.url

        # Skip non-Zomato
        if "zomato.com" not in url:
            return

        # Skip static assets
        skip = [".png", ".jpg", ".svg", ".js", ".css",
                ".woff", ".ico", "analytics", "sentry",
                "clarity", "facebook", "google"]
        if any(k in url.lower() for k in skip):
            return

        content_type = response.headers.get("content-type", "")
        if "json" not in content_type:
            return

        try:
            body = response.json()
            size = len(str(body))
            print(f"  📡 [{size:>8} chars] {url}")

            all_responses.append({
                "url": url,
                "size": size,
                "data": body
            })

            # Save every response individually by index
            idx = len(all_responses)
            filename = f"api_{idx:02d}.json"
            with open(filename, "w") as f:
                json.dump({"url": url, "data": body}, f, indent=2)
            print(f"             → saved as {filename}")

        except Exception as e:
            pass

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=False,
            args=["--no-sandbox", "--disable-blink-features=AutomationControlled"]
        )

        context = browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            locale="en-IN",
            timezone_id="Asia/Kolkata",
        )

        page = context.new_page()

        # Attach BEFORE any navigation
        page.on("response", handle_response)

        print("📍 Step 1: Loading Zomato NCR delivery page...")
        page.goto(
            "https://www.zomato.com/ncr/delivery/dish-pizza",
            wait_until="domcontentloaded",
            timeout=20000
        )
        print("   Waiting 4 seconds...")
        time.sleep(4)

        print("\n📜 Step 2: Scrolling to trigger lazy API calls...")
        for i in range(6):
            page.mouse.wheel(0, 600)
            time.sleep(1.5)
            print(f"   Scroll {i+1}/6")

        print("\n⏳ Step 3: Waiting 3 more seconds for network to settle...")
        time.sleep(3)

        print("\n🔒 Closing browser...")
        browser.close()

    # Summary
    print("\n" + "="*60)
    print("CAPTURED API RESPONSES SUMMARY")
    print("="*60)
    if not all_responses:
        print("❌ Zero API responses captured.")
        print("   This means either:")
        print("   1. Page blocked by Cloudflare/bot detection")
        print("   2. Network interceptor issue")
    else:
        print(f"✅ {len(all_responses)} JSON responses captured\n")
        for i, r in enumerate(all_responses, 1):
            print(f"  [{i:02d}] {r['size']:>8} chars → {r['url'][:80]}")

    print("\n📁 Files saved in current directory:")
    print("   api_01.json, api_02.json ... etc")
    print("\n⚡ Next: paste this summary output and")
    print("   run: python3.11 -c \"import json; d=json.load(open('api_01.json')); print(list(d['data'].keys()))\"")
    print("   for whichever file is largest")

if __name__ == "__main__":
    run()