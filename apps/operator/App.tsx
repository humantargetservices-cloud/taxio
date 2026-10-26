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
  const [offers, setOffers] = useState(SAMPLE_OFFERS)
  const [history, setHistory] = useState<string[]>([])
  const decide = (offer: Offer, decision: 'Accepted' | 'Declined') => {
    setOffers(current => current.filter(x => x.id !== offer.id))
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
        <TouchableOpacity accessibilityRole="button" style={styles.primary} onPress={() => setLoggedIn(true)}>
          <Text style={styles.primaryText}>Open demo dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.footer}>Powered by TAXIO</Text>
      </> : <>
        <View style={styles.header}>
          <View style={styles.mark}><Text style={styles.markText}>{(companyName.trim() || 'Taxi').slice(0, 2).toUpperCase()}</Text></View>
          <View style={styles.headerCopy}><Text style={styles.title}>{companyName.trim() || DEMO_COMPANY.name}</Text><Text style={styles.muted}>Driver dashboard · {DEMO_COMPANY.city}</Text></View>
        </View>
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
              <TouchableOpacity accessibilityRole="button" style={[styles.primary, styles.action]} onPress={() => decide(offer, 'Accepted')}><Text style={styles.primaryText}>Accept demo</Text></TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" style={[styles.secondary, styles.action]} onPress={() => decide(offer, 'Declined')}><Text style={styles.secondaryText}>Decline demo</Text></TouchableOpacity>
            </View>
          </View>
        )}
        <Text style={styles.section}>Demo history</Text>
        <View style={styles.card}>{history.length ? history.map((entry, i) => <Text key={i} style={styles.history}>{entry}</Text>) : <Text style={styles.muted}>No demo actions yet.</Text>}</View>
        <TouchableOpacity accessibilityRole="button" style={styles.secondary} onPress={() => { setOffers(SAMPLE_OFFERS); setHistory([]) }}><Text style={styles.secondaryText}>Reset demo requests</Text></TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={styles.link} onPress={() => setLoggedIn(false)}><Text style={styles.linkText}>Change company</Text></TouchableOpacity>
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
  footer: { textAlign: 'center', color: '#94a3b8', marginTop: 24, fontSize: 12 }
})
