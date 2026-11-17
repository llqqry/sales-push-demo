# Sales Monitor — mobile notification demo

**This is an illustrative sales dashboard only.** The website does not connect to real POS data and does not automatically monitor sales in the background.

## Publish
GitHub repository Settings → Pages → Deploy from a branch → main → /(root) → Save.
Visit https://llqqry.github.io/sales-push-demo/.

## Test on a phone
1. Open the URL. On iPhone, open it in Safari, select Share → Add to Home Screen, and launch from Home Screen.
2. Tap Enable notifications and grant permission.
3. Tap Simulate sales drop. This is a *local notification* while the dashboard is open, not remote closed-site push.

## Add REAL push notifications while the site is CLOSED
1. Create a OneSignal Web Push app at https://onesignal.com/ using Custom Code and the exact HTTPS GitHub Pages site URL.
2. Put the *public OneSignal App ID* in `config.js`. Never put a REST API key in frontend code.
3. The site has `push/onesignal/OneSignalSDKWorker.js`. Configure that worker path and matching scope in OneSignal as required for your site URL. See https://documentation.onesignal.com/docs/en/onesignal-service-worker.
4. Open the site on your phone, enable notifications, and verify the subscription in OneSignal.
5. Close the site, then send a push from the OneSignal dashboard to your subscribed device. For an alternative test, add GitHub Actions secrets `ONESIGNAL_APP_ID` and `ONESIGNAL_REST_API_KEY`, then run the "Send a test sales drop push" workflow with Outlet A. Optional repository variable `SITE_URL` makes notifications open the correct page.

**Caution:** The demo sender targets *all* users subscribed to this test app. Do not use real customer data or secrets in this public GitHub repository. Real POS data needs a secure backend; a scheduled monitoring job and alert deduplication would be separate production steps.
