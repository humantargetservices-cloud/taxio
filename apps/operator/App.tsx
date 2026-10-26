import { demoIdentities, canOperate } from './src/mockAccess'
import React, { useState } from 'react'
import { SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

// Offline prototype only. No Supabase, API requests, push registrations or real booking actions.
// Replace with authenticated, tenant-authorized endpoints after integration testing.
type Offer = { id: string; from: string; to: string; kind: 'booking' | 'rescue'; remaining: number }
const SAMPLE_OFFERS: Offer[] = [
  { id: 'demo-001', from: 'Leuven Station', to: 'Brussels Airport', kind: 'booking', remaining: 45 },
  { id: 'demo-002', from: 'Aarschot', to: 'Leuven', kind: 'rescue', remaining: 45 },
]
const DEMO_COMPANY = { name: 'ABC Taxi', initials: 'AT', city: 'Leuven' }
export default function App() {
  const [companyName, setCompanyName] = useState(DEMO_COMPANY.name)
  const [loggedIn, setLoggedIn] = useState(false)
  const [identity, setIdentity] = useState(demoIdentities[0])
  const [available, setAvailable] = useState(true)
  const authorized = canOperate(identity, 'company-a')
  const [offers, setOffers] = useState(SAMPLE_OFFERS)
  const [history, setHistory] = useState<string[]>([])
  const [view, setView] = useState<'dashboard' | 'trips' | 'history' | 'profile'>('dashboard')
  const [activeTrip, setActiveTrip] = useState<Offer | null>(null)
  const [tripStep, setTripStep] = useState<'accepted' | 'on_way' | 'arrived'>('accepted')
  const decide = (offer: Offer, decision: 'Accepted' | 'Declined') => {
    if (!authorized || !available) return
    setOffers(current => current.filter(x => x.id !== offer.id))
    if (decision === 'Accepted') { setActiveTrip(offer); setTripStep('accepted'); setView('trips') }
    setHistory(current => [`${decision} · ${offer.from} → ${offer.to} (demo only)`, ...current])
  }
  return <SafeAreaView style={styles.page}>
    <StatusBar barStyle="dark-content" />
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.demo}><Text style={styles.demoText}>OFFLINE DEMO · NO LIVE BOOKINGS</Text></View>
      {!loggedIn ? <>
        <Text style={styles.title}>Your company's driver app</Text>
        <Text style={styles.muted}>Preview company-specific branding without connecting to TAXIO servers.</Text>
        <Text style={styles.label}>Company name (demo)</Text>
        <TextInput style={styles.input} value={companyName} onChangeText={setCompanyName} maxLength={60} placeholder="Company name" />
        <Text style={styles.label}>Select mock driver</Text>
        {demoIdentities.map(d => <TouchableOpacity key={d.id} style={styles.card} onPress={() => setIdentity(d)}><Text style={styles.route}>{identity.id === d.id ? '● ' : '○ '}{d.label} · {d.status}</Text></TouchableOpacity>)}
        <TouchableOpacity accessibilityRole="button" style={styles.primary} onPress={() => setLoggedIn(true)}>
          <Text style={styles.primaryText}>Open demo dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.footer}>Powered by TAXIO</Text>
      </> : <>
        <View style={styles.header}>
          <View style={styles.mark}><Text style={styles.markText}>{(companyName.trim() || 'Taxi').slice(0, 2).toUpperCase()}</Text></View>
          <View style={styles.headerCopy}><Text style={styles.title}>{companyName.trim() || DEMO_COMPANY.name}</Text><Text style={styles.muted}>Driver dashboard · {DEMO_COMPANY.city}</Text></View>
        </View>
        <Text style={styles.muted}>{identity.label} · {identity.role} · {identity.status}</Text>
        {authorized ? <TouchableOpacity style={styles.secondary} onPress={() => setAvailable(v => !v)}><Text style={styles.secondaryText}>{available ? 'Available for offers · tap to go offline' : 'Unavailable · tap to go online'}</Text></TouchableOpacity> : <View style={styles.card}><Text style={styles.route}>Access restricted</Text><Text style={styles.muted}>Demo membership is not approved for this company. Real authorization must be enforced by the server.</Text></View>}
        {authorized ? <View style={styles.tabs}>
          {(['dashboard','trips','history','profile'] as const).map(tab => <TouchableOpacity key={tab} accessibilityRole="button" accessibilityState={{ selected: view === tab }} onPress={() => setView(tab)} style={[styles.tab, view === tab && styles.selectedTab]}><Text style={[styles.tabText, view === tab && styles.selectedTabText]}>{tab === 'trips' ? 'Current trip' : tab[0].toUpperCase()+tab.slice(1)}</Text></TouchableOpacity>)}
        </View>
        {view === 'dashboard' ? <>
        <View style={styles.stats}>
          <View style={styles.stat}><Text style={styles.muted}>New bookings</Text><Text style={styles.statNumber}>{offers.filter(x => x.kind === 'booking').length}</Text></View>
          <View style={styles.stat}><Text style={styles.muted}>Rescue offers</Text><Text style={styles.statNumber}>{offers.filter(x => x.kind === 'rescue').length}</Text></View>
        </View>
        <Text style={styles.section}>Incoming requests</Text>
        {offers.length === 0 ? <View style={styles.card}><Text style={styles.muted}>No demo offers left. Reset to preview again.</Text></View> : offers.map(offer =>
          <View key={offer.id} style={styles.card}>
            <View style={styles.offerTop}><Text style={styles.kind}>{offer.kind === 'rescue' ? 'RESCUE OFFER' : 'NEW BOOKING'}</Text><Text style={styles.time}>{offer.remaining}s sample window</Text></View>
            <Text style={styles.route}>{offer.from} → {offer.to}</Text>
            <Text style={styles.muted}>Demonstration only. No timer, server acceptance or dispatch.</Text>
            <View style={styles.actions}>
              <TouchableOpacity accessibilityRole="button" style={[styles.primary, styles.action]} disabled={!available} onPress={() => decide(offer, 'Accepted')}><Text style={styles.primaryText}>Accept demo</Text></TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" style={[styles.secondary, styles.action]} disabled={!available} onPress={() => decide(offer, 'Declined')}><Text style={styles.secondaryText}>Decline demo</Text></TouchableOpacity>
            </View>
          </View>
        )}
        </> : view === 'trips' ? <View style={styles.card}>
          <Text style={styles.section}>Current trip</Text>
          {activeTrip ? <>
            <Text style={styles.route}>{activeTrip.from} → {activeTrip.to}</Text>
            <Text style={styles.muted}>Local demonstration · stage: {tripStep.replace('_',' ')}</Text>
            {tripStep === 'accepted' ? <TouchableOpacity style={styles.primary} onPress={() => setTripStep('on_way')}><Text style={styles.primaryText}>On my way (demo)</Text></TouchableOpacity> : null}
            {tripStep === 'on_way' ? <TouchableOpacity style={styles.primary} onPress={() => setTripStep('arrived')}><Text style={styles.primaryText}>Arrived (demo)</Text></TouchableOpacity> : null}
            {tripStep === 'arrived' ? <TouchableOpacity style={styles.primary} onPress={() => { setHistory(h => [`Finished · ${activeTrip.from} → ${activeTrip.to} (demo only)`, ...h]);setActiveTrip(null);setView('history') }}><Text style={styles.primaryText}>Finish journey (demo)</Text></TouchableOpacity> : null}
          </> : <Text style={styles.muted}>Accept a demo booking from the dashboard to begin a simulated trip.</Text>}
        </View> : view === 'profile' ? <View style={styles.card}><Text style={styles.section}>Company profile</Text><Text style={styles.route}>{companyName || DEMO_COMPANY.name}</Text><Text style={styles.muted}>Branding preview only. Real driver profile and logo come later after permission testing.</Text></View> : null}
        {view === 'history' ? <>
        <Text style={styles.section}>Demo history</Text>
        <View style={styles.card}>{history.length ? history.map((entry, i) => <Text key={i} style={styles.history}>{entry}</Text>) : <Text style={styles.muted}>No demo actions yet.</Text>}</View>
        </> : null}
        <TouchableOpacity accessibilityRole="button" style={styles.secondary} onPress={() => { setOffers(SAMPLE_OFFERS); setHistory([]); setActiveTrip(null); setTripStep('accepted'); setView('dashboard') }}><Text style={styles.secondaryText}>Reset demo requests</Text></TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={styles.link} onPress={() => setLoggedIn(false)}><Text style={styles.linkText}>Change company</Text></TouchableOpacity>
        </> : null}
        <Text style={styles.footer}>Powered by TAXIO</Text>
      </>}
    </ScrollView>
  </SafeAreaView>
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' }, content: { padding: 20, gap: 16, flexGrow: 1 },
  demo: { backgroundColor: '#fef3c7', padding: 10, borderRadius: 10, alignItems: 'center' },
  demoText: { color: '#92400e', fontWeight: '800', fontSize: 11, letterSpacing: 0.5 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' }, muted: { color: '#64748b', fontSize: 13, lineHeight: 20 },
  label: { color: '#334155', fontWeight: '700' }, input: { padding: 14, backgroundColor: 'white', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, fontSize: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 }, headerCopy: { flex: 1 },
  mark: { width: 60, height: 60, backgroundColor: '#0f172a', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  markText: { fontSize: 21, fontWeight: '800', color: '#facc15' }, stats: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, backgroundColor: 'white', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  statNumber: { color: '#0f172a', fontSize: 28, fontWeight: '800' }, section: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginTop: 12 },
  card: { backgroundColor: 'white', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, gap: 12 },
  offerTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 }, kind: { color: '#b45309', fontSize: 11, fontWeight: '800' },
  time: { color: '#64748b', fontSize: 11 }, route: { color: '#0f172a', fontSize: 16, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10 }, action: { flex: 1 },
  primary: { backgroundColor: '#facc15', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center' },
  primaryText: { color: '#111827', fontWeight: '800' }, secondary: { borderWidth: 1, borderColor: '#cbd5e1', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center' },
  secondaryText: { color: '#334155', fontWeight: '700' }, history: { color: '#334155', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingVertical: 6 },
  link: { alignItems: 'center', paddingVertical: 8 }, linkText: { color: '#334155', fontWeight: '700' },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, tab: { paddingVertical: 10, paddingHorizontal: 10, borderRadius: 10, backgroundColor: '#e2e8f0' }, selectedTab: { backgroundColor: '#0f172a' }, tabText: { color: '#334155', fontWeight: '700', fontSize: 12 }, selectedTabText: { color: 'white' },
  footer: { textAlign: 'center', color: '#94a3b8', marginTop: 24, fontSize: 12 }
})
