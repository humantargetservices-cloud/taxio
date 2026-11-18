import { json, makeSupabaseServiceClient, validateSupabaseServiceEnv } from './_utils.js'
import { PUSH_EVENT_TYPES } from './_companyPush.js'
import { verifyNativeAlertStatusToken } from './_nativeAlert.js'
function remainingSeconds(expiresAt){return expiresAt?Math.max(0,Math.ceil((new Date(expiresAt).getTime()-Date.now())/1000)):0}
export default async function handler(req,res){
  if(req.method!=='GET')return json(res,405,{error:'Method not allowed'})
  res.setHeader('Cache-Control','no-store')
  const envErr=validateSupabaseServiceEnv()
  if(envErr)return json(res,503,{ok:false,active:false,code:'ENV'})
  const signed=verifyNativeAlertStatusToken(req.query?.token)
  if(!signed)return json(res,401,{ok:false,active:false,code:'INVALID_TOKEN'})
  try{
    const admin=makeSupabaseServiceClient()
    if(signed.event_type===PUSH_EVENT_TYPES.COMPANY_BOOKING_NEW){
      const {data}=await admin.from('booking_requests').select('id, company_id, status, decision_deadline_at')
        .eq('id',signed.booking_id).maybeSingle()
      const remaining=remainingSeconds(data?.decision_deadline_at)
      const active=!!data&&data.company_id===signed.company_id&&data.status==='new'&&remaining>0
      return json(res,200,{ok:true,active,remaining_seconds:remaining,state:data?.status||'missing'})
    }
    if(signed.event_type===PUSH_EVENT_TYPES.RESCUE_OPPORTUNITY_NEW){
      const {data:opp}=await admin.from('rescue_opportunities').select('id, rescue_request_id, company_id, status, expires_at')
        .eq('id',signed.rescue_opportunity_id).maybeSingle()
      const {data:rescue}=opp?.rescue_request_id?await admin.from('rescue_requests').select('id, status, accepted_by_company_id')
        .eq('id',opp.rescue_request_id).maybeSingle():{data:null}
      const remaining=remainingSeconds(opp?.expires_at)
      const active=!!opp&&opp.company_id===signed.company_id&&opp.status==='OFFERED'&&rescue?.status==='OPEN'&&remaining>0
      return json(res,200,{ok:true,active,remaining_seconds:remaining,state:rescue?.status||opp?.status||'missing'})
    }
    return json(res,200,{ok:true,active:false,remaining_seconds:0,state:'unsupported'})
  }catch(err){
    console.error('[native-alert-status]',err?.message||err)
    return json(res,500,{ok:false,active:false,code:'SERVER_ERROR'})
  }
}
