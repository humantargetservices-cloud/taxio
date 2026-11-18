# TAXIO Alert Companion

A separate native alert-only companion for the existing TAXIO platform.

## Architecture

TAXIO MAIN remains the existing backend and PWA.

- Existing Web Push stays as fallback.
- Native Push is the primary alert path.
- Android: horn + vibration + ongoing alert for up to the authoritative 49-second request window.
- iOS: time-sensitive native alert with a short sound and a second alert if still pending.
- Tapping the native alert opens the existing TAXIO PWA.

## Strict scope

TAXIO Alert is a separate app:

- Android package: `be.taxio.alert`
- iOS bundle: `be.taxio.alert`
- It must never replace or upgrade TAXIO Operator.
- TAXIO Operator remains independent.
- TAXIO PWA remains the actual trip UI.

The companion only:
1. signs in with the existing TAXIO account;
2. registers this phone for native alerts;
3. raises the urgent Company A / Rescue alert;
4. stops when the request is no longer actionable or the 49-second deadline expires;
5. opens the existing TAXIO PWA when tapped.

It does not implement Accept/Decline business logic, Rescue winner logic, maps, pricing, WhatsApp, dashboard, history, earnings or trip management.

## Push setup

Because this is a separate Android app, Firebase must contain a separate Android registration for:

`be.taxio.alert`

Its generated `google-services.json` belongs only in this folder before a real native-push APK is built.

Do not reuse TAXIO Operator's `be.taxio.operator` Firebase config.

The Expo/EAS project must also be initialized specifically for `taxio-alert-companion`; its project ID replaces `SET_WITH_EAS_INIT` in `app.json`.

## Safety boundary

Do not change root PWA `src/`.
Do not replace OneSignal Web Push.
Do not change booking/Rescue business logic.
Do not change WhatsApp.
The existing 49-second server lifecycle remains authoritative.
