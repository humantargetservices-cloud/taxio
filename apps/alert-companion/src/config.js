import Constants from 'expo-constants'

export const TAXIO_API_ORIGIN =
  process.env.EXPO_PUBLIC_TAXIO_API_ORIGIN ||
  Constants.expoConfig?.extra?.taxioApiOrigin ||
  'https://www.taxio.be'

export const SUPABASE_URL = String(process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim()
export const SUPABASE_ANON_KEY = String(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim()

export function expoProjectId() {
  const id =
    Constants.easConfig?.projectId ||
    Constants.expoConfig?.extra?.eas?.projectId ||
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    ''
  const value = String(id || '').trim()
  return value === 'SET_WITH_EAS_INIT' ? '' : value
}
