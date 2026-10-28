import React, { useEffect, useState } from 'react'
import { SafeAreaView, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { integrationConfigured, loginOperator, operatorDb, productionTargetBlocked, readCompanyBookings, readCompanyRescueOffers, resolveOperatorCompany, restoreOperatorCompany, type RescueOffer } from './src/backend'
import { Workspace, type DriverBooking } from './src/screens/Workspace'
import { theme } from './src/theme/theme'

const DEMO_COMPANY = { id: 'demo', name: 'ABC Taxi', slug: null as string | null, logo_url: null as string | null, availability_status: 'available' }
function demoBookings(now = Date.now()): DriverBooking[] {
  return [
    { id: 'demo-booking-1', booking_reference: 'TX-DEMO', pickup_address: 'Leuven Station', dropoff_address: 'Brussels Airport', status: 'new', decision_deadline_at: new Date(now + 25000).toISOString(), customer_name: 'Preview rider', estimated_price_eur: 42, ride_datetime: new Date(now + 3600000).toISOString() },
    { id: 'demo-trip-1', booking_reference: 'TX-TRIP', pickup_address: 'Aarschot', dropoff_address: 'Leuven', status: 'accepted', customer_name: 'Preview passenger', driver_pickup_status: 'accepted' },
  ]
}

export default function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [company, setCompany] = useState<{ id: string; name: string; slug?: string | null; logo_url?: string | null; availability_status?: string | null } | null>(null)
  const [bookings, setBookings] = useState<DriverBooking[]>([])
  const [rescue, setRescue] = useState<RescueOffer[]>([])
  const [demo, setDemo] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [restoring, setRestoring] = useState(integrationConfigured)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const existing = await restoreOperatorCompany()
        if (existing && active) {
          const rows = await readCompanyBookings(existing.id)
          if (active) {
            setCompany(existing)
            setBookings(rows)
            try { setRescue(await readCompanyRescueOffers(existing.id)) } catch { /* rescue may be unavailable */ }
          }
        }
      } catch { /* login stays visible */ }
      finally { if (active) setRestoring(false) }
    })()
    return () => { active = false }
  }, [])

  async function signIn() {
    if (!integrationConfigured || busy) return
    setBusy(true); setMessage('')
    try {
      const session = await loginOperator(email, password)
      const owner = await resolveOperatorCompany(session.user.id)
      if (!owner || owner.status !== 'approved') throw Error('No approved company found for this account.')
      const rows = await readCompanyBookings(owner.id)
      setCompany(owner)
      setBookings(rows)
      try { setRescue(await readCompanyRescueOffers(owner.id)) } catch { /* rescue may be unavailable */ }
      setDemo(false)
      setPassword('')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Unable to sign in')
      await operatorDb?.auth.signOut()
    } finally { setBusy(false) }
  }

  async function signOut() {
    if (!demo) await operatorDb?.auth.signOut()
    setCompany(null); setBookings([]); setRescue([]); setDemo(false)
  }

  if (company) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <StatusBar barStyle="light-content" />
        <Workspace companyName={company.name} logoUrl={company.logo_url} slug={company.slug} demo={demo} companyId={company.id} initialAvailability={company.availability_status} initialBookings={bookings} initialRescue={rescue} />
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Sign out" onPress={signOut} style={{ position: 'absolute', top: 46, right: 16 }}>
          <Text style={{ color: theme.faint, fontWeight: '700' }}>Sign out</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={{ padding: 22, gap: 12 }}>
        <Text style={{ color: theme.gold, fontWeight: '900', marginTop: 24 }}>TAXIO OPERATOR</Text>
        <Text style={{ color: theme.text, fontSize: 28, fontWeight: '900' }}>{restoring ? 'Checking session' : 'Sign in'}</Text>
        <Text style={{ color: theme.muted }}>Use the same company email and password as the TAXIO dashboard.</Text>
        {productionTargetBlocked ? <Text style={{ color: theme.danger }}>This build was pointed at production and has refused that connection.</Text> : null}
        {!integrationConfigured ? <Text style={{ color: theme.warn }}>Live login needs an isolated staging Supabase URL. Production is not used.</Text> : null}
        <Text style={{ color: theme.text, fontWeight: '700' }}>Email</Text>
        <TextInput accessibilityLabel="Email address" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="company@example.com" placeholderTextColor="#94a3b8" style={input} />
        <Text style={{ color: theme.text, fontWeight: '700' }}>Password</Text>
        <TextInput accessibilityLabel="Password" secureTextEntry value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor="#94a3b8" style={input} />
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Log in" disabled={!integrationConfigured || busy} onPress={signIn} style={{ backgroundColor: theme.blue, borderRadius: 14, padding: 16, alignItems: 'center', opacity: !integrationConfigured ? 0.5 : 1 }}>
          <Text style={{ color: '#fff', fontWeight: '900' }}>{busy ? 'Signing in…' : 'Log in'}</Text>
        </TouchableOpacity>
        {message ? <Text style={{ color: theme.danger }}>{message}</Text> : null}
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Preview offline demo" onPress={() => { setCompany(DEMO_COMPANY); setBookings(demoBookings()); setDemo(true) }}>
          <Text style={{ color: theme.gold, textAlign: 'center', fontWeight: '800', padding: 12 }}>Preview offline demo</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const input = { backgroundColor: theme.input, color: theme.inputText, borderRadius: 12, padding: 14, fontSize: 16 }
