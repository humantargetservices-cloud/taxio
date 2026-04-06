import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.warn(
    '[TAXIO] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and add your Supabase project keys.'
  )
}

/**
 * Browser Supabase client (anon key). Used everywhere in the SPA.
 * Env vars are injected by Vite from `.env` (never commit real keys).
 */
export const supabase = createClient(url || '', anonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
