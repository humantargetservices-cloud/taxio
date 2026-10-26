import 'react-native-url-polyfill/auto'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Image, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || ''
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''
const db: SupabaseClient | null = url && key ? createClient(url, key, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false }
}) : null

type Company = { id: string; name: string; logo_url: string | null; status: string }
function resolveCompany(owned: Company[], members: Company[]): Company | null {
  const all = [...owned, ...members].filter((c, i, arr) => c?.id && arr.findIndex(x => x.id === c.id) === i)
  return all.sort((a, b) => (a.status === 'approved' ? 0 : 1) - (b.status === 'approved' ? 0 : 1))[0] || null
}
async function loadCompany(userId: string): Promise<Company | null> {
  if (!db) return null
  const [owned, members] = await Promise.all([
    db.from('companies').select('id,name,logo_url,status').eq('owner_user_id', userId),
    db.from('company_members').select('company:companies(id,name,logo_url,status)').eq('user_id', userId),
  ])
  if (owned.error) throw owned.error
  if (members.error) throw members.error
  const memberships = (members.data || []).flatMap((m: any) => Array.isArray(m.company) ? m.company : m.company ? [m.company] : [])
  return resolveCompany((owned.data || []) as Company[], memberships as Company[])
}
export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!db) { setLoading(false); return }
    const client = db
    let active = true
    client.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) setError('Unable to restore session')
      setSession(data.session)
      setLoading(false)
    })
    const { data: listener } = client.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    let cancelled = false
    setCompany(null)
    if (session?.user.id) loadCompany(session.user.id).then(c => {
      if (!cancelled) setCompany(c)
    }).catch(() => { if (!cancelled) setError('Unable to load your taxi company') })
    return () => { cancelled = true }
  }, [session?.user.id])

  const signIn = async () => {
    if (!db || busy) return
    setBusy(true); setError('')
    const { error } = await db.auth.signInWithPassword({ email: email.trim(), password })
    if (error) setError('Sign-in failed. Check your credentials.')
    setBusy(false)
  }

  return <SafeAreaView style={styles.page}>
    <StatusBar barStyle="dark-content" />
    <ScrollView contentContainerStyle={styles.content}>
      {!db ? <><Text style={styles.heading}>TAXIO Operator</Text><Text style={styles.note}>Configure staging Supabase URL and publishable key in your local environment before testing.</Text></>
      : loading ? <ActivityIndicator /> : !session ? <>
        <Text style={styles.heading}>Welcome to your taxi company</Text>
        <Text style={styles.note}>Log in using your existing TAXIO company account.</Text>
        <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail}/>
        <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword}/>
        <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={signIn} disabled={busy}><Text style={styles.buttonText}>{busy ? 'Signing in…' : 'Sign in'}</Text></TouchableOpacity>
      </> : <>
        {company?.logo_url ? <Image source={{ uri: company.logo_url }} resizeMode="contain" style={styles.logo}/> : null}
        <Text style={styles.heading}>{company?.name || 'Your taxi company'}</Text>
        <Text style={styles.note}>{company?.status === 'approved' ? 'Company dashboard' : 'Your company account is not yet approved'}</Text>
        <View style={styles.card}><Text style={styles.cardHeading}>Bookings and rescue</Text><Text style={styles.note}>Driver actions and notifications are the next development stage. No real trips can be changed from this screen yet.</Text></View>
        <TouchableOpacity accessibilityRole="button" style={styles.outline} onPress={() => db?.auth.signOut()}><Text style={styles.outlineText}>Sign out</Text></TouchableOpacity>
      </>}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <Text style={styles.footer}>Powered by TAXIO</Text>
    </ScrollView>
  </SafeAreaView>
}
const styles = StyleSheet.create({
  page:{flex:1,backgroundColor:'#f8fafc'},content:{padding:24,flexGrow:1,justifyContent:'center',gap:16},
  heading:{fontSize:26,fontWeight:'800',color:'#0f172a',textAlign:'center'},
  note:{fontSize:15,color:'#64748b',lineHeight:22,textAlign:'center'},
  input:{backgroundColor:'#fff',borderRadius:14,padding:16,borderWidth:1,borderColor:'#cbd5e1',fontSize:16},
  button:{backgroundColor:'#eab308',padding:16,borderRadius:14,alignItems:'center'},
  buttonText:{fontWeight:'800',color:'#111827'},logo:{width:144,height:96,alignSelf:'center'},
  card:{padding:20,backgroundColor:'#fff',borderWidth:1,borderColor:'#e2e8f0',borderRadius:16,gap:10},
  cardHeading:{fontSize:18,fontWeight:'700',color:'#0f172a'},
  outline:{padding:14,borderRadius:12,borderWidth:1,borderColor:'#cbd5e1',alignItems:'center'},
  outlineText:{fontWeight:'700',color:'#334155'},error:{color:'#b91c1c',textAlign:'center'},
  footer:{textAlign:'center',marginTop:40,color:'#94a3b8',fontSize:12}
})
