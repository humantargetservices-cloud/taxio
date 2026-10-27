# TAXIO Operator PWA parity — 27 October 2026

## Product rule
The web company dashboard remains authoritative for company profile, pricing, vehicle setup, availability and administration. The native Android app should reuse the same server-side booking, rescue and journey state, not create a parallel dispatcher.

## UI parity
- Incoming offer: dark/navy card, gold title, route, estimated fare, scheduled time, expiry progress and prominent gold acceptance control. Present in Android; check dimensions and actual countdown duration against server deadline.
- Home: company identity, live requests, active journeys, rescue count. Present.
- Bookings: active, historical, time-limited offer states. Present; needs device validation.
- Journey: pickup/destination, navigation via Waze/Google, driver progress and passenger contacts. Present, live actions disabled.
- Rescue: company-specific eligible offers, expiry, accept and confirmation. Partial; live verification blocked.
- Company profile/pricing/vehicle configuration: web-only by product decision.

## Notification policy
1. The PWA and native Android app may each observe the same booking if both are running; they are distinct clients. Do not have both apps independently generate multiple notifications on the same phone in a driver pilot.
2. Android foreground: one in-app incoming-offer sheet. Do not also schedule a duplicate local OS notification.
3. Offer de-duplication key is `bookingRequestId:decisionDeadlineAt`, not booking ID alone.
4. Synchronization is serialized to avoid simultaneous realtime + polling events producing duplicates.
5. Background/closed-app: a future **server push sender** will send at most one event per offer revision and installation, with token registration, delivery receipts and expirations; not implemented.
6. On notification click, refetch authenticated company-scoped server state. Never accept directly from untrusted push data.

## Operational parity acceptance criteria
- New valid request from PWA appears once in Android; fare, route and deadline match.
- Duplicate realtime events and polling ticks do not repeat offers.
- Expired/accepted offers do not reappear as actionable.
- Android acceptance and PWA acceptance are mutually consistent; duplicate accept returns conflict.
- Trip status updates reflect correctly in both clients; dual-confirmation completion must be verified.
- Rescue winner/confirmation and privacy operate identically across clients.
- Background pushes, recovery after offline, revoked auth and company changes covered.
- No main branch changes without explicit production approval.

**Current state (27 October 2026, operator-mobile):**
- Driver UI: Home, Requests, Trip, Rescue, More. Server deadline countdown. Demo mode is labeled and does not claim a server accept.
- Booking classification: `new` is actionable only with a future `decision_deadline_at`. Rescue uses `OFFERED` (legacy `pending` still recognized).
- Accept, decline, rescue claim and trip progress call `/api/rescue` only when `EXPO_PUBLIC_API_BASE_URL` is a non-production HTTPS host and `EXPO_PUBLIC_ENABLE_LIVE_ACTIONS=true`. This committed build leaves that flag unset.
- The operator-mobile copy of `api/rescue.js` rejects an expired booking accept. That guard is not on `main` and must not be deployed by merging this branch.
- Development builds refuse `taxio.be` and the production Supabase host. The Android workflow no longer embeds them.
- Closed-app push is not implemented. Device tokens are not uploaded.
- Live login, accept, rescue and an installable APK still need a verified staging key and a device build. Do not treat this as ready for passenger operation.
