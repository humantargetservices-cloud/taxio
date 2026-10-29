import 'react-native-url-polyfill/auto'
import * as SecureStore from 'expo-secure-store'
import { createClient, type Session } from '@supabase/supabase-js'
import { isolatedValue } from './utils/environment'

// No defaults. Production hosts are refused so a dev build cannot read taxio.be data.
// EXPO_PUBLIC_ values are public and MUST NEVER contain service-role credentials.
const supabaseTarget = isolatedValue(process.env.EXPO_PUBLIC_SUPABASE_URL)
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''
export const productionTargetBlocked = supabaseTarget.blocked
export const integrationConfigured = Boolean(supabaseTarget.value && key && !supabaseTarget.blocked)
export const operatorDb = integrationConfigured ? createClient(supabaseTarget.value, key, {
  auth: { storage: { getItem: (k: string) => SecureStore.getItemAsync(k), setItem: (k: string,v: string) => SecureStore.setItemAsync(k,v), removeItem: (k: string) => SecureStore.deleteItemAsync(k) }, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
}) : null

export type OperatorCompany = { id: string; name: string; logo_url: string | null; status: string; slug?: string | null; availability_status?: string | null; slogan?: string | null; vat_number?: string | null; phone?: string | null }
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
    .select('id,name,logo_url,status,slug,availability_status,slogan,vat_number,phone').eq('owner_user_id',userId)
    .eq('status','approved').limit(2)
  if(error) throw Error('Unable to verify your company')
  if (!data || data.length !== 1) throw Error('Expected one approved company for this operator')
  return data[0] as OperatorCompany
}
export async function setCompanyAvailability(companyId: string, status: 'available' | 'busy' | 'offline') {
  if (!operatorDb) throw Error('Integration is not configured')
  const { error } = await operatorDb.from('companies').update({ availability_status: status }).eq('id', companyId)
  if (error) throw Error('Unable to update availability')
}
export type CompanyBooking = {
  id: string
  status: string
  booking_reference?: string | null
  pickup_address?: string | null
  dropoff_address?: string | null
  ride_datetime?: string | null
  decision_deadline_at?: string | null
  created_at?: string | null
  customer_name?: string | null
  completed_at?: string | null
  driver_pickup_status?: string | null
  completion_confirmation_status?: string | null
  estimated_price_eur?: number | null
  car_type?: string | null
  service_type?: string | null
  customer_phone?: string | null
}
export async function readCompanyBookings(companyId: string): Promise<CompanyBooking[]> {
  if (!operatorDb) throw Error('Integration is not configured')
  const shared='id,booking_reference,pickup_address,dropoff_address,status,ride_datetime,decision_deadline_at,created_at,customer_name,completed_at,driver_pickup_status,completion_confirmation_status,estimated_price_eur,car_type,service_type'
  const acceptedColumns=shared+',customer_phone'
  // Fetch accepted and new records independently: a busy company's history
  // must not push an active booking beyond a single global LIMIT 100.
  // Passenger phone is loaded only for accepted trips.
  const [active, newRequests, history] = await Promise.all([
    operatorDb.from('booking_requests').select(acceptedColumns)
      .eq('company_id',companyId).eq('status','accepted').is('completed_at',null)
      .order('created_at',{ascending:false}).limit(100),
    operatorDb.from('booking_requests').select(shared)
      .eq('company_id',companyId).eq('status','new')
      .order('created_at',{ascending:false}).limit(100),
    operatorDb.from('booking_requests').select(shared)
      .eq('company_id',companyId).neq('status','draft')
      .order('created_at',{ascending:false}).limit(300),
  ])
  if (active.error || newRequests.error || history.error)
    throw Error('Bookings unavailable or permission denied')
  const rows = [...(history.data||[]),...(newRequests.data||[]),...(active.data||[])] as CompanyBooking[]
  const byId=new Map<string,CompanyBooking>()
  for(const row of rows) byId.set(row.id,row)
  return Array.from(byId.values()).sort((a,b)=>
    Date.parse(b.created_at||'')-Date.parse(a.created_at||''))
}
// Intentionally NO booking writes or rescue RPC calls.
// Integration requires verified role permissions and owner approval before any production use.

export async function restoreOperatorCompany(): Promise<OperatorCompany | null> {
  if (!operatorDb) return null
  const {data,error} = await operatorDb.auth.getUser()
  if(error || !data.user) return null
  return resolveOperatorCompany(data.user.id)
}

export async function readWonRescueBookingIds(companyId: string): Promise<string[] | null> {
  if (!operatorDb) return null
  const { data, error } = await operatorDb.from('rescue_requests').select('booking_request_id').eq('accepted_by_company_id', companyId).limit(200)
  if (error) return null
  return (data || []).map(row => String((row as { booking_request_id?: string }).booking_request_id || '')).filter(Boolean)
}

export type RescueOffer = { id:string; rescue_request_id:string; expires_at:string|null; status:string; rescue?: {id:string;status:string;preview_pickup_label:string|null;preview_dropoff_label:string|null;preview_ride_datetime:string|null;preview_estimated_price?:string|null} | null }
export async function readCompanyRescueOffers(companyId:string):Promise<RescueOffer[]> {
  if(!operatorDb) throw Error('Integration not configured')
  const {data,error}=await operatorDb.from('rescue_opportunities')
    .select('id,rescue_request_id,expires_at,status,rescue:rescue_requests(id,status,preview_pickup_label,preview_dropoff_label,preview_ride_datetime,preview_estimated_price)')
    .eq('company_id',companyId).order('created_at',{ascending:false}).limit(30)
  if(error) throw Error('Rescue offers unavailable or permission denied')
  return (data||[]).map((row:any)=>({...row,rescue:Array.isArray(row.rescue)?row.rescue[0]||null:row.rescue})) as RescueOffer[]
}
