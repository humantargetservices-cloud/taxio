/** Passenger acknowledgement of the company's trip-completion declaration.
 * A valid opaque trip token is the only passenger credential; never return booking IDs.
 */
import { json, makeSupabaseServiceClient, validateSupabaseServiceEnv } from './_utils.js'
import { normalizePassengerTripTokenInput, isUnresolvedWhatsappUrlPlaceholder } from './_passengerTrip.js'
export default async function handler(req,res) {
  if(req.method!=='POST') return json(res,405,{ok:false,code:'METHOD_NOT_ALLOWED'})
  const envErr=validateSupabaseServiceEnv()
  if(envErr) return json(res,503,{ok:false,code:'ENV_ERROR'})
  try {
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{}
    const token=normalizePassengerTripTokenInput(body.token||'')
    const action=String(body.action||'').toUpperCase()
    if(token.length<20 || isUnresolvedWhatsappUrlPlaceholder(token) || !['CONFIRM','ISSUE'].includes(action))
      return json(res,400,{ok:false,code:'INVALID_INPUT'})
    const db=makeSupabaseServiceClient()
    const {data,error}=await db.rpc('taxio_passenger_finish_trip',{p_token:token,p_action:action})
    if(error) {console.error('[trip-completion]',error.message);return json(res,500,{ok:false,code:'DB_ERROR'})}
    return json(res,data?.ok?200:409,{ok:data?.ok===true,code:data?.code||null,status:data?.status||null})
  } catch(e) {console.error('[trip-completion]',e?.message||e);return json(res,500,{ok:false,code:'SERVER_ERROR'})}
}
