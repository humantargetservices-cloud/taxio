# Mobile push infrastructure — disabled by default

TAXIO Operator push must never treat a notification as proof of booking ownership or entitlement. A notification only contains an opaque booking ID, type, company ID and deadline; the app must refetch authoritative server data and validate the signed-in company's scope.

## Required registration backend
- Authenticate user by Supabase JWT using existing server verification.
- Verify current approved company membership server-side (not a submitted companyId alone).
- Store Expo push token bound to user_id, company_id, installation_id, platform, created_at, last_seen_at and revoked_at.
- Revoke the installation on logout; expire/revalidate stale tokens; rate limit registration.
- Keep raw contact details and routes out of push payloads.

## Delivery worker (future; NO production activation)
- Receive trusted server-side booking-activation/rescue-offer event only.
- Check authoritative `decision_deadline_at`, offer status, company and revocation state before sending.
- Dedupe by (company, offer ID, deadline, installation) and stop sending after acceptance/expiry.
- Push includes IDs and deadline only; no passenger data.
- On tap the client refreshes the offer and never enables acceptance when expired.
- Provide delivery status, retries with backoff, token invalidation, alert metrics.

## Lifecycle
- Foreground: local alert UX and in-app offer popup.
- Background/closed: Expo/APNs/FCM push requires actual credentials and server-side registration, not just `expo-notifications` library.
- Cancel scheduled local sounds and clear stale notifications on accept/decline/expire.
- Android OEM, DND and iOS policies can limit ringing; never promise guaranteed uninterrupted sound.

## Guard
No server routes, migrations, token enrollment, push senders, CRON or provider credentials are deployed or enabled by this document. The release flag remains OFF. All production setup requires separate review.
