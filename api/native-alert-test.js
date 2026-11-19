import { json, makeSupabaseServiceClient, validateSupabaseServiceEnv } from './_utils.js'
import { getBearerUser, resolveCompanyIdForUser } from './_companyPush.js'
import { sendNativePagerTest } from './_nativeAlert.js'

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

    const {data:company}=await admin.from('companies')
      .select('id,status')
      .eq('id',companyId)
      .maybeSingle()
    if(!company||company.status!=='approved'){
      return json(res,403,{ok:false,code:'COMPANY_NOT_APPROVED'})
    }

    const result=await sendNativePagerTest({
      admin,
      companyId,
      userId:user.id,
    })

    return json(res,result.ok?200:409,result)
  }catch(err){
    console.error('[native-alert-test]',err?.message||err)
    return json(res,500,{
      ok:false,
      code:'SERVER_ERROR',
      error:err?.message||'Native pager test failed.',
    })
  }
}
