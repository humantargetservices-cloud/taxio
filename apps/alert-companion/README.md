# TAXIO Alert Companion

Small native alert companion for the existing TAXIO PWA.

## Purpose

This app does only four things:

1. Sign in with the existing TAXIO company account.
2. Register this phone for native urgent-trip alerts.
3. On Android, turn a high-priority data push into an ongoing looping foreground-service alert until the request ends or its authoritative 49-second deadline expires.
4. Open the existing TAXIO PWA when the driver taps the alert.

It does **not** implement booking acceptance, Rescue winner logic, trip management, maps, pricing, WhatsApp, or a second company dashboard.

## Architecture

The existing company push outbox remains the event source.

- Existing OneSignal Web Push remains unchanged and is the fallback.
- Native delivery is a best-effort side-send to registered companion devices.
- Android receives a high-priority data-only Expo push and creates the foreground alert locally.
- iOS receives a time-sensitive native notification.
- The Android foreground service polls a short-lived signed status URL so Accept, Reject, Rescue winner, cancellation, or expiry can stop the alert without creating a second trip lifecycle.

## Initial setup

From this directory:

```bash
npm install
npx expo-doctor
npx eas init
```

Set these public build variables:

```
EXPO_PUBLIC_SUPABASE_URL=<same public Supabase URL as TAXIO>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<same public anon key as TAXIO>
EXPO_PUBLIC_TAXIO_API_ORIGIN=https://www.taxio.be
```

Then replace the EAS project placeholder in `app.json`.

Push credentials:
- Android: FCM V1 credentials for `be.taxio.alert`.
- iOS: Apple push credentials for `be.taxio.alert`.

Never commit private Firebase service-account JSON or Apple .p8 credentials.

## Pilot build

Android APK:

```bash
eas build --profile preview --platform android
```

iPhone internal/TestFlight build:

```bash
eas build --profile preview --platform ios
```

## Required real-phone tests

Android:
- app visible
- app minimized
- another app (Uber/Waze) active
- phone locked
- Company A alert loops
- Rescue alert loops
- tap opens exact TAXIO request in PWA
- Accept / Reject / expiry stops alert
- Rescue winner stops losing phone
- next booking still works

iOS:
- foreground/background/locked native delivery
- time-sensitive notification presentation
- sound enabled
- tap opens exact PWA request
- stale request does not remain actionable

## Safety boundary

Do not move companion code into root PWA `src/`.
Do not replace OneSignal Web Push.
Do not change the existing booking/Rescue lifecycle.
Do not add native booking business logic.
