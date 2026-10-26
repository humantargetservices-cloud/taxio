import 'react-native-url-polyfill/auto'
import * as SecureStore from 'expo-secure-store'
import { createClient, type Session } from '@supabase/supabase-js'

// No defaults: neither staging nor production is accessed unless explicitly configured.
// EXPO_PUBLIC_ values are public and MUST NEVER contain service-role credentials.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL || ''
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''
export const integrationConfigured = Boolean(url && key)
export const operatorDb = integrationConfigured ? createClient(url, key, {
  auth: { storage: { getItem: (k: string) => SecureStore.getItemAsync(k), setItem: (k: string,v: string) => SecureStore.setItemAsync(k,v), removeItem: (k: string) => SecureStore.deleteItemAsync(k) }, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
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
  // Version 1: a single approved company operator/owner account per app session.
  // Future driver roles must be separately authorized by server-side policies.
  const {data,error} = await operatorDb.from('companies')
    .select('id,name,logo_url,status').eq('owner_user_id',userId)
    .eq('status','approved').limit(2)
  if(error) throw Error('Unable to verify your company')
  if (!data || data.length !== 1) throw Error('Expected one approved company for this operator')
  return data[0] as OperatorCompany
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

export async function restoreOperatorCompany(): Promise<OperatorCompany | null> {
  if (!operatorDb) return null
  const {data,error} = await operatorDb.auth.getUser()
  if(error || !data.user) return null
  return resolveOperatorCompany(data.user.id)
}
