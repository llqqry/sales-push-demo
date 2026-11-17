#!/usr/bin/env python3
"""Manual demo sender: sends a genuine push via OneSignal."""
import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path

def main():
    app_id=os.getenv("ONESIGNAL_APP_ID","").strip()
    api_key=os.getenv("ONESIGNAL_REST_API_KEY","").strip()
    if not app_id or not api_key:
        sys.exit("Missing ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY in GitHub Actions secrets")
    items=json.loads(Path("data/sales.json").read_text(encoding="utf-8"))["outlets"]
    outlet_id=os.getenv("DEMO_OUTLET_ID","A").upper()
    matches=[o for o in items if o["id"]==outlet_id]
    if not matches: sys.exit("Unknown outlet ID: "+outlet_id)
    o=matches[0]
    drop=(o["lastWeek"]-o["today"])/o["lastWeek"]*100 if o["lastWeek"]>0 else 0
    if drop<20: sys.exit(f"No alert: drop {drop:.1f}% is less than 20%. Choose Outlet A.")
    body=f'{o["name"]} sales fell {drop:.1f}% vs last week. Now S${o["today"]:,.0f}, previous S${o["lastWeek"]:,.0f}.'
    payload={"app_id":app_id,"target_channel":"push","included_segments":["Subscribed Users"],
             "headings":{"en":"Sales Drop Alert - "+o["name"]},"contents":{"en":body},
             "name":"Sales Monitor Demo"}
    url=os.getenv("SITE_URL","").strip()
    if url.startswith("https://"):payload["url"]=url
    req=urllib.request.Request("https://api.onesignal.com/notifications",
       data=json.dumps(payload).encode(),headers={"Content-Type":"application/json","Authorization":"Key "+api_key},method="POST")
    try:
        with urllib.request.urlopen(req,timeout=25) as response:
            result=json.load(response);print(result)
            if not result.get("id"): sys.exit("OneSignal did not return a notification ID.")
    except urllib.error.HTTPError as e:
        sys.exit(f"OneSignal HTTP {e.code}: {e.read().decode()}")
if __name__=="__main__":main()
