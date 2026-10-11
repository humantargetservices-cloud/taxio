/**
 * Staging WhatsApp delivery audit — NO passenger spam.
 * - Reads env safely (no token dump)
 * - Inspects WAITING rescues / send-once claims
 * - Queries Graph for phone + message templates (read-only)
 * - Optional: --probe-send=PHONE to send ONE test template (explicit only)
 */
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

function parseEnv(p) {
  const out = {}
  if (!fs.existsSync(p)) return out
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 1) continue
    let v = t.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    out[t.slice(0, i).trim()] = v
  }
  return out
}

const root = path.join(__dirname, '..')
const env = { ...parseEnv(path.join(root, '.env')), ...parseEnv(path.join(root, '.env.local')) }
Object.assign(process.env, env)

const url = String(env.SUPABASE_URL || '').replace(/\/$/, '')
if (!url.includes('lyjicuuyrvblbsqlduqg')) {
  console.log(JSON.stringify({ fatal: 'staging only' }))
  process.exit(1)
}

function maskPhone(p) {
  const d = String(p || '').replace(/\D/g, '')
  if (d.length < 6) return '***'
  return `${d.slice(0, 4)}…${d.slice(-2)}`
}

;(async () => {
  const report = { env: {}, graph: {}, rescues: [], probe: null }

  const phoneId = String(process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim()
  const template = String(process.env.WHATSAPP_TEMPLATE_NAME || '').trim()
  const lang = String(process.env.WHATSAPP_TEMPLATE_LANG || '').trim()
  const token = String(process.env.WHATSAPP_CLOUD_TOKEN || '').trim()
  const appSecret = String(process.env.WHATSAPP_APP_SECRET || '').trim()
  const verify = String(process.env.WHATSAPP_VERIFY_TOKEN || '').trim()

  report.env = {
    WHATSAPP_PHONE_NUMBER_ID: phoneId || null,
    WHATSAPP_PHONE_NUMBER_ID_EXPECTED: '1476530895539889',
    phoneNumberIdMatch: phoneId === '1476530895539889',
    WHATSAPP_TEMPLATE_NAME: template || null,
    WHATSAPP_TEMPLATE_LANG: lang || null,
    WHATSAPP_CLOUD_TOKEN: token ? `SET len=${token.length}` : 'MISSING',
    WHATSAPP_APP_SECRET: appSecret ? `SET len=${appSecret.length}` : 'MISSING',
    WHATSAPP_VERIFY_TOKEN: verify ? `SET len=${verify.length}` : 'MISSING',
    PUBLIC_APP_ORIGIN: process.env.PUBLIC_APP_ORIGIN || null,
    WHATSAPP_WEBHOOK_ALLOW_UNSIGNED: process.env.WHATSAPP_WEBHOOK_ALLOW_UNSIGNED || null,
  }

  if (token && phoneId) {
    try {
      const phoneRes = await fetch(
        `https://graph.facebook.com/v21.0/${phoneId}?fields=display_phone_number,verified_name,quality_rating,code_verification_status`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const phoneJson = await phoneRes.json().catch(() => ({}))
      report.graph.phone = {
        http: phoneRes.status,
        display: phoneJson.display_phone_number || null,
        verified_name: phoneJson.verified_name || null,
        quality: phoneJson.quality_rating || null,
        error: phoneJson.error
          ? {
              message: phoneJson.error.message,
              code: phoneJson.error.code,
              error_subcode: phoneJson.error.error_subcode,
              type: phoneJson.error.type,
              fbtrace_id: phoneJson.error.fbtrace_id,
            }
          : null,
      }
    } catch (e) {
      report.graph.phone = { error: String(e.message || e) }
    }

    try {
      // Resolve WABA id via phone number edge when possible
      const wabaRes = await fetch(
        `https://graph.facebook.com/v21.0/${phoneId}?fields=id,account_mode`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const wabaJson = await wabaRes.json().catch(() => ({}))
      report.graph.phoneMeta = {
        http: wabaRes.status,
        account_mode: wabaJson.account_mode || null,
        error: wabaJson.error
          ? {
              message: wabaJson.error.message,
              code: wabaJson.error.code,
              error_subcode: wabaJson.error.error_subcode,
            }
          : null,
      }
    } catch (e) {
      report.graph.phoneMeta = { error: String(e.message || e) }
    }

    // Try message_templates via business account if WHATSAPP_BUSINESS_ACCOUNT_ID set
    const wabaId = String(process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '').trim()
    if (wabaId) {
      try {
        const tRes = await fetch(
          `https://graph.facebook.com/v21.0/${wabaId}/message_templates?name=${encodeURIComponent(template || 'taxio_rescue_confirmation_staging')}&fields=name,status,language,category,rejected_reason`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        const tJson = await tRes.json().catch(() => ({}))
        report.graph.templates = {
          http: tRes.status,
          data: (tJson.data || []).map((t) => ({
            name: t.name,
            status: t.status,
            language: t.language,
            rejected_reason: t.rejected_reason || null,
          })),
          error: tJson.error
            ? {
                message: tJson.error.message,
                code: tJson.error.code,
                error_subcode: tJson.error.error_subcode,
              }
            : null,
        }
      } catch (e) {
        report.graph.templates = { error: String(e.message || e) }
      }
    } else {
      report.graph.templates = { skipped: 'WHATSAPP_BUSINESS_ACCOUNT_ID not set' }
    }
  } else {
    report.graph = { skipped: 'missing token or phone id in local env' }
  }

  const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: waiting } = await admin
    .from('rescue_requests')
    .select(
      'id,status,passenger_confirm_status,passenger_confirm_whatsapp_sent_at,accepted_by_company_id,original_company_id,booking_request_id,accepted_at,preview_estimated_price'
    )
    .eq('status', 'ACCEPTED')
    .eq('passenger_confirm_status', 'WAITING_PASSENGER_CONFIRMATION')
    .order('accepted_at', { ascending: false })
    .limit(10)

  for (const r of waiting || []) {
    const { data: b } = await admin
      .from('booking_requests')
      .select('id,customer_phone,estimated_price_eur')
      .eq('id', r.booking_request_id)
      .maybeSingle()
    report.rescues.push({
      id: r.id,
      passenger_confirm_status: r.passenger_confirm_status,
      whatsapp_sent_at: r.passenger_confirm_whatsapp_sent_at,
      claimed: !!r.passenger_confirm_whatsapp_sent_at,
      phone: maskPhone(b?.customer_phone),
      hasPhone: !!String(b?.customer_phone || '').trim(),
      frozen: r.preview_estimated_price,
      bookingPrice: b?.estimated_price_eur,
    })
  }

  const probePhone = process.argv.find((a) => a.startsWith('--probe-send='))?.split('=')[1]
  if (probePhone && token && phoneId && template) {
    const payload = {
      messaging_product: 'whatsapp',
      to: String(probePhone).replace(/\D/g, ''),
      type: 'template',
      template: {
        name: template,
        language: { code: lang || 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'Company A Test' },
              { type: 'text', text: 'Winner Test' },
            ],
          },
          {
            type: 'button',
            sub_type: 'quick_reply',
            index: '0',
            parameters: [{ type: 'payload', payload: 'TAXIO_CONFIRM:' + 'a'.repeat(40) }],
          },
          {
            type: 'button',
            sub_type: 'quick_reply',
            index: '1',
            parameters: [{ type: 'payload', payload: 'TAXIO_CANCEL:' + 'a'.repeat(40) }],
          },
          {
            type: 'button',
            sub_type: 'url',
            index: '2',
            parameters: [{ type: 'text', text: 'a'.repeat(40) }],
          },
        ],
      },
    }
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const json = await res.json().catch(() => ({}))
    report.probe = {
      to: maskPhone(probePhone),
      http: res.status,
      messageId: json?.messages?.[0]?.id || null,
      error: json?.error
        ? {
            message: json.error.message,
            code: json.error.code,
            error_subcode: json.error.error_subcode,
            type: json.error.type,
            fbtrace_id: json.error.fbtrace_id,
            error_data: json.error.error_data || null,
          }
        : null,
    }
  }

  console.log(JSON.stringify(report, null, 2))
})().catch((e) => {
  console.log(JSON.stringify({ fatal: String(e.stack || e) }, null, 2))
  process.exit(1)
})
