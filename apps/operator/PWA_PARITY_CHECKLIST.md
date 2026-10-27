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

**Current state:** UI parity is partial. Real driver operations remain blocked by disabled live actions, undelivered backend acceptance guard and missing background push. Do not market as ready for passenger operation.
