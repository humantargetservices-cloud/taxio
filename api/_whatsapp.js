/**
 * WhatsApp Business Cloud API helpers (TAXIO central number).
 *
 * ACTIVE Rescue passenger templates (staging):
 *   - taxio_rescue_offer_staging     → first offer (View Booking → /trip/:token)
 *   - taxio_rescue_reminder_staging  → 20-minute reminder (View Booking → /trip/:token)
 *
 * Legacy (kept for reference / old messages only — NOT used for new sends):
 *   - taxio_rescue_confirmation_staging (Confirm/Cancel quick replies)
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

/** Cloud credentials present (token + phone number id). */
export function whatsappCloudConfigured() {
  return Boolean(
    String(process.env.WHATSAPP_CLOUD_TOKEN || '').trim() &&
      String(process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim()
  )
}

export function rescueOfferTemplateName() {
  return String(process.env.WHATSAPP_RESCUE_OFFER_TEMPLATE_NAME || '').trim()
}

export function rescueReminderTemplateName() {
  return String(process.env.WHATSAPP_RESCUE_REMINDER_TEMPLATE_NAME || '').trim()
}

export function rescueOfferTemplateConfigured() {
  return Boolean(rescueOfferTemplateName())
}

export function rescueReminderTemplateConfigured() {
  return Boolean(rescueReminderTemplateName())
}

function templateLang() {
  return String(process.env.WHATSAPP_TEMPLATE_LANG || 'en').trim() || 'en'
}

/** @deprecated Legacy quick-reply payload — not used by active View Booking templates. */
export function buildRescueConfirmButtonPayload(confirmToken) {
  const t = String(confirmToken || '').trim()
  return `TAXIO_CONFIRM:${t}`
}

/** @deprecated Legacy quick-reply payload — not used by active View Booking templates. */
export function buildRescueCancelButtonPayload(confirmToken) {
  const t = String(confirmToken || '').trim()
  return `TAXIO_CANCEL:${t}`
}

/**
 * Parse Confirm/Cancel quick-reply payload from inbound webhook (legacy messages only).
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
 * Active offer template: body {{1}} = winner company; URL button → /trip/{{1}} suffix = trip token.
 */
export function buildRescueOfferTemplateComponents({ winnerCompanyName, tripToken }) {
  const winner = String(winnerCompanyName || 'A taxi company').slice(0, 60)
  const token = String(tripToken || '').trim()
  return {
    bodyParameters: [{ type: 'text', text: winner }],
    components: [
      {
        type: 'body',
        parameters: [{ type: 'text', text: winner }],
      },
      {
        type: 'button',
        sub_type: 'url',
        index: '0',
        parameters: [{ type: 'text', text: token }],
      },
    ],
  }
}

/**
 * Active reminder template: no body vars; URL button → /trip/{{1}} suffix = trip token.
 */
export function buildRescueReminderTemplateComponents({ tripToken }) {
  const token = String(tripToken || '').trim()
  return {
    bodyParameters: [],
    components: [
      {
        type: 'button',
        sub_type: 'url',
        index: '0',
        parameters: [{ type: 'text', text: token }],
      },
    ],
  }
}

/**
 * @deprecated Legacy Confirm/Cancel/URL builder — do not use for new Rescue sends.
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

async function sendCloudTemplate({ toPhone, templateName, components, bodyParamCount, dryRun }) {
  const name = String(templateName || '').trim()
  if (!name) {
    return { ok: false, skipped: true, error: 'TEMPLATE_NOT_CONFIGURED', metaTemplateSetupRequired: true }
  }

  const payload = {
    messaging_product: 'whatsapp',
    to: whatsappCloudRecipient(toPhone) || '',
    type: 'template',
    template: {
      name,
      language: { code: templateLang() },
      components,
    },
  }

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      dryRunPayload: payload,
      template: name,
      bodyParamCount,
      metaTemplateSetupRequired: false,
    }
  }

  if (!whatsappCloudConfigured()) {
    return { ok: false, skipped: true, error: 'WHATSAPP_ENV_MISSING', metaTemplateSetupRequired: !name }
  }
  const to = whatsappCloudRecipient(toPhone)
  if (!to) return { ok: false, skipped: true, error: 'INVALID_PASSENGER_PHONE' }
  payload.to = to

  const phoneNumberId = String(process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim()
  const accessToken = String(process.env.WHATSAPP_CLOUD_TOKEN || '').trim()

  try {
    console.info('[whatsapp] template send attempt', {
      phone_number_id: phoneNumberId,
      template: name,
      language: templateLang(),
      to_len: String(to).length,
      body_param_count: bodyParamCount,
    })
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const json = await res.json().catch(() => ({}))
    const metaErr = json?.error || null
    const messageId = json?.messages?.[0]?.id || null
    if (!res.ok) {
      console.error('[whatsapp] template send failed', {
        http: res.status,
        code: metaErr?.code ?? null,
        error_subcode: metaErr?.error_subcode ?? null,
        type: metaErr?.type ?? null,
        message: metaErr?.message || `HTTP_${res.status}`,
        fbtrace_id: metaErr?.fbtrace_id ?? null,
        error_data: metaErr?.error_data ?? null,
        template: name,
      })
      const missingTemplate =
        metaErr?.code === 132001 ||
        /template/i.test(String(metaErr?.message || '')) ||
        /does not exist/i.test(String(metaErr?.message || ''))
      return {
        ok: false,
        status: res.status,
        error: metaErr?.message || `HTTP_${res.status}`,
        metaTemplateSetupRequired: missingTemplate,
        metaError: metaErr
          ? {
              code: metaErr.code ?? null,
              error_subcode: metaErr.error_subcode ?? null,
              type: metaErr.type ?? null,
              message: metaErr.message ?? null,
              fbtrace_id: metaErr.fbtrace_id ?? null,
              error_data: metaErr.error_data ?? null,
            }
          : null,
        response: json,
      }
    }
    console.info('[whatsapp] template send ok', {
      http: res.status,
      message_id: messageId,
      phone_number_id: phoneNumberId,
      template: name,
      language: templateLang(),
    })
    return {
      ok: true,
      status: res.status,
      messageId,
      template: name,
      response: json,
    }
  } catch (e) {
    console.error('[whatsapp] template send error', e?.message || e)
    return { ok: false, error: e?.message || 'FETCH_FAILED' }
  }
}

/**
 * First Rescue offer WhatsApp — View Booking only (no Confirm/Cancel quick replies).
 */
export async function sendRescueOfferTemplate({
  toPhone,
  winnerCompanyName,
  tripToken,
  dryRun = false,
}) {
  const token = String(tripToken || '').trim()
  if (token.length < 20) return { ok: false, skipped: true, error: 'INVALID_TRIP_TOKEN' }

  if (!rescueOfferTemplateConfigured()) {
    return {
      ok: false,
      skipped: true,
      error: 'TEMPLATE_NOT_CONFIGURED',
      metaTemplateSetupRequired: true,
      expectedTemplate: 'taxio_rescue_offer_staging',
    }
  }

  const built = buildRescueOfferTemplateComponents({ winnerCompanyName, tripToken: token })
  return sendCloudTemplate({
    toPhone,
    templateName: rescueOfferTemplateName(),
    components: built.components,
    bodyParamCount: built.bodyParameters.length,
    dryRun,
  })
}

/**
 * 20-minute reminder WhatsApp — View Booking only.
 */
export async function sendRescueReminderTemplate({ toPhone, tripToken, dryRun = false }) {
  const token = String(tripToken || '').trim()
  if (token.length < 20) return { ok: false, skipped: true, error: 'INVALID_TRIP_TOKEN' }

  if (!rescueReminderTemplateConfigured()) {
    return {
      ok: false,
      skipped: true,
      error: 'TEMPLATE_NOT_CONFIGURED',
      metaTemplateSetupRequired: true,
      expectedTemplate: 'taxio_rescue_reminder_staging',
    }
  }

  const built = buildRescueReminderTemplateComponents({ tripToken: token })
  return sendCloudTemplate({
    toPhone,
    templateName: rescueReminderTemplateName(),
    components: built.components,
    bodyParamCount: built.bodyParameters.length,
    dryRun,
  })
}

/**
 * @deprecated Do not use for new Rescue passenger sends (old Confirm/Cancel architecture).
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

  const result = await sendCloudTemplate({
    toPhone,
    templateName,
    components: built.components,
    bodyParamCount: built.bodyParameters.length,
    dryRun,
  })
  if (dryRun && result.ok) {
    return {
      ...result,
      bodyParameters: built.bodyParameters,
      confirmPayload: buildRescueConfirmButtonPayload(token),
      cancelPayload: buildRescueCancelButtonPayload(token),
      urlToken: token,
    }
  }
  return result
}
