import { createHmac, timingSafeEqual } from 'node:crypto'
import { PUSH_EVENT_TYPES, publicAppOrigin, shortAddressLabel } from './_companyPush.js'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

function signingSecret() {
  return String(process.env.NATIVE_ALERT_SIGNING_SECRET || process.env.COMPANY_PUSH_WEBHOOK_SECRET || '').trim()
}
function b64url(input) { return Buffer.from(input).toString('base64url') }
function signRaw(body) {
  const secret = signingSecret()
  return secret ? createHmac('sha256', secret).update(body).digest('base64url') : ''
}
export function signNativeAlertStatusToken(payload) {
  const body = b64url(JSON.stringify(payload || {}))
  const sig = signRaw(body)
  return sig ? `${body}.${sig}` : ''
}
export function verifyNativeAlertStatusToken(raw) {
  const [body, sig] = String(raw || '').trim().split('.')
  if (!body || !sig) return null
  const expected = signRaw(body)
  if (!expected || expected.length !== sig.length) return null
  try { if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null } catch { return null }
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (!parsed || typeof parsed !== 'object') return null
    if (!Number.isFinite(Number(parsed.exp)) || Number(parsed.exp) <= Date.now()) return null
    return parsed
  } catch { return null }
}
export function isNativeTripAlertEvent(eventType) {
  return eventType === PUSH_EVENT_TYPES.COMPANY_BOOKING_NEW || eventType === PUSH_EVENT_TYPES.RESCUE_OPPORTUNITY_NEW
}
function expoTokenLooksValid(token) {
  const s = String(token || '').trim()
  return s.startsWith('ExponentPushToken[') || s.startsWith('ExpoPushToken[')
}
function absoluteDeepLink(content) {
  const raw = String(content?.data?.url || '/dashboard/company').trim()
  if (/^https?:\/\//i.test(raw)) return raw
  return `${publicAppOrigin()}${raw.startsWith('/') ? raw : `/${raw}`}`
}
async function loadAuthority(admin, outbox) {
  if (outbox.event_type === PUSH_EVENT_TYPES.COMPANY_BOOKING_NEW) {
    const { data, error } = await admin.from('booking_requests')
      .select('id, company_id, status, decision_deadline_at').eq('id', outbox.booking_id).maybeSingle()
    if (error || !data) return { active:false, code:'BOOKING_NOT_FOUND' }
    const expiresAt = data.decision_deadline_at ? new Date(data.decision_deadline_at) : null
    return {
      active: data.company_id === outbox.company_id && data.status === 'new' && expiresAt && expiresAt.getTime() > Date.now(),
      expiresAt: expiresAt?.toISOString() || null,
      bookingId: data.id, rescueRequestId:null, opportunityId:null, status:data.status,
    }
  }
  if (outbox.event_type === PUSH_EVENT_TYPES.RESCUE_OPPORTUNITY_NEW) {
    const { data:opp, error } = await admin.from('rescue_opportunities')
      .select('id, rescue_request_id, company_id, status, expires_at').eq('id', outbox.rescue_opportunity_id).maybeSingle()
    if (error || !opp) return { active:false, code:'OPPORTUNITY_NOT_FOUND' }
    const expiresAt = opp.expires_at ? new Date(opp.expires_at) : null
    const { data:rescue } = await admin.from('rescue_requests').select('id, status').eq('id', opp.rescue_request_id).maybeSingle()
    return {
      active: opp.company_id === outbox.company_id && opp.status === 'OFFERED' && rescue?.status === 'OPEN' && expiresAt && expiresAt.getTime() > Date.now(),
      expiresAt: expiresAt?.toISOString() || null,
      bookingId:null, rescueRequestId:opp.rescue_request_id, opportunityId:opp.id, status:rescue?.status || opp.status,
    }
  }
  return { active:false, code:'UNSUPPORTED_EVENT' }
}
async function postExpo(messages) {
  if (!messages.length) return { tickets:[] }
  const response = await fetch(EXPO_PUSH_URL, {
    method:'POST',
    headers:{ Accept:'application/json', 'Accept-Encoding':'gzip, deflate', 'Content-Type':'application/json' },
    body: JSON.stringify(messages.length === 1 ? messages[0] : messages),
  })
  const raw = await response.text().catch(()=>'')
  let parsed={}
  try { parsed = raw ? JSON.parse(raw) : {} } catch {}
  if (!response.ok) throw new Error(`expo_push_http_${response.status}`)
  return { tickets:Array.isArray(parsed?.data) ? parsed.data : parsed?.data ? [parsed.data] : [] }
}
export async function sendNativeAlertToCompanyBestEffort({ admin, outbox, content, safeCtx }) {
  if (!isNativeTripAlertEvent(outbox?.event_type)) return { ok:true, code:'NOT_NATIVE_ALERT_EVENT', sent:0 }
  const { data:devices, error:deviceErr } = await admin.from('company_native_devices')
    .select('id, expo_push_token, platform').eq('company_id', outbox.company_id).eq('enabled', true)
  if (deviceErr) throw deviceErr
  const validDevices=(devices||[]).filter(d=>expoTokenLooksValid(d.expo_push_token))
  if (!validDevices.length) return { ok:true, code:'NO_NATIVE_DEVICES', sent:0 }

  const authority=await loadAuthority(admin,outbox)
  if (!authority.active || !authority.expiresAt) return { ok:true, code:'NO_LONGER_ACTIONABLE', sent:0 }

  const expiresMs=new Date(authority.expiresAt).getTime()
  const ttl=Math.max(1,Math.min(49,Math.ceil((expiresMs-Date.now())/1000)))
  const statusToken=signNativeAlertStatusToken({
    company_id:outbox.company_id, event_type:outbox.event_type,
    booking_id:authority.bookingId, rescue_request_id:authority.rescueRequestId,
    rescue_opportunity_id:authority.opportunityId, exp:expiresMs+30000,
  })
  if (!statusToken) return { ok:false, code:'NATIVE_SIGNING_SECRET_MISSING', sent:0 }

  const pickup=shortAddressLabel(safeCtx?.pickup)
  const data={
    taxio_native_alert:'1', event_type:outbox.event_type, company_id:String(outbox.company_id),
    booking_id:authority.bookingId||'', rescue_request_id:authority.rescueRequestId||'',
    rescue_opportunity_id:authority.opportunityId||'', expires_at:authority.expiresAt,
    deep_link:absoluteDeepLink(content),
    status_url:`${publicAppOrigin()}/api/native-alert-status?token=${encodeURIComponent(statusToken)}`,
    title:String(content?.title||'TAXIO').slice(0,80),
    body:pickup && pickup!=='—' ? `${String(content?.body||'Action required.').slice(0,100)} Pickup: ${pickup}` : String(content?.body||'Action required.').slice(0,140),
  }
  const messages=validDevices.map(device=>{
    const common={to:device.expo_push_token,priority:'high',ttl,data}
    if(device.platform==='ios') return {...common,title:data.title,body:data.body,sound:'default',interruptionLevel:'time-sensitive'}
    return common
  })
  const {tickets}=await postExpo(messages)
  let sent=0,failed=0
  for(let i=0;i<validDevices.length;i++){
    const device=validDevices[i],ticket=tickets[i],ok=ticket?.status==='ok'
    ok?sent++:failed++
    const providerError=ticket?.details?.error||ticket?.message||null
    await admin.from('company_native_devices').update({
      last_seen_at:new Date().toISOString(),
      last_error:providerError?String(providerError).slice(0,240):null,
      ...(providerError==='DeviceNotRegistered'?{enabled:false}:{}),
    }).eq('id',device.id)
  }
  console.info('[native-alert] Expo accepted',{companyId:outbox.company_id,eventType:outbox.event_type,sent,failed,ttl})
  return {ok:sent>0||failed===0,code:sent>0?'NATIVE_SENT':failed?'NATIVE_FAILED':'NO_NATIVE_DEVICES',sent,failed}
}
