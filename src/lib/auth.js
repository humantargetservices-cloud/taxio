import { supabase } from './supabase.js'

/**
 * Platform admin = profiles.role === 'platform_admin' (matches RLS).
 * Bootstrap: after creating the admin user in Supabase Auth, run:
 *   UPDATE public.profiles SET role = 'platform_admin' WHERE email = 'you@domain.com';
 */
export async function fetchProfile(userId) {
  if (!userId) return null
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return data
}

export async function isPlatformAdmin(user) {
  if (!user?.id) return false
  const profile = await fetchProfile(user.id)
  return profile?.role === 'platform_admin'
}

export async function signOutEverywhere() {
  await supabase.auth.signOut()
}
