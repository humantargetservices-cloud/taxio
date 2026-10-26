import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, type Session } from '@supabase/supabase-js'

// No defaults: neither staging nor production is accessed unless explicitly configured.
// EXPO_PUBLIC_ values are public and MUST NEVER contain service-role credentials.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL || ''
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''
export const integrationConfigured = Boolean(url && key)
export const operatorDb = integrationConfigured ? createClient(url, key, {
  auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
}) : null

export type OperatorCompany = { id: string; name: string; logo_url: string | null; status: string }
export async function loginOperator(email: string, password: string): Promise<Session> {
  if (!operatorDb) throw Error('Integration is not configured')
  const { data, error } = await operatorDb.auth.signInWithPassword({ email: email.trim(), password })
  if (error || !data.session) throw Error('Login failed')
  return data.session
}
export async function resolveOperatorCompany(userId: string): Promise<OperatorCompany | null> {
  if (!operatorDb) throw Error('Integration is not configured')
  const [a,b] = await Promise.all([
    operatorDb.from('companies').select('id,name,logo_url,status').eq('owner_user_id',userId),
    operatorDb.from('company_members').select('role,company:companies(id,name,logo_url,status)').eq('user_id',userId),
  ])
  if(a.error || b.error) throw Error('Unable to verify company membership')
  const companies = [...(a.data||[]), ...(b.data||[]).flatMap((m:any)=>Array.isArray(m.company)?m.company:m.company?[m.company]:[])] as OperatorCompany[]
  const unique = companies.filter((c,i)=>c?.id && companies.findIndex(v=>v.id===c.id)===i)
  return unique.find(c=>c.status==='approved') || unique[0] || null
}
export async function readCompanyBookings(companyId: string) {
  if (!operatorDb) throw Error('Integration is not configured')
  const { data, error } = await operatorDb.from('booking_requests')
    .select('id,booking_reference,pickup_address,dropoff_address,status,ride_datetime,decision_deadline_at')
    .eq('company_id',companyId).in('status',['new','accepted']).order('created_at',{ascending:false}).limit(30)
  if(error) throw Error('Bookings unavailable or permission denied')
  return data || []
}
// Intentionally NO booking writes or rescue RPC calls.
// Integration requires verified role permissions and owner approval before any production use.
