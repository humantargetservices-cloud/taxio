# TAXIO Alert Companion

Small native alert companion for the existing TAXIO PWA.

## Mobile identity

This companion intentionally reuses the existing TAXIO Operator mobile identity:

- Expo project: `taxio-platform`
- Android package: `be.taxio.operator`
- iOS bundle: `be.taxio.operator`
- existing Firebase Android registration
- existing TAXIO alert sound: `taxio_offer.wav`

That means the pilot APK can replace/upgrade the old TAXIO Operator installation instead of asking drivers to keep two native apps. The old Operator UI/business logic is **not** reused.

## Purpose

This app does only four things:

1. Sign in with the existing TAXIO company account.
2. Register this phone for native urgent-trip alerts.
3. On Android, turn the high-priority native push into an ongoing looping foreground-service alert until the request ends or its authoritative 49-second deadline expires.
4. Open the existing TAXIO PWA when the driver taps the alert.

It does **not** implement booking acceptance, Rescue winner logic, trip management, maps, pricing, WhatsApp, or a second company dashboard.

## Architecture

The existing company push outbox remains the event source.

- Existing OneSignal Web Push remains unchanged and stays as fallback.
- Native delivery is a best-effort side-send to registered companion devices.
- Android receives a high-priority data push and creates the foreground alert locally.
- iOS receives a time-sensitive native notification using the TAXIO alert sound.
- At roughly 25 seconds remaining, the existing server timeout worker emits one deduplicated reminder: Web Push receives it, and iOS receives a second native alert. Android does not restart because the initial foreground alert is already continuous.
- Android polls a short-lived signed status URL so Accept, Reject, Rescue winner, cancellation, or expiry stops the alert without creating a second trip lifecycle.

## Build configuration

Set these public build variables:

```
EXPO_PUBLIC_SUPABASE_URL=<production TAXIO Supabase URL>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<production TAXIO publishable/anon key>
EXPO_PUBLIC_TAXIO_API_ORIGIN=https://www.taxio.be
```

Firebase public Android configuration is in `google-services.json`. Private FCM service-account credentials remain outside Git.

## Pilot build

```bash
npm install
npx expo install --check
npx expo prebuild --platform android --no-install
cd android
./gradlew assembleRelease
```

## Required real-phone tests

Android:
- app visible
- app minimized
- Uber/Waze active
- phone locked
- Company A alert loops
- Rescue alert loops
- tap opens exact TAXIO request in PWA
- Accept / Reject / expiry stops alert
- Rescue winner stops losing phone
- next request still works

iOS:
- foreground/background/locked native delivery
- time-sensitive notification
- TAXIO custom sound
- second alert if still actionable around 25 seconds remaining
- tap opens exact PWA request
- stale request does not remain actionable

## Safety boundary

Do not move companion code into root PWA `src/`.
Do not replace OneSignal Web Push.
Do not change booking/Rescue business logic.
The server 49-second lifecycle remains authoritative.
