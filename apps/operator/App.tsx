import { sendOperatorAction, mobileActionsEnabled } from './src/operatorActions'
import React, { useEffect, useState } from 'react'
import { SafeAreaView, ScrollView, StatusBar, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { integrationConfigured, operatorDb, loginOperator, resolveOperatorCompany, readCompanyBookings, restoreOperatorCompany, type OperatorCompany } from './src/backend'

type Booking = { id: string; pickup_address: string; dropoff_address: string; status: string; booking_reference?: string | null; decision_deadline_at?: string | null }
type Screen = 'bookings' | 'rescue' | 'trip'
const DEMO_BOOKINGS: Booking[] = [
  { id: 'demo-booking-1', pickup_address: 'Leuven Station', dropoff_address: 'Brussels Airport', status: 'new' },
  { id: 'demo-trip-1', pickup_address: 'Aarschot', dropoff_address: 'Leuven', status: 'accepted' },
]
const DEMO_COMPANY: OperatorCompany = { id: 'demo', name: 'ABC Taxi', logo_url: null, status: 'approved' }
export default function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [company, setCompany] = useState<OperatorCompany | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [demo, setDemo] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [screen, setScreen] = useState<Screen>('bookings')
  const [available, setAvailable] = useState(true)
  const [demoFinished, setDemoFinished] = useState(false)
  const [restoring, setRestoring] = useState(integrationConfigured)
  const [actionMessage, setActionMessage] = useState('')
  const [confirmBookingId, setConfirmBookingId] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
  async function acceptBooking(id: string) {
    if (!company || demo || !mobileActionsEnabled() || actionBusy) return
    const target = bookings.find(b=>b.id===id)
    if (!target || target.status!=='new' || !target.decision_deadline_at || Date.parse(target.decision_deadline_at)<=Date.now()) {
      setActionMessage('This offer is expired or no longer available. Refresh bookings.')
      setConfirmBookingId(null)
      return
    }
    setActionBusy(true); setActionMessage('')
    try {
      const result = await sendOperatorAction('https://www.taxio.be',company.id,{action:'accept_booking',companyId:company.id,bookingRequestId:id})
      if (!result.ok) throw Error(result.error || result.code || 'Booking no longer available')
      setBookings(await readCompanyBookings(company.id))
      setScreen('trip')
      setActionMessage('Booking accepted by TAXIO server.')
    } catch(e) {setActionMessage(e instanceof Error?e.message:'Unable to accept trip')} finally {setActionBusy(false);setConfirmBookingId(null)}
  }

  useEffect(() => {
    let active = true
    const run = async () => {
      try {
        const existing = await restoreOperatorCompany()
        if (existing && active) {
          const rows = await readCompanyBookings(existing.id)
          if (active) {setCompany(existing);setBookings(rows);setDemo(false)}
        }
      } catch { /* Show login; never grant access without verified session. */ }
      finally {if(active)setRestoring(false)}
    }
    void run()
    return () => {active=false}
  }, [])

  async function signIn() {
    if (!integrationConfigured || busy) return
    setBusy(true); setMessage('')
    try {
      const session = await loginOperator(email, password)
      const ownerCompany = await resolveOperatorCompany(session.user.id)
      if (!ownerCompany || ownerCompany.status !== 'approved') throw Error('No approved company found for this account.')
      const rows = await readCompanyBookings(ownerCompany.id)
      setCompany(ownerCompany)
      setBookings(rows)
      setDemo(false)
      setPassword('')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Unable to sign in')
      await operatorDb?.auth.signOut()
    } finally { setBusy(false) }
  }

  async function signOut() {
    if (!demo) await operatorDb?.auth.signOut()
    setCompany(null); setBookings([]); setDemo(false); setScreen('bookings')
  }

  const myBookings = bookings.filter(b => b.status === 'new' || b.status === 'accepted')
  const currentTrip = bookings.find(b => b.status === 'accepted')
  const pendingCount = bookings.filter(b => b.status === 'new').length
  const acceptedCount = bookings.filter(b => b.status === 'accepted').length
  return <SafeAreaView style={styles.page}>
    <StatusBar barStyle="dark-content" />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      {restoring ? <Text style={styles.subtitle}>Checking company session…</Text> : !company ? <>
        <Text style={styles.heading}>Company access</Text>
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.subtitle}>Use the same email and password as your TAXIO company dashboard.</Text>
        <Text style={styles.label}>Email address</Text>
        <TextInput style={styles.input} placeholder="company@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} value={email} onChangeText={setEmail} />
        <Text style={styles.label}>Password</Text>
        <TextInput style={styles.input} placeholder="Enter your password" secureTextEntry value={password} onChangeText={setPassword} />
        <TouchableOpacity accessibilityRole="button" style={[styles.primary, !integrationConfigured && styles.inactive]} disabled={!integrationConfigured || busy} onPress={signIn}>
          <Text style={styles.primaryText}>{busy ? 'Signing in…' : 'Log in'}</Text>
        </TouchableOpacity>
        {!integrationConfigured ? <Text style={styles.notice}>Secure login is not connected in this build. Production credentials are not embedded.</Text> : null}
        {message ? <Text style={styles.error}>{message}</Text> : null}
        <TouchableOpacity accessibilityRole="button" style={styles.demoLink} onPress={() => { setCompany(DEMO_COMPANY); setBookings(DEMO_BOOKINGS); setDemo(true); setDemoFinished(false) }}>
          <Text style={styles.demoLinkText}>Preview offline demo</Text>
        </TouchableOpacity>
        <Text style={styles.footer}>Powered by TAXIO</Text>
      </> : <>
        {demo ? <Text style={styles.demoBanner}>OFFLINE DEMO · NO LIVE BOOKINGS</Text> : <Text style={styles.readOnlyBanner}>READ ONLY · LIVE ACTIONS DISABLED</Text>}
        <View style={styles.header}>
          {company.logo_url && !demo ? <Image source={{uri:company.logo_url}} style={styles.logo}/> :
            <View style={styles.logoFallback}><Text style={styles.logoText}>{company.name.trim().slice(0,2).toUpperCase()}</Text></View>}
          <View style={styles.companyInfo}><Text style={styles.title}>{company.name}</Text><Text style={styles.subtitle}>Company driver dashboard</Text></View>
        </View>
        <TouchableOpacity style={styles.onlineButton} onPress={() => setAvailable(v=>!v)}>
          <Text style={styles.onlineText}>{available ? '● Available' : '○ Offline'} {demo ? '(demo)' : '(display only)'}</Text>
        </TouchableOpacity>
        <View style={styles.summary}>
          <TouchableOpacity style={styles.summaryTile} onPress={() => setScreen('bookings')}>
            <Text style={styles.summaryNumber}>{pendingCount}</Text><Text style={styles.summaryLabel}>New requests</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.summaryTile} onPress={() => setScreen('bookings')}>
            <Text style={styles.summaryNumber}>{acceptedCount}</Text><Text style={styles.summaryLabel}>Accepted</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.summaryTile} onPress={() => setScreen('rescue')}>
            <Text style={styles.summaryNumber}>—</Text><Text style={styles.summaryLabel}>Rescue</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.nav}>
          {([{key:'bookings',label:'My Bookings'},{key:'rescue',label:'Rescue'},{key:'trip',label:'Current Trip'}] as const).map(t =>
            <TouchableOpacity key={t.key} style={[styles.tab, screen===t.key && styles.activeTab]} onPress={() => setScreen(t.key)}>
              <Text style={[styles.tabText, screen===t.key && styles.activeTabText]}>{t.label}</Text>
            </TouchableOpacity>)}
        </View>
        {actionMessage ? <Text style={styles.notice}>{actionMessage}</Text> : null}
        {screen==='bookings' ? <>
          <Text style={styles.section}>My Bookings</Text>
          {!demo ? <TouchableOpacity style={styles.secondary} disabled={actionBusy} onPress={async()=>{if(company){try{setBookings(await readCompanyBookings(company.id));setActionMessage('Bookings refreshed')}catch{setActionMessage('Unable to refresh bookings')}}}}><Text style={styles.secondaryText}>Refresh bookings</Text></TouchableOpacity> : null}
          <Text style={styles.subtitle}>Requests and journeys for your company</Text>
          {myBookings.length ? myBookings.map(b => <View key={b.id} style={styles.card}>
            <View style={styles.cardHeader}><Text style={[styles.pill,b.status==='accepted'?styles.pillAccepted:styles.pillNew]}>{b.status==='accepted'?'ACCEPTED':'NEW REQUEST'}</Text><Text style={styles.reference}>{b.booking_reference||'Trip'}</Text></View>
            <View style={styles.routeRow}><View style={styles.pickupDot}/><View style={styles.routeCopy}><Text style={styles.routeSmall}>PICKUP</Text><Text style={styles.route}>{b.pickup_address}</Text></View></View>
            <View style={styles.routeDivider}/>
            <View style={styles.routeRow}><View style={styles.destinationDot}/><View style={styles.routeCopy}><Text style={styles.routeSmall}>DESTINATION</Text><Text style={styles.route}>{b.dropoff_address}</Text></View></View>
            <View style={styles.cardFooter}><Text style={styles.note}>{demo?'Preview only · no booking changes':mobileActionsEnabled()?'TAXIO server verifies acceptance':'Read only · booking actions disabled'}</Text></View>
            {!demo && mobileActionsEnabled() && b.status==='new' && !!b.decision_deadline_at && Date.parse(b.decision_deadline_at)>Date.now() ? confirmBookingId===b.id ? <View style={styles.card}><Text style={styles.note}>Accept this real trip? This will notify the passenger and affect live operations.</Text><TouchableOpacity disabled={actionBusy} style={styles.primary} onPress={()=>acceptBooking(b.id)}><Text style={styles.primaryText}>{actionBusy?'Confirming…':'Confirm acceptance'}</Text></TouchableOpacity><TouchableOpacity onPress={()=>setConfirmBookingId(null)} style={styles.secondary}><Text style={styles.secondaryText}>Cancel</Text></TouchableOpacity></View> : <TouchableOpacity style={styles.primary} onPress={()=>setConfirmBookingId(b.id)}><Text style={styles.primaryText}>Accept booking</Text></TouchableOpacity> : null}
          </View>) : <Text style={styles.note}>No active bookings found.</Text>}
        </> : screen==='rescue' ? <>
          <Text style={styles.section}>Rescue</Text>
          <View style={styles.card}><Text style={styles.route}>No rescue offers available</Text><Text style={styles.note}>When connected, offers eligible for your company will appear here with an actual server deadline. The app will not invent sample offers.</Text></View>
        </> : <>
          <Text style={styles.section}>Current Trip</Text>
          <Text style={styles.subtitle}>Your active journey at a glance</Text>
          {demo && demoFinished ? <Text style={styles.note}>Sample trip finished.</Text> : currentTrip ? <View style={styles.card}>
            <Text style={styles.status}>ACCEPTED</Text><Text style={styles.route}>{currentTrip.pickup_address} → {currentTrip.dropoff_address}</Text>
            <Text style={styles.note}>Trip changes are disabled until backend permissions are verified.</Text>
            {demo ? <TouchableOpacity style={styles.secondary} onPress={() => setDemoFinished(true)}><Text style={styles.secondaryText}>Finish sample trip (local only)</Text></TouchableOpacity> : null}
          </View> : <Text style={styles.note}>No current trip.</Text>}
        </>}
        <TouchableOpacity style={styles.signOut} onPress={signOut}><Text style={styles.signOutText}>Sign out</Text></TouchableOpacity>
        <Text style={styles.footer}>Powered by TAXIO</Text>
      </>}
    </ScrollView>
  </SafeAreaView>
}
const styles = StyleSheet.create({
  page:{flex:1,backgroundColor:'#f7f9fc'},content:{padding:24,gap:12,flexGrow:1},
  heading:{fontSize:14,fontWeight:'800',color:'#64748b',textTransform:'uppercase',letterSpacing:1,marginTop:20},
  title:{fontSize:26,fontWeight:'800',color:'#111827'},subtitle:{fontSize:14,color:'#64748b',lineHeight:21},
  label:{fontWeight:'700',fontSize:15,color:'#1f2937',marginTop:12},
  input:{backgroundColor:'#fff',padding:15,borderRadius:13,borderWidth:1,borderColor:'#d9dee7',fontSize:16,color:'#111827'},
  primary:{backgroundColor:'#111a30',borderRadius:13,padding:17,alignItems:'center',marginTop:14},
  inactive:{opacity:.65},primaryText:{color:'#fff',fontWeight:'800',fontSize:16},
  notice:{color:'#92400e',fontSize:13,lineHeight:19},error:{color:'#b91c1c',fontSize:13},
  demoLink:{padding:12,alignItems:'center'},demoLinkText:{color:'#4b5563',fontWeight:'700',textDecorationLine:'underline'},
  demoBanner:{backgroundColor:'#fef3c7',color:'#92400e',fontSize:12,fontWeight:'800',textAlign:'center',padding:10,borderRadius:10},
  readOnlyBanner:{backgroundColor:'#dbeafe',color:'#1e40af',fontSize:12,fontWeight:'800',textAlign:'center',padding:10,borderRadius:10},
  header:{flexDirection:'row',alignItems:'center',gap:14,marginTop:8},logo:{width:66,height:66,borderRadius:15},
  logoFallback:{width:66,height:66,borderRadius:15,backgroundColor:'#111a30',justifyContent:'center',alignItems:'center'},
  logoText:{color:'#facc15',fontSize:24,fontWeight:'800'},companyInfo:{flex:1},
  onlineButton:{borderRadius:12,borderWidth:1,borderColor:'#cad4e0',padding:12,alignItems:'center',marginVertical:7},
  onlineText:{color:'#334155',fontWeight:'700'},
  nav:{flexDirection:'row',gap:5},tab:{flex:1,borderRadius:11,paddingVertical:12,paddingHorizontal:3,backgroundColor:'#e8edf3',alignItems:'center'},
  activeTab:{backgroundColor:'#111a30'},tabText:{color:'#475569',fontWeight:'700',fontSize:12},
  activeTabText:{color:'#fff'},section:{fontSize:21,fontWeight:'800',color:'#111827',marginTop:15},
  card:{backgroundColor:'#fff',borderWidth:1,borderColor:'#e2e8f0',borderRadius:17,padding:17,gap:7,marginTop:6},
  status:{color:'#b45309',fontSize:11,fontWeight:'800'},route:{fontSize:17,fontWeight:'700',color:'#111827'},
  arrow:{color:'#94a3b8'},note:{color:'#64748b',fontSize:13,lineHeight:21},
  secondary:{padding:12,borderRadius:10,borderWidth:1,borderColor:'#cbd5e1',alignItems:'center',marginTop:8},
  secondaryText:{color:'#334155',fontWeight:'700'},signOut:{alignItems:'center',padding:13,marginTop:18},
  signOutText:{color:'#64748b',fontWeight:'700'},footer:{textAlign:'center',color:'#94a3b8',fontSize:12,marginTop:20},
  summary:{flexDirection:'row',gap:8,marginTop:8},summaryTile:{flex:1,backgroundColor:'#fff',borderWidth:1,borderColor:'#e2e8f0',paddingVertical:14,paddingHorizontal:8,borderRadius:14,alignItems:'center',gap:4},summaryNumber:{fontSize:25,fontWeight:'800',color:'#111a30'},summaryLabel:{fontSize:11,fontWeight:'700',color:'#64748b',textAlign:'center'},
  cardHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:8},pill:{fontSize:10,fontWeight:'800',paddingHorizontal:10,paddingVertical:6,borderRadius:20,overflow:'hidden'},pillAccepted:{color:'#166534',backgroundColor:'#dcfce7'},pillNew:{color:'#92400e',backgroundColor:'#fef3c7'},reference:{fontSize:11,color:'#64748b'},routeRow:{flexDirection:'row',alignItems:'flex-start',gap:12},routeCopy:{flex:1},routeSmall:{fontSize:10,color:'#94a3b8',fontWeight:'800',letterSpacing:1,marginBottom:3},pickupDot:{width:12,height:12,borderRadius:6,backgroundColor:'#16a34a',marginTop:7},destinationDot:{width:12,height:12,borderRadius:3,backgroundColor:'#111a30',marginTop:7},routeDivider:{width:2,height:17,backgroundColor:'#cbd5e1',marginLeft:5},cardFooter:{borderTopWidth:1,borderTopColor:'#e2e8f0',paddingTop:10,marginTop:5}
})
