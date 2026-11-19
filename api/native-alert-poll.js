import { createHash } from 'node:crypto'
import { json, makeSupabaseServiceClient, validateSupabaseServiceEnv } from './_utils.js'
import { publicAppOrigin } from './_companyPush.js'

function hashWatchToken(raw){return createHash('sha256').update(String(raw||'')).digest('hex')}
function millis(value){
  const n=new Date(value||0).getTime()
  return Number.isFinite(n)?n:0
}
function alertPayload({
  key,eventType,bookingId='',rescueRequestId='',rescueOpportunityId='',expiresAtMs,title,body
}){
  return {
    key,
    event_type:eventType,
    booking_id:bookingId,
    rescue_request_id:rescueRequestId,
    rescue_opportunity_id:rescueOpportunityId,
    expires_at_ms:expiresAtMs,
    deep_link:`${publicAppOrigin()}/dashboard/company`,
    title,
    body,
  }
}

export default async function handler(req,res){
  if(req.method!=='GET')return json(res,405,{error:'Method not allowed'})
  res.setHeader('Cache-Control','no-store')
  const envErr=validateSupabaseServiceEnv()
  if(envErr)return json(res,503,{ok:false,active:false,code:'ENV'})

  const raw=String(req.query?.token||'').trim()
  if(!raw)return json(res,401,{ok:false,active:false,code:'NO_TOKEN'})

  try{
    const admin=makeSupabaseServiceClient()
    const tokenHash=hashWatchToken(raw)
    const {data:device,error:deviceError}=await admin.from('company_native_devices')
      .select('id,company_id,user_id,platform,enabled,test_alert_until')
      .eq('watch_token_hash',tokenHash)
      .eq('platform','android')
      .eq('enabled',true)
      .maybeSingle()
    if(deviceError)throw deviceError
    if(!device)return json(res,401,{ok:false,active:false,code:'INVALID_WATCH_TOKEN'})

    const now=Date.now()
    const testUntil=millis(device.test_alert_until)
    if(testUntil>now){
      return json(res,200,{
        ok:true,
        active:true,
        mode:'test',
        alert:alertPayload({
          key:`test:${device.id}:${testUntil}`,
          eventType:'TEST',
          bookingId:`test-${device.id}`,
          expiresAtMs:testUntil,
          title:'🚕 TAXIO TEST ALERT',
          body:'Native watcher test — ringing should continue for about 10 seconds.',
        }),
      })
    }

    const nowIso=new Date(now).toISOString()
    const {data:bookings,error:bookingError}=await admin.from('booking_requests')
      .select('id,decision_deadline_at,status')
      .eq('company_id',device.company_id)
      .eq('status','new')
      .gt('decision_deadline_at',nowIso)
      .order('decision_deadline_at',{ascending:true})
      .limit(3)
    if(bookingError)throw bookingError

    const booking=(bookings||[])[0]||null

    const {data:opportunities,error:oppError}=await admin.from('rescue_opportunities')
      .select('id,rescue_request_id,expires_at,status')
      .eq('company_id',device.company_id)
      .eq('status','OFFERED')
      .gt('expires_at',nowIso)
      .order('expires_at',{ascending:true})
      .limit(5)
    if(oppError)throw oppError

    let rescue=null
    for(const opp of opportunities||[]){
      const {data:req,error:reqError}=await admin.from('rescue_requests')
        .select('id,status')
        .eq('id',opp.rescue_request_id)
        .maybeSingle()
      if(reqError)throw reqError
      if(req?.status==='OPEN'){
        rescue=opp
        break
      }
    }

    const bookingExpiry=millis(booking?.decision_deadline_at)
    const rescueExpiry=millis(rescue?.expires_at)

    if(booking && (!rescue || bookingExpiry<=rescueExpiry)){
      return json(res,200,{
        ok:true,
        active:true,
        mode:'booking',
        alert:alertPayload({
          key:`booking:${booking.id}`,
          eventType:'COMPANY_BOOKING_NEW',
          bookingId:booking.id,
          expiresAtMs:bookingExpiry,
          title:'🚕 NEW TAXIO TRIP',
          body:'A new Company A request is waiting. Open TAXIO now.',
        }),
      })
    }

    if(rescue){
      return json(res,200,{
        ok:true,
        active:true,
        mode:'rescue',
        alert:alertPayload({
          key:`rescue:${rescue.id}`,
          eventType:'RESCUE_OPPORTUNITY_NEW',
          rescueRequestId:rescue.rescue_request_id,
          rescueOpportunityId:rescue.id,
          expiresAtMs:rescueExpiry,
          title:'🚨 TAXIO RESCUE REQUEST',
          body:'A Rescue opportunity is available. Open TAXIO now.',
        }),
      })
    }

    return json(res,200,{ok:true,active:false,mode:'idle'})
  }catch(err){
    console.error('[native-alert-poll]',err?.message||err)
    return json(res,500,{ok:false,active:false,code:'SERVER_ERROR'})
  }
}
