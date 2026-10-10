/**
 * WhatsApp Business Cloud API helpers (TAXIO central number).
 *
 * Template: taxio_rescue_confirmation_staging (en)
 * Body: {{1}} = original Company A, {{2}} = Rescue winner
 * Buttons: Confirm (QR), Cancel (QR), Review details (dynamic URL + token)
 */

function digitsOnly(phone) {
  return String(phone || '').replace(/\D/g, '')
}

/** Normalize stored booking phone to WA Cloud "to" (digits, country code, no +). */
export function whatsappCloudRecipient(rawPhone) {
  let d = digitsOnly(rawPhone)
  if (!d) return null
  if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('0') && d.length >= 9) d = `32${d.slice(1)}`
  if (d.length < 8 || d.length > 15) return null
  return d
}

export function whatsappCloudConfigured() {
  return Boolean(
    String(process.env.WHATSAPP_CLOUD_TOKEN || '').trim() &&
      String(process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim() &&
      String(process.env.WHATSAPP_TEMPLATE_NAME || '').trim()
  )
}

/** Quick-reply payload embedded in Confirm button (webhook parses this). */
export function buildRescueConfirmButtonPayload(confirmToken) {
  const t = String(confirmToken || '').trim()
  return `TAXIO_CONFIRM:${t}`
}

/** Quick-reply payload embedded in Cancel button. */
export function buildRescueCancelButtonPayload(confirmToken) {
  const t = String(confirmToken || '').trim()
  return `TAXIO_CANCEL:${t}`
}

/**
 * Parse Confirm/Cancel quick-reply payload from inbound webhook.
 * @returns {{ action: 'CONFIRM'|'CANCEL', token: string } | null}
 */
export function parseRescueButtonPayload(rawPayload) {
  const p = String(rawPayload || '').trim()
  if (!p) return null
  const m = p.match(/^TAXIO_(CONFIRM|CANCEL):(.+)$/i)
  if (!m) return null
  const action = m[1].toUpperCase() === 'CANCEL' ? 'CANCEL' : 'CONFIRM'
  const token = String(m[2] || '').trim()
  if (token.length < 20) return null
  return { action, token }
}

/**
 * Build Cloud API template components for taxio_rescue_confirmation_staging.
 * Body params: [originalCompanyA, winnerCompany]
 * Buttons: index0 Confirm QR, index1 Cancel QR, index2 Review details URL
 */
export function buildRescueConfirmTemplateComponents({
  originalCompanyName,
  winnerCompanyName,
  confirmToken,
}) {
  const token = String(confirmToken || '').trim()
  const a = String(originalCompanyName || 'Your taxi company').slice(0, 60)
  const b = String(winnerCompanyName || 'A taxi company').slice(0, 60)
  return {
    bodyParameters: [
      { type: 'text', text: a },
      { type: 'text', text: b },
    ],
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: a },
          { type: 'text', text: b },
        ],
      },
      {
        type: 'button',
        sub_type: 'quick_reply',
        index: '0',
        parameters: [{ type: 'payload', payload: buildRescueConfirmButtonPayload(token) }],
      },
      {
        type: 'button',
        sub_type: 'quick_reply',
        index: '1',
        parameters: [{ type: 'payload', payload: buildRescueCancelButtonPayload(token) }],
      },
      {
        type: 'button',
        sub_type: 'url',
        index: '2',
        parameters: [{ type: 'text', text: token }],
      },
    ],
  }
}

/**
 * Send Rescue passenger-confirm template (2 body vars + Confirm/Cancel/URL).
 *
 * @returns {{ ok: boolean, skipped?: boolean, status?: number, error?: string, response?: any, dryRunPayload?: any }}
 */
export async function sendRescuePassengerConfirmTemplate({
  toPhone,
  originalCompanyName,
  winnerCompanyName,
  confirmToken,
  dryRun = false,
}) {
  const token = String(confirmToken || '').trim()
  if (token.length < 20) return { ok: false, skipped: true, error: 'INVALID_TOKEN' }

  const built = buildRescueConfirmTemplateComponents({
    originalCompanyName,
    winnerCompanyName,
    confirmToken: token,
  })

  const templateName =
    String(process.env.WHATSAPP_TEMPLATE_NAME || '').trim() || 'taxio_rescue_confirmation_staging'
  const lang = String(process.env.WHATSAPP_TEMPLATE_LANG || 'en').trim() || 'en'

  const payload = {
    messaging_product: 'whatsapp',
    to: whatsappCloudRecipient(toPhone) || '',
    type: 'template',
    template: {
      name: templateName,
      language: { code: lang },
      components: built.components,
    },
  }

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      dryRunPayload: payload,
      bodyParameters: built.bodyParameters,
      confirmPayload: buildRescueConfirmButtonPayload(token),
      cancelPayload: buildRescueCancelButtonPayload(token),
      urlToken: token,
    }
  }

  if (!whatsappCloudConfigured()) {
    return { ok: false, skipped: true, error: 'WHATSAPP_ENV_MISSING' }
  }
  const to = whatsappCloudRecipient(toPhone)
  if (!to) return { ok: false, skipped: true, error: 'INVALID_PASSENGER_PHONE' }
  payload.to = to

  const phoneNumberId = String(process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim()
  const accessToken = String(process.env.WHATSAPP_CLOUD_TOKEN || '').trim()

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      console.error('[whatsapp] template send failed', res.status, json?.error || json)
      return {
        ok: false,
        status: res.status,
        error: json?.error?.message || `HTTP_${res.status}`,
        response: json,
      }
    }
    return { ok: true, status: res.status, response: json }
  } catch (e) {
    console.error('[whatsapp] template send error', e?.message || e)
    return { ok: false, error: e?.message || 'FETCH_FAILED' }
  }
}
