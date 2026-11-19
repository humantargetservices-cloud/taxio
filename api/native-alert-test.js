import { json, makeSupabaseServiceClient, validateSupabaseServiceEnv } from './_utils.js'
import { getBearerUser, resolveCompanyIdForUser } from './_companyPush.js'

function bearer(req){
  return String(req.headers?.authorization||'').replace(/^Bearer\s+/i,'').trim()
}

export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin',req.headers.origin||'*')
  res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization')
  if(req.method==='OPTIONS'){
    if(typeof res.status==='function')return res.status(204).end()
    res.statusCode=204
    return res.end()
  }
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed'})

  const envErr=validateSupabaseServiceEnv()
  if(envErr)return json(res,503,{ok:false,code:'ENV',error:envErr})

  try{
    const token=bearer(req)
    if(!token)return json(res,401,{ok:false,code:'NOT_AUTHENTICATED'})
    const user=await getBearerUser(token)
    if(!user)return json(res,401,{ok:false,code:'NOT_AUTHENTICATED'})

    const admin=makeSupabaseServiceClient()
    const companyId=await resolveCompanyIdForUser(admin,user.id)
    if(!companyId)return json(res,403,{ok:false,code:'NO_COMPANY'})

    const {data:device,error}=await admin.from('company_native_devices')
      .select('id,watch_token_hash')
      .eq('company_id',companyId)
      .eq('user_id',user.id)
      .eq('platform','android')
      .eq('enabled',true)
      .not('watch_token_hash','is',null)
      .order('last_seen_at',{ascending:false})
      .limit(1)
      .maybeSingle()
    if(error)throw error
    if(!device)return json(res,409,{ok:false,code:'NO_ANDROID_WATCHER'})

    const until=new Date(Date.now()+10000).toISOString()
    const {error:updateError}=await admin.from('company_native_devices')
      .update({test_alert_until:until,updated_at:new Date().toISOString(),last_error:null})
      .eq('id',device.id)
    if(updateError)throw updateError

    return json(res,200,{ok:true,code:'TEST_ARMED',expires_at:until})
  }catch(err){
    console.error('[native-alert-test]',err?.message||err)
    return json(res,500,{
      ok:false,
      code:'SERVER_ERROR',
      error:err?.message||'Native pager test failed.',
    })
  }
}
