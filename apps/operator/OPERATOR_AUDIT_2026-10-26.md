# TAXIO Operator mobile audit — 2026-10-26

## Isolation
- All fixes made on `operator-mobile`, never merged to `main`.
- GitHub pilot workflow triggers only on `operator-mobile`.
- No production website or database write was executed during this audit.
- APK uses production Supabase for **company-scoped reads**, so mobile still depends on production availability and row permissions.

## Corrected this session
- Offer detection now keys by `bookingRequestId:decisionDeadlineAt`, so a previously known booking activated later is eligible for an alert.
- Alert text no longer leaks pickup/destination addresses on the Android lock screen.
- Removed obsolete local availability state (not authoritative).

## Previously corrected on mobile branch
- JSX syntax error at availability indicator.
- Live offers separated from expired/inactive `new` rows.
- Notification tap reloads server state before displaying actionable request.
- Realtime booking/rescue refresh, polling fallback and visible refresh errors.
- Authenticated action handler refreshes expiring JWT and retries once after 401.
- PWA-inspired dark UI, contextual trip bottom sheet and Waze / Google Maps picker.
- Completed journey receipt displayed only after server `completed_at` was observed.
- Guarded rescue claim UI; existing protected API used only when live flag enabled.

## Verified by inspection / read-only database queries
- `booking_requests` has `driver_pickup_status`, `completed_at`, `customer_phone`, `estimated_price_eur`, `decision_deadline_at`.
- Rescue opportunities / requests have the expected lookup and preview columns.
- Existing `api/rescue.js` candidate on this branch has atomic `decision_deadline_at > now` predicate in normal booking acceptance. This is **not deployed** from mobile branch.
- RLS SELECT policies exist for company-scoped booking/rescue records (production read-only inspection).

## NOT VERIFIED / RELEASE BLOCKERS
1. No confirmed green GitHub Actions run for latest mobile commit, signed APK, or physical device smoke test.
2. Live actions intentionally disabled in workflow. Candidate server acceptance guard is on `operator-mobile` only, **not active on production API**.
3. Do not enable live actions until the guard is independently reviewed and deployed under a separate approved production API change, then acceptance/expiry/cross-tenant tests pass.
4. Background delivery while app terminated: no server-side token registry / push delivery / cancellation. Local notification only works while app is actively polling.
5. Rescue winner unlock, passenger confirmation, WhatsApp and trip lifecycle require true end-to-end tests.
6. Company QR URL needs canonical PWA link validation; current app derives slug subdomain.
7. Company `ONLINE` availability must come from dispatch server state, not a local toggle. The UI now labels it managed on web.
8. Passenger call/WhatsApp must remain gated by authorization and verified contact availability.
9. Expo packages use semver ranges; build uses npm install, not a committed locked install. Pin versions and lockfile for reproducibility.
10. Automated Android UI/integration tests and controlled pilot with a test company remain outstanding.

## Recommended gate sequence
- Green TS → Expo prebuild → Gradle assembleRelease → artifact download
- Install and login; inspect notifications, booking history, selected trip, QR link and map deep links without modifying bookings
- Validate production API contract and deploy expiry guard **only through an explicit separately reviewed change**
- Enable mutations for one controlled pilot, test accept/reject/expire, rescue, statuses, completion, duplicate-tap, offline, and cross-company denial
- Implement registered-device push and background lifecycle; test locked/background/killed app conditions
- Expand pilot after zero release-blocking errors

**Verdict:** NOT READY for unattended real-passenger trips. Safe to test read-only interface only after verified green APK.
