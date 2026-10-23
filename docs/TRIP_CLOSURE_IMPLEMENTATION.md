# TAXIO trip closure — implementation contract (review before coding)

Status: **proposed, not deployed**. Company A and a passenger-confirmed rescue winner use the same closure rules.

## Existing behavior that must be preserved

- Booking request → company accepts or rejects; expiry of Company A decision activates Rescue.
- Rescue opportunities are sent to every eligible approved rescue-enabled company other than Company A; first valid atomic claim wins.
- Passenger confirmation of a *rescue winner* happens before that company obtains full passenger details. It is **different** from the passenger confirming trip completion.
- Existing pickup states: ON_THE_WAY, ARRIVED. Do not add GPS requirements.
- Existing booking_requests.completed_at means company-declared completion, consumed by activeTrips.js and _passengerTrip.js. Migration must preserve old records.
- Passenger booking payment stays directly with the taxi company. Neither payment status nor passenger action may block a driver from ending the operating trip.

## Minimal desired post-pickup lifecycle

1. Responsible company presses **Mark journey finished** and confirms a small modal. Optional internal note; no mandatory payment or extra step.
2. Server checks authenticated company ownership, checks rescued winner after its passenger acceptance, and atomically records company completion declaration. Duplicate requests are idempotent; no completing rejected/cancelled/unconfirmed rescue.
3. Company active-trips list no longer shows the trip as active. Completed/history section shows **Awaiting passenger response**.
4. On existing /trip/:token, passenger sees **Have you arrived?**, two actions:
   - **Yes, trip completed** → PASSENGER_CONFIRMED.
   - **No, something went wrong** → ISSUE_REPORTED, optionally a short reason; advise contact with operating taxi company.
5. When unanswered after 24h from company declaration, mark **CLOSED_UNCONFIRMED**, retaining company declaration and proof that the passenger did *not* confirm.
6. Passenger confirmation is never silently inferred from a timeout; requests submitted concurrently with closure timeout should resolve deterministically (lock booking row).
7. If not safely possible to reach passenger through an approved template, the trip page still shows request; notification failure never rolls back company declaration.

## Status model — add; do not conflate with booking status

Separate `completion_confirmation_status` field:
- `NULL`: company has not declared trip finished.
- `AWAITING_PASSENGER`: company declared completion.
- `PASSENGER_CONFIRMED`: passenger affirmatively confirmed.
- `ISSUE_REPORTED`: passenger disputed completion.
- `CLOSED_UNCONFIRMED`: 24h no-response closure.

Retain booking_requests.completed_at as *company-declared finish time* for backward compatibility. Add `completion_response_at`, `completion_closed_at`, and private company completion note only when required; never expose private notes or internal booking UUID via /api/trip-status. Consider `completion_status` and company declaration time separately if historic data reveal inconsistent usage.

## UI contract

Company modal:
- Header **Finish this journey?**
- Booking code, origin → destination, operating company.
- Copy: "Confirm that the passenger has been dropped off. TAXIO will ask the passenger to confirm arrival."
- Primary **Mark journey finished**; secondary **Not yet**.
- Optional collapsible **Internal note** and optional payment record can be postponed to avoid delaying operators.
- Upon successful server response: toast **Journey marked finished**; history shows **Awaiting passenger**.

Passenger card:
- **Have you arrived?** and buttons **Yes, trip completed** / **Report a problem**.
- Final cards: **Trip completed**, **Issue reported**, **Closed — passenger did not confirm**.
- Provide operating taxi company's telephone/WhatsApp and link to booking reference.
- No ratings or payment claims in this release.

## Cancellation and expiry rules (separate next work item)

- Company A unaccepted after the decision deadline: rescue activation, not trip completion.
- Every rescue opportunity expires; no winner → NO_TAXI_AVAILABLE.
- Rescue winner awaits *rescue acceptance by passenger*; timeout → OFFER_EXPIRED.
- A confirmed/in-progress trip must never auto-expire just because its scheduled pickup time passes.
- Passenger-initiated cancellation must be distinguishable from company cancellation and must preserve a reason/audit event.
- Only offer rescue after company cancellation when original journey is not already underway and the booking can be safely rescheduled.

## Safety / acceptance tests to require before merge

1. Company A may declare completion only for its own accepted booking; unrelated company gets 403.
2. Rescue winner can close only after passenger accepted winner. Original Company A cannot close a winner's booking.
3. Two simultaneous company calls: one declaration; same timestamp/status returned; no duplicate WhatsApp sends.
4. Passenger link with valid opaque token can respond once; invalid token cannot read/respond. No UUID leak.
5. Passenger confirms concurrently with 24h timeout: exactly one terminal result.
6. Closed/confirmed/issue cases displayed accurately in both dashboards after refresh.
7. Old completed_at historical rows still render as completed, without falsely claiming the passenger confirmed.
8. No passenger reply ⇒ CLOSED_UNCONFIRMED; no ghost active trips.
9. Cancellation paths do not accidentally mark completion.
10. Production and staging deployment connections verified independently; **never merge into main before owner's explicit sign-off**.

## Implementation order

1. Read-only inventory of existing SQL functions, history mapping and live UI.
2. Separate migration reviewed with security/permission tests; execute only in staging.
3. Company RPC/handler + modal.
4. Passenger token response RPC/handler + trip page.
5. Timeout worker, staging end-to-end verification, and owner approval.
6. Only after approval: production migration and release.
