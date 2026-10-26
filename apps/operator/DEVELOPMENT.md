# TAXIO Operator — offline development track

This is a **standalone mock-data prototype**, not a live TAXIO driver client.

## Run locally
From `apps/operator`:
1. `npm install`
2. `npx expo start` (Expo Go or emulator for UI prototyping)
3. `npx tsc --noEmit`

## Current test scenarios
- Choose any demo identity: approved driver, approved dispatcher, pending, suspended.
- Pending/suspended users should see restricted access and no booking controls.
- Approved operators may toggle availability on/off.
- Offline operators may not accept/decline demo requests.
- Online approved operators may accept demo booking/rescue offers.
- Accepted demo request appears in Current trip.
- Advance On my way -> Arrived -> Finished and review mock history.
- Change company display name; branding is illustrative and local only.
- Reset demo state with the reset control.

## Hard safety boundaries
- No Supabase credentials, API base URLs, data mutations, push registration, or live requests are used in App.tsx.
- All offers, countdown labels, identities and trips are local sample data.
- Client-side permissions are UI simulations. Real authorization MUST be enforced by backend session + company membership, RLS and secure tenant-scoped endpoints.
- Never distribute a build that can submit real driver actions without server-side checks and device testing.
- Do not modify taxio.be, staging.taxio.be or either database for this prototype.
- An APK has not yet been built or verified on a device.

## Production approval gate
Explicit owner approval is required *before* adding production environment values, logging in with real company credentials, registering production push tokens or sending real booking/rescue/trip mutations.
