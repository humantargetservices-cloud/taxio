# Meta WhatsApp — Trip URL button (Bug 1)

## Symptom

Passenger opens WhatsApp “View trip / View booking” and sees:

**Link unavailable** on a URL like:

`https://staging.taxio.be/trip/%7B%7B1%7D%7D`

`%7B` = `{`, `%7D` = `}` → the path is the **literal characters** `{{1}}`, not a real `passenger_trip_token`.

## Cause

The approved Meta template’s **website URL button is not Dynamic** (or the website field contains the literal text `{{1}}` as a static URL). Meta then never substitutes the button parameter TAXIO sends, so the browser opens `/trip/{{1}}`.

TAXIO Cloud API code already sends:

```json
{
  "type": "button",
  "sub_type": "url",
  "index": "0",
  "parameters": [{ "type": "text", "text": "<passenger_trip_token>" }]
}
```

Application code cannot fix a static Meta button without weakening security.

## Required Meta configuration (staging)

For each active template:

| Template | Env var |
|----------|---------|
| `taxio_booking_confirmed_staging` | `WHATSAPP_BOOKING_CONFIRMED_TEMPLATE_NAME` |
| `taxio_rescue_offer_staging` | `WHATSAPP_RESCUE_OFFER_TEMPLATE_NAME` |
| `taxio_rescue_reminder_staging` | `WHATSAPP_RESCUE_REMINDER_TEMPLATE_NAME` |

**Website / Call-to-action button:**

1. Type: **Visit website** → **Dynamic** (not Static).
2. Website URL base: `https://staging.taxio.be/trip/`
3. Dynamic suffix: `{{1}}` (Meta’s URL variable — filled by the API button parameter = `passenger_trip_token`).
4. Re-submit for approval if Meta requires a new template version.
5. Point Vercel staging env at the **approved dynamic** template name.

**Body variables** (separate from the URL suffix):

- Booking confirmed: `{{1}}` = company name, `{{2}}` = booking reference  
- Rescue offer: `{{1}}` = Company A, `{{2}}` = winner  
- Rescue reminder: `{{1}}` = winner  

## Production

Same shape with production host:

`https://www.taxio.be/trip/` or `https://taxio.be/trip/`  
(match `PUBLIC_APP_ORIGIN`)

## Verify

1. Send one template to a test number.
2. Long-press / copy link from WhatsApp.
3. Path must be `/trip/<opaque-passenger_trip_token>` — **not** `/trip/%7B%7B1%7D%7D`.
4. Page shows live trip status, not “Link unavailable”.
