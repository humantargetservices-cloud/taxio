/**
 * WhatsApp Business Cloud API helpers (staging Rescue passenger notify).
 * Soft-fail only — callers must never let errors break Rescue.
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

/**
 * Send approved Rescue passenger-confirm template (one URL CTA).
 * Template body params (order): companyName, pickup, dropoff, priceLabel
 * Template URL button dynamic suffix: confirm token
 *
 * @returns {{ ok: boolean, skipped?: boolean, status?: number, error?: string, response?: any }}
 */
export async function sendRescuePassengerConfirmTemplate({
  toPhone,
  companyName,
  pickup,
  dropoff,
  priceLabel,
  confirmToken,
}) {
  if (!whatsappCloudConfigured()) {
    return { ok: false, skipped: true, error: 'WHATSAPP_ENV_MISSING' }
  }
  const to = whatsappCloudRecipient(toPhone)
  if (!to) return { ok: false, skipped: true, error: 'INVALID_PASSENGER_PHONE' }
  const token = String(confirmToken || '').trim()
  if (token.length < 20) return { ok: false, skipped: true, error: 'INVALID_TOKEN' }

  const phoneNumberId = String(process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim()
  const accessToken = String(process.env.WHATSAPP_CLOUD_TOKEN || '').trim()
  const templateName = String(process.env.WHATSAPP_TEMPLATE_NAME || '').trim()
  const lang = String(process.env.WHATSAPP_TEMPLATE_LANG || 'en').trim() || 'en'

  const bodyParams = [companyName, pickup, dropoff, priceLabel].map((t) => ({
    type: 'text',
    text: String(t || '—').slice(0, 600),
  }))

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: lang },
      components: [
        { type: 'body', parameters: bodyParams },
        {
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [{ type: 'text', text: token }],
        },
      ],
    },
  }

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
