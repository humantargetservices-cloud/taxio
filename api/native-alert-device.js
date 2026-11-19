import { createHash, randomBytes } from 'node:crypto'
import { json, makeSupabaseServiceClient, validateSupabaseServiceEnv } from './_utils.js'
import { getBearerUser, resolveCompanyIdForUser } from './_companyPush.js'

function bearer(req){return String(req.headers?.authorization||'').replace(/^Bearer\s+/i,'').trim()}
function validExpoToken(raw){
  const s=String(raw||'').trim()
  return s.startsWith('ExponentPushToken[')||s.startsWith('ExpoPushToken[')
}
function watchToken(){return randomBytes(32).toString('base64url')}
function hashWatchToken(raw){return createHash('sha256').update(String(raw||'')).digest('hex')}

export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin',req.headers.origin||'*')
  res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization')
  if(req.method==='OPTIONS'){if(typeof res.status==='function')return res.status(204).end();res.statusCode=204;return res.end()}
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed'})
  const envErr=validateSupabaseServiceEnv()
  if(envErr)return json(res,503,{ok:false,code:'ENV',error:envErr})
  try{
    const token=bearer(req)
    if(!token)return json(res,401,{ok:false,code:'NOT_AUTHENTICATED'})
    const user=await getBearerUser(token)
    if(!user)return json(res,401,{ok:false,code:'NOT_AUTHENTICATED'})
    const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):req.body||{}
    const action=String(body.action||'register').trim().toLowerCase()
    const admin=makeSupabaseServiceClient()
    const companyId=await resolveCompanyIdForUser(admin,user.id)
    if(!companyId)return json(res,403,{ok:false,code:'NO_COMPANY'})
    const {data:company}=await admin.from('companies').select('id, name, status').eq('id',companyId).maybeSingle()
    if(!company||company.status!=='approved')return json(res,403,{ok:false,code:'COMPANY_NOT_APPROVED'})
    const pushToken=String(body.expo_push_token||'').trim()
    if(!validExpoToken(pushToken))return json(res,400,{ok:false,code:'INVALID_PUSH_TOKEN'})
    if(action==='unregister'){
      await admin.from('company_native_devices').update({
        enabled:false,
        watch_token_hash:null,
        test_alert_until:null,
        updated_at:new Date().toISOString(),
      }).eq('expo_push_token',pushToken).eq('user_id',user.id)
      return json(res,200,{ok:true,code:'UNREGISTERED'})
    }
    const platform=String(body.platform||'').trim().toLowerCase()
    if(!['android','ios'].includes(platform))return json(res,400,{ok:false,code:'INVALID_PLATFORM'})

    const opaqueWatchToken=watchToken()
    const row={
      company_id:companyId,
      user_id:user.id,
      expo_push_token:pushToken,
      platform,
      device_id:String(body.device_id||'').trim().slice(0,120)||null,
      enabled:true,
      watch_token_hash:platform==='android'?hashWatchToken(opaqueWatchToken):null,
      test_alert_until:null,
      last_seen_at:new Date().toISOString(),
      updated_at:new Date().toISOString(),
      last_error:null,
    }
    const {data,error}=await admin.from('company_native_devices').upsert(row,{onConflict:'expo_push_token'})
      .select('id, platform, enabled, last_seen_at').single()
    if(error)throw error
    return json(res,200,{
      ok:true,
      code:'REGISTERED',
      company:{id:company.id,name:company.name},
      device:data,
      watch_token:platform==='android'?opaqueWatchToken:null,
    })
  }catch(err){
    console.error('[native-alert-device]',err?.message||err)
    return json(res,500,{ok:false,code:'SERVER_ERROR',error:err?.message||'Native alert device registration failed.'})
  }
}
