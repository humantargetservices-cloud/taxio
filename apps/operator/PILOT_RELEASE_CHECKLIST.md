# TAXIO Operator — controlled pilot release gate

Mobile code lives on `operator-mobile`; production site `main` and staging site are not deployed by this workflow.

## Blocking security finding

The existing `api/rescue.js` normal `accept_booking` branch updates a booking by `id/company_id/status=new` without a deadline predicate at this API layer. Do **not** enable `EXPO_PUBLIC_ENABLE_LIVE_ACTIONS=true` until the production authorization and server deadline semantics have been reviewed and a server-enforced expiry guard has been applied and tested on an isolated candidate. UI-only checks are insufficient.

## Acceptance criteria before pilot

- [ ] Correctly identify activated normal booking (not merely status=new)
- [ ] Verify server rejects expired and cross-company acceptance (including direct API calls)
- [ ] Verify company JWT authorization / single-accept conflict handling
- [ ] Verify rescue atomic claim and passenger-confirmation lock
- [ ] Verify on-way / arrived / complete actions and passenger status updates
- [ ] Device tests: incoming offer, notification tapped, live countdown, completion, offline/resume
- [ ] Background push: authenticated device token registration, revoke on logout, server delivery, resolved-offer cancellation
- [ ] Test Android notifications under foreground, background, killed, and locked states
- [ ] Inspect package lock / run TypeScript checks and complete signed release build
- [ ] Confirm app QR booking URL equals the canonical web booking URL
- [ ] Perform pilot on controlled test company; do not use live unsuspecting passengers

## Current limitation

Live operations are disabled at build time. No production DB or website migrations have been applied. Local Android foreground notifications do not provide server-delivered background push.
