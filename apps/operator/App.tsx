import * as Notifications from 'expo-notifications'
import QRCode from 'react-native-qrcode-svg'
import { sendOperatorAction, mobileActionsEnabled } from './src/operatorActions'
import React, { useEffect, useRef, useState } from 'react'
import { SafeAreaView, ScrollView, StatusBar, Image, StyleSheet, Text, TextInput, TouchableOpacity, View, Modal, Share, RefreshControl, AppState, Linking, Alert } from 'react-native'
import { integrationConfigured, operatorDb, loginOperator, resolveOperatorCompany, readCompanyBookings, restoreOperatorCompany, readCompanyRescueOffers, type RescueOffer, type OperatorCompany } from './src/backend'

type Booking = { id: string; pickup_address: string; dropoff_address: string; status: string; booking_reference?: string | null; decision_deadline_at?: string | null; created_at?: string | null; ride_datetime?: string | null; customer_name?: string | null; completed_at?: string | null }
type Screen = 'bookings' | 'rescue' | 'trip'
const DEMO_BOOKINGS: Booking[] = [
  { id: 'demo-booking-1', pickup_address: 'Leuven Station', dropoff_address: 'Brussels Airport', status: 'new' },
  { id: 'demo-trip-1', pickup_address: 'Aarschot', dropoff_address: 'Leuven', status: 'accepted' },
]
Notifications.setNotificationHandler({handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:true,shouldSetBadge:false})})
const DEMO_COMPANY: OperatorCompany = { id: 'demo', name: 'ABC Taxi', logo_url: null, status: 'approved' }
export default function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [company, setCompany] = useState<OperatorCompany | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [rescueOffers,setRescueOffers] = useState<RescueOffer[]>([])
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
  const [qrOpen,setQrOpen] = useState(false)
  const [tripOpen,setTripOpen] = useState(false)
  const [tripConfirm,setTripConfirm] = useState<'mark_on_way'|'mark_arrived'|'complete_trip'|null>(null)
  const [refreshing,setRefreshing] = useState(false)
  const seenBookingIds=useRef<Set<string>|null>(null)
  const [incomingTrip,setIncomingTrip]=useState<Booking|null>(null)
  const [clockNow,setClockNow]=useState(Date.now())
  useEffect(()=>{const timer=setInterval(()=>setClockNow(Date.now()),1000);return()=>clearInterval(timer)},[])
  useEffect(()=>{
    const listener=Notifications.addNotificationResponseReceivedListener(response=>{
      const id=response.notification.request.content.data?.bookingId
      if(typeof id==='string'){setScreen('bookings');setIncomingTrip(bookings.find(b=>b.id===id)||null)}
    })
    return()=>listener.remove()
  },[bookings])
  useEffect(()=>{void Notifications.setNotificationChannelAsync('taxio-trips',{name:'TAXIO Trips',importance:Notifications.AndroidImportance.HIGH,sound:'default'});void Notifications.requestPermissionsAsync()},[])
  const bookingUrl = company?.slug && /^[a-z0-9-]+$/.test(company.slug) ? `https://${company.slug}.taxio.be` : null
  async function navigateTo(address:string,provider:'waze'|'google') {
    if(!address?.trim()) {Alert.alert('Navigation unavailable','Trip destination is missing.');return}
    const encoded=encodeURIComponent(address.trim())
    const url=provider==='waze'? `https://waze.com/ul?q=${encoded}&navigate=yes`:`https://www.google.com/maps/dir/?api=1&destination=${encoded}&travelmode=driving`
    try{await Linking.openURL(url)}catch{Alert.alert('Unable to open navigation','Please install Waze or Google Maps, or check your internet connection.')}
  }
  async function refreshBookings() {
    if (!company || demo || refreshing) return
    setRefreshing(true)
    try { setBookings(await readCompanyBookings(company.id));try{setRescueOffers(await readCompanyRescueOffers(company.id))}catch{/* Rescue availability is independent of bookings. */} setActionMessage('Bookings updated') }
    catch(e) {setActionMessage(e instanceof Error ? e.message : 'Unable to refresh bookings')}
    finally{setRefreshing(false)}
  }
  async function updateTrip(action: 'mark_on_way'|'mark_arrived'|'complete_trip') {
    if(!company || !currentTrip || demo || !mobileActionsEnabled() || actionBusy) return
    setActionBusy(true);setActionMessage('')
    try {
      const result=await sendOperatorAction('https://www.taxio.be',company.id,{action,companyId:company.id,bookingRequestId:currentTrip.id})
      if(!result.ok) throw Error(result.error || result.code || 'Unable to update passenger')
      setBookings(await readCompanyBookings(company.id))
      setActionMessage(action==='mark_on_way'?'Passenger updated: on the way':action==='mark_arrived'?'Passenger updated: arrived':'Trip completed')
      if(action==='complete_trip')setTripOpen(false)
    }catch(e){setActionMessage(e instanceof Error?e.message:'Update failed')}
    finally{setActionBusy(false);setTripConfirm(null)}
  }
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
          if (active) {setCompany(existing);seenBookingIds.current=new Set(rows.map(b=>b.id));setBookings(rows);setDemo(false);try{setRescueOffers(await readCompanyRescueOffers(existing.id))}catch{/* rescue access may be unavailable */}}
        }
      } catch { /* Show login; never grant access without verified session. */ }
      finally {if(active)setRestoring(false)}
    }
    void run()
    return () => {active=false}
  }, [])

  useEffect(() => {
    if (!company || demo) return
    let active = true
    const update = async () => {
      try {const rows=await readCompanyBookings(company.id);if(active){const ids=new Set(rows.map(b=>b.id));const incoming=seenBookingIds.current===null?null:rows.find(b=>b.status==='new'&&!seenBookingIds.current?.has(b.id));seenBookingIds.current=ids;setBookings(rows);if(incoming){setScreen('bookings');setIncomingTrip(incoming);void Notifications.scheduleNotificationAsync({content:{title:'New TAXIO booking',body:incoming.pickup_address+' → '+incoming.dropoff_address,data:{bookingId:incoming.id}},trigger:null}).catch(()=>Alert.alert('New TAXIO booking',incoming.pickup_address+' → '+incoming.dropoff_address))}try{setRescueOffers(await readCompanyRescueOffers(company.id))}catch{/* permission may not allow rescue */}}}
      catch {/* Manual refresh exposes network errors. */}
    }
    const timer=setInterval(()=>{if(AppState.currentState==='active')void update()},10000)
    const subscription=AppState.addEventListener('change',state=>{if(state==='active')void update()})
    return()=>{active=false;clearInterval(timer);subscription.remove()}
  },[company?.id,demo])

  async function signIn() {
    if (!integrationConfigured || busy) return
    setBusy(true); setMessage('')
    try {
      const session = await loginOperator(email, password)
      const ownerCompany = await resolveOperatorCompany(session.user.id)
      if (!ownerCompany || ownerCompany.status !== 'approved') throw Error('No approved company found for this account.')
      const rows = await readCompanyBookings(ownerCompany.id)
      setCompany(ownerCompany)
      seenBookingIds.current=new Set(rows.map(b=>b.id));setBookings(rows)
      try{setRescueOffers(await readCompanyRescueOffers(ownerCompany.id))}catch{/* rescue access may be unavailable */}
      setDemo(false)
      setPassword('')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Unable to sign in')
      await operatorDb?.auth.signOut()
    } finally { setBusy(false) }
  }

  async function signOut() {
    if (!demo) await operatorDb?.auth.signOut()
    setCompany(null);setIncomingTrip(null);seenBookingIds.current=null;setBookings([]);setRescueOffers([]); setDemo(false); setScreen('bookings')
  }

  const myBookings = bookings.filter(b => (b.status === 'new' || b.status === 'accepted') && !b.completed_at)
  const historyBookings = bookings.filter(b => b.completed_at || (b.status !== 'new' && b.status !== 'accepted'))
  const formatTripDate = (date?:string|null) => date ? new Date(date).toLocaleString('en-BE',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : 'Time not specified'
  const currentTrip = bookings.find(b => b.status === 'accepted' && !b.completed_at)
  const pendingCount = bookings.filter(b => b.status === 'new' && !!b.decision_deadline_at && Date.parse(b.decision_deadline_at) > clockNow).length
  const acceptedCount = bookings.filter(b => b.status === 'accepted' && !b.completed_at).length
  return <SafeAreaView style={styles.page}>
    <StatusBar barStyle="dark-content" />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshBookings} enabled={!!company && !demo} />}>
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
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            {company.logo_url && !demo ? <Image source={{uri:company.logo_url}} style={styles.heroLogo}/> :
              <View style={styles.heroLogoFallback}><Text style={styles.heroLogoText}>{company.name.trim().slice(0,2).toUpperCase()}</Text></View>}
            <View style={styles.heroIdentity}><Text style={styles.heroEyebrow}>YOUR COMPANY</Text><Text style={styles.heroName} numberOfLines={2}>{company.name}</Text><Text style={styles.heroSub}>Driver workspace</Text></View>
          </View>
          <View style={styles.heroSeparator}/>
          <View style={styles.heroBottom}>
            <View style={{flex:1}}><Text style={styles.heroStatusTitle}>{available ? 'Ready for trips' : 'Not available'}</Text><Text style={styles.heroStatusSub}>{demo?'Demo availability': 'Local display only · not linked to dispatch'}</Text></View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={available?'Set offline preview':'Set available preview'} style={[styles.heroAvailability,available?styles.heroAvailable:styles.heroOffline]} onPress={()=>setAvailable(v=>!v)}>
              <Text style={styles.heroAvailabilityText}>{available?'● ONLINE':'○ OFFLINE'}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity accessibilityRole="button" style={styles.shareBanner} onPress={()=>setQrOpen(true)}><View style={{flex:1}}><Text style={styles.shareOverline}>GROW YOUR BOOKINGS</Text><Text style={styles.shareTitle}>Share your booking QR</Text><Text style={styles.shareSubtitle}>Let passengers book directly with your company</Text></View><View style={styles.qrBadge}><Text style={styles.qrBadgeText}>▦</Text></View></TouchableOpacity>
        <View style={styles.overviewHead}><Text style={styles.overviewTitle}>Overview</Text><Text style={styles.overviewHint}>At a glance</Text></View>
        <View style={styles.summary}>
          <TouchableOpacity style={styles.metric} onPress={() => setScreen('bookings')}>
            <View style={styles.metricIcon}><Text style={styles.metricGlyph}>◉</Text></View>
            <Text style={styles.metricNumber}>{pendingCount}</Text><Text style={styles.metricLabel}>Live requests</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.metric} onPress={() => setScreen('bookings')}>
            <View style={styles.metricIcon}><Text style={styles.metricGlyph}>✓</Text></View>
            <Text style={styles.metricNumber}>{acceptedCount}</Text><Text style={styles.metricLabel}>Active trips</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.metric} onPress={() => setScreen('rescue')}>
            <View style={styles.metricIcon}><Text style={styles.metricGlyph}>↗</Text></View>
            <Text style={styles.metricNumber}>{rescueOffers.filter(o=>o.status==='pending'&&!!o.expires_at&&Date.parse(o.expires_at)>Date.now()).length}</Text><Text style={styles.metricLabel}>Rescue</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.spotlight} onPress={() => currentTrip ? setTripOpen(true) : setScreen('bookings')}>
          <View style={styles.spotlightCopy}>
            <Text style={styles.spotlightEyebrow}>{currentTrip?'CURRENT JOURNEY':'YOUR NEXT JOURNEY'}</Text>
            <Text style={styles.spotlightTitle}>{currentTrip?'Trip in progress':pendingCount?'New booking waiting':'All caught up'}</Text>
            <Text style={styles.spotlightText} numberOfLines={2}>{currentTrip?currentTrip.pickup_address+' → '+currentTrip.dropoff_address:pendingCount?'Open My Bookings to review requests':'New company bookings will appear here'}</Text>
          </View>
          <View style={styles.spotlightArrow}><Text style={styles.spotlightArrowText}>›</Text></View>
        </TouchableOpacity>
        <Text style={styles.overviewTitle}>Workspace</Text>
        <View style={styles.nav}>
          {([{key:'bookings',label:'My Bookings',symbol:'▤'},{key:'rescue',label:'Rescue',symbol:'↗'},{key:'trip',label:'Current Trip',symbol:'◉'}] as const).map(t =>
            <TouchableOpacity key={t.key} accessibilityRole="button" accessibilityState={{selected:screen===t.key}} style={[styles.tab, screen===t.key && styles.activeTab]} onPress={() => setScreen(t.key)}>
              <Text style={[styles.navIcon, screen===t.key && styles.activeTabText]}>{t.symbol}</Text>
              <Text style={[styles.tabText, screen===t.key && styles.activeTabText]}>{t.label}</Text>
            </TouchableOpacity>)}
        </View>
        {actionMessage ? <Text style={styles.notice}>{actionMessage}</Text> : null}
        {screen==='bookings' ? <>
          <Text style={styles.section}>My Bookings</Text>
          {!demo ? <TouchableOpacity style={styles.secondary} disabled={refreshing} onPress={refreshBookings}><Text style={styles.secondaryText}>{refreshing?'Refreshing…':'↻ Refresh bookings'}</Text></TouchableOpacity> : null}
          <Text style={styles.subtitle}>Requests and journeys for your company</Text>
          {myBookings.length ? myBookings.map(b => <View key={b.id} style={styles.card}>
            <View style={styles.cardHeader}><Text style={[styles.pill,b.status==='accepted'?styles.pillAccepted:styles.pillNew]}>{b.status==='accepted'?'ACCEPTED':'NEW REQUEST'}</Text><Text style={styles.reference}>{b.booking_reference||'Trip'}</Text></View>
            <Text style={styles.tripMeta}>{b.customer_name ? b.customer_name+'  ·  ' : ''}{formatTripDate(b.ride_datetime || b.created_at)}</Text>
            <View style={styles.routeRow}><View style={styles.pickupDot}/><View style={styles.routeCopy}><Text style={styles.routeSmall}>PICKUP</Text><Text style={styles.route}>{b.pickup_address}</Text></View></View>
            <View style={styles.routeDivider}/>
            <View style={styles.routeRow}><View style={styles.destinationDot}/><View style={styles.routeCopy}><Text style={styles.routeSmall}>DESTINATION</Text><Text style={styles.route}>{b.dropoff_address}</Text></View></View>
            <View style={styles.cardFooter}><Text style={styles.note}>{demo?'Preview only · no booking changes':mobileActionsEnabled()?'TAXIO server verifies acceptance':'Read only · booking actions disabled'}</Text></View>
            {!demo && mobileActionsEnabled() && b.status==='new' && !!b.decision_deadline_at && Date.parse(b.decision_deadline_at)>Date.now() ? confirmBookingId===b.id ? <View style={styles.card}><Text style={styles.note}>Accept this real trip? This will notify the passenger and affect live operations.</Text><TouchableOpacity disabled={actionBusy} style={styles.primary} onPress={()=>acceptBooking(b.id)}><Text style={styles.primaryText}>{actionBusy?'Confirming…':'Confirm acceptance'}</Text></TouchableOpacity><TouchableOpacity onPress={()=>setConfirmBookingId(null)} style={styles.secondary}><Text style={styles.secondaryText}>Cancel</Text></TouchableOpacity></View> : <TouchableOpacity style={styles.primary} onPress={()=>setConfirmBookingId(b.id)}><Text style={styles.primaryText}>Accept booking</Text></TouchableOpacity> : null}
          </View>) : <Text style={styles.note}>No active bookings. Pull down to check for new requests.</Text>}
          <Text style={styles.section}>Recent history</Text>
          {historyBookings.length?historyBookings.slice(0,12).map(b=><View key={b.id} style={styles.historyCard}><View style={{flex:1}}><Text style={styles.historyStatus}>{b.status.toUpperCase()} · {formatTripDate(b.ride_datetime || b.created_at)}</Text><Text style={styles.historyRoute} numberOfLines={2}>{b.pickup_address} → {b.dropoff_address}</Text></View></View>):<Text style={styles.note}>No previous bookings.</Text>}
        </> : screen==='rescue' ? <>
          <Text style={styles.section}>Rescue</Text>
          {rescueOffers.filter(o=>o.status==='pending' && !!o.expires_at && Date.parse(o.expires_at)>Date.now()).length ?
            rescueOffers.filter(o=>o.status==='pending' && !!o.expires_at && Date.parse(o.expires_at)>Date.now()).map(o=>
              <View key={o.id} style={styles.card}><Text style={styles.status}>RESCUE OFFER · EXPIRES {formatTripDate(o.expires_at)}</Text><Text style={styles.route}>{o.rescue?.preview_pickup_label||'Pickup unavailable'} → {o.rescue?.preview_dropoff_label||'Destination unavailable'}</Text><Text style={styles.note}>Acceptance will be enabled only after secure API testing. Server deadline is authoritative.</Text></View>)
            :<View style={styles.card}><Text style={styles.route}>No active rescue offers</Text><Text style={styles.note}>Eligible company offers will appear here automatically while the app is open.</Text></View>}
        </> : <>
          <Text style={styles.section}>Current Trip</Text>
          <Text style={styles.subtitle}>Your active journey at a glance</Text>
          {currentTrip ? <TouchableOpacity style={styles.primary} onPress={()=>setTripOpen(true)}><Text style={styles.primaryText}>Open trip details  ›</Text></TouchableOpacity> : null}
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
    <Modal visible={!!incomingTrip} transparent animationType="slide" onRequestClose={()=>setIncomingTrip(null)}>
      <View style={styles.modalBackdrop}><View style={styles.modalCard}>
        <View style={styles.cardHeader}><Text style={styles.modalTitle}>Incoming trip</Text><TouchableOpacity onPress={()=>setIncomingTrip(null)}><Text style={styles.secondaryText}>Close ✕</Text></TouchableOpacity></View>
        <Text style={styles.tripMeta}>{incomingTrip?.customer_name||'New passenger'} · {formatTripDate(incomingTrip?.ride_datetime)}</Text>
        <View style={styles.card}><Text style={styles.routeSmall}>PICKUP</Text><Text style={styles.route}>{incomingTrip?.pickup_address||''}</Text></View>
        <View style={styles.card}><Text style={styles.routeSmall}>DESTINATION</Text><Text style={styles.route}>{incomingTrip?.dropoff_address||''}</Text></View>
        <Text style={styles.note}>{incomingTrip?.decision_deadline_at && Date.parse(incomingTrip.decision_deadline_at)>clockNow ? `Offer expires in ${Math.ceil((Date.parse(incomingTrip.decision_deadline_at)-clockNow)/1000)} seconds`:'This booking has no active acceptance deadline. It may be historical or not yet activated.'}</Text>
        {incomingTrip && !demo && mobileActionsEnabled() && !!incomingTrip.decision_deadline_at && Date.parse(incomingTrip.decision_deadline_at)>clockNow ?
          <TouchableOpacity style={styles.primary} onPress={()=>{setIncomingTrip(null);setConfirmBookingId(incomingTrip.id);setScreen('bookings')}}><Text style={styles.primaryText}>Review & accept</Text></TouchableOpacity> :
          <TouchableOpacity style={styles.secondary} onPress={()=>{setIncomingTrip(null);setScreen('bookings')}}><Text style={styles.secondaryText}>View in My Bookings</Text></TouchableOpacity>}
        <TouchableOpacity style={styles.secondary} onPress={()=>setIncomingTrip(null)}><Text style={styles.secondaryText}>Dismiss</Text></TouchableOpacity>
      </View></View>
    </Modal>
        <Modal visible={tripOpen} transparent animationType="slide" onRequestClose={()=>setTripOpen(false)}>
      <View style={styles.modalBackdrop}><ScrollView contentContainerStyle={styles.modalCard}>
        <View style={styles.cardHeader}><Text style={styles.modalTitle}>Active trip</Text><TouchableOpacity onPress={()=>setTripOpen(false)}><Text style={styles.secondaryText}>Close ✕</Text></TouchableOpacity></View>
        {currentTrip ? <>
          <Text style={styles.status}>ACCEPTED · {currentTrip.booking_reference||'BOOKING'}</Text>
          <Text style={styles.tripMeta}>{formatTripDate(currentTrip.ride_datetime || currentTrip.created_at)}</Text>
          {currentTrip.customer_name?<Text style={styles.route}>{currentTrip.customer_name}</Text>:null}
          <View style={styles.card}><Text style={styles.routeSmall}>PICKUP</Text><Text style={styles.route}>{currentTrip.pickup_address}</Text></View>
          <View style={styles.card}><Text style={styles.routeSmall}>DESTINATION</Text><Text style={styles.route}>{currentTrip.dropoff_address}</Text></View>
          <Text style={styles.overviewTitle}>Navigation to pickup</Text>
          <View style={styles.navigationRow}>
            <TouchableOpacity accessibilityRole="button" style={styles.navigationButton} onPress={()=>navigateTo(currentTrip.pickup_address,'waze')}><Text style={styles.navigationText}>↗ Waze</Text></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" style={styles.navigationButton} onPress={()=>navigateTo(currentTrip.pickup_address,'google')}><Text style={styles.navigationText}>↗ Google Maps</Text></TouchableOpacity>
          </View>
          <Text style={styles.overviewTitle}>Navigation to destination</Text>
          <View style={styles.navigationRow}>
            <TouchableOpacity accessibilityRole="button" style={styles.navigationButton} onPress={()=>navigateTo(currentTrip.dropoff_address,'waze')}><Text style={styles.navigationText}>↗ Waze</Text></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" style={styles.navigationButton} onPress={()=>navigateTo(currentTrip.dropoff_address,'google')}><Text style={styles.navigationText}>↗ Google Maps</Text></TouchableOpacity>
          </View>
          <Text style={styles.note}>{demo?'Preview mode':mobileActionsEnabled()?'Updates are sent to the TAXIO server; passenger status changes follow existing server behavior.':'Passenger updates are disabled until live pilot verification.'}</Text>
          {(['mark_on_way','mark_arrived','complete_trip'] as const).map(action =>
            <TouchableOpacity key={action} disabled={demo||!mobileActionsEnabled()||actionBusy} style={[styles.primary,(demo||!mobileActionsEnabled())&&styles.inactive]} onPress={()=>setTripConfirm(action)}>
              <Text style={styles.primaryText}>{action==='mark_on_way'?'On the way':action==='mark_arrived'?'I have arrived':'Complete trip'}</Text>
            </TouchableOpacity>)}
          {tripConfirm?<View style={styles.card}><Text style={styles.route}>Confirm status update?</Text><Text style={styles.note}>This will update the live trip status on TAXIO.</Text><TouchableOpacity style={styles.primary} disabled={actionBusy} onPress={()=>updateTrip(tripConfirm)}><Text style={styles.primaryText}>{actionBusy?'Updating…':'Confirm update'}</Text></TouchableOpacity><TouchableOpacity style={styles.secondary} onPress={()=>setTripConfirm(null)}><Text style={styles.secondaryText}>Cancel</Text></TouchableOpacity></View>:null}
          {actionMessage?<Text style={styles.note}>{actionMessage}</Text>:null}
        </>:<Text style={styles.note}>No active trip found.</Text>}
      </ScrollView></View>
    </Modal>
    <Modal visible={qrOpen} transparent animationType="slide" onRequestClose={()=>setQrOpen(false)}><View style={styles.modalBackdrop}><View style={styles.modalCard}><Text style={styles.modalTitle}>Share your booking page</Text><Text style={styles.subtitle}>Passengers scan and book your taxi directly.</Text>{bookingUrl ? <><View style={styles.qrPanel}><QRCode value={bookingUrl} size={216} backgroundColor="#ffffff" color="#111a30" /></View><Text selectable style={styles.qrUrl}>{bookingUrl}</Text><TouchableOpacity style={styles.primary} onPress={()=>Share.share({message:`Book a taxi with ${company?.name}: ${bookingUrl}`,url:bookingUrl})}><Text style={styles.primaryText}>Share booking link</Text></TouchableOpacity></> : <Text style={styles.notice}>This company has no verified booking subdomain yet. Open the web dashboard to check its booking link.</Text>}<TouchableOpacity style={styles.secondary} onPress={()=>setQrOpen(false)}><Text style={styles.secondaryText}>Close</Text></TouchableOpacity></View></View></Modal>
  </SafeAreaView>
}
const styles = StyleSheet.create({
  hero:{backgroundColor:'#121b32',padding:20,borderRadius:24,marginTop:4,gap:18},
  heroTop:{flexDirection:'row',gap:14,alignItems:'center'},
  heroLogo:{width:58,height:58,borderRadius:15,backgroundColor:'#fff'},
  heroLogoFallback:{width:58,height:58,borderRadius:15,backgroundColor:'#facc15',alignItems:'center',justifyContent:'center'},
  heroLogoText:{fontWeight:'900',fontSize:23,color:'#10182a'},
  heroIdentity:{flex:1,gap:3},
  heroEyebrow:{fontSize:10,fontWeight:'800',letterSpacing:1.5,color:'#9aa9c8'},
  heroName:{fontWeight:'900',fontSize:24,color:'#fff'},
  heroSub:{fontSize:12,color:'#b9c7de'},
  heroSeparator:{height:1,backgroundColor:'#34415a'},
  heroBottom:{flexDirection:'row',gap:12,alignItems:'center'},
  heroStatusTitle:{color:'#fff',fontSize:15,fontWeight:'800'},
  heroStatusSub:{color:'#a5b4cd',fontSize:11,marginTop:4},
  heroAvailability:{borderRadius:25,paddingHorizontal:13,paddingVertical:11,borderWidth:1},
  heroAvailable:{backgroundColor:'#153f34',borderColor:'#388568'},heroOffline:{backgroundColor:'#374151',borderColor:'#667085'},
  heroAvailabilityText:{fontWeight:'900',fontSize:11,color:'#fff'},
  overviewHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:8},
  overviewTitle:{fontSize:19,fontWeight:'900',color:'#111827'},overviewHint:{color:'#94a3b8',fontSize:12},
  metric:{flex:1,borderWidth:1,borderColor:'#e5e9f1',backgroundColor:'#fff',borderRadius:18,padding:13,alignItems:'flex-start',gap:5},
  metricIcon:{height:28,width:28,backgroundColor:'#fff5ce',borderRadius:8,alignItems:'center',justifyContent:'center'},
  metricGlyph:{fontSize:18,color:'#9a6700',fontWeight:'800'},
  metricNumber:{fontSize:28,color:'#121b32',fontWeight:'900'},
  metricLabel:{fontSize:11,color:'#64748b',fontWeight:'700'},
  spotlight:{backgroundColor:'#ffedb3',borderColor:'#f2d876',borderWidth:1,borderRadius:20,padding:17,flexDirection:'row',alignItems:'center',gap:8},
  spotlightCopy:{flex:1,gap:5},spotlightEyebrow:{fontSize:10,color:'#8a6109',fontWeight:'900',letterSpacing:1.1},
  spotlightTitle:{fontSize:18,color:'#302913',fontWeight:'900'},spotlightText:{fontSize:12,color:'#715c2b',lineHeight:18},
  spotlightArrow:{height:35,width:35,borderRadius:18,backgroundColor:'#fff7db',alignItems:'center',justifyContent:'center'},
  spotlightArrowText:{fontSize:29,fontWeight:'700',color:'#715c2b'},
  navIcon:{fontSize:19,fontWeight:'800',color:'#51617a'},
  navigationRow:{flexDirection:'row',gap:10},navigationButton:{flex:1,backgroundColor:'#eaf0fb',borderRadius:13,paddingVertical:14,paddingHorizontal:6,alignItems:'center'},navigationText:{fontSize:13,fontWeight:'800',color:'#18376a'},
  shareBanner:{backgroundColor:'#fff',borderRadius:18,padding:17,borderWidth:1,borderColor:'#e5e9f1',flexDirection:'row',alignItems:'center',gap:12},shareOverline:{fontSize:10,fontWeight:'900',color:'#aa7908',letterSpacing:1},shareTitle:{fontSize:17,fontWeight:'900',color:'#151d30',marginTop:4},shareSubtitle:{fontSize:12,color:'#64748b',marginTop:3},qrBadge:{width:54,height:54,borderRadius:14,backgroundColor:'#fef3c7',alignItems:'center',justifyContent:'center'},qrBadgeText:{fontSize:35,color:'#111a30'},tripMeta:{fontSize:12,color:'#64748b',marginBottom:8},historyCard:{padding:14,backgroundColor:'#fff',borderWidth:1,borderColor:'#e5e9f1',borderRadius:14,flexDirection:'row'},historyStatus:{fontSize:10,color:'#64748b',fontWeight:'800'},historyRoute:{color:'#111827',fontWeight:'700',fontSize:13,marginTop:6},modalBackdrop:{flex:1,backgroundColor:'rgba(9,16,30,.7)',justifyContent:'flex-end'},modalCard:{backgroundColor:'#fff',padding:25,borderTopLeftRadius:26,borderTopRightRadius:26,gap:14,alignItems:'stretch'},modalTitle:{fontWeight:'900',fontSize:23,color:'#111827'},qrPanel:{alignItems:'center',padding:20,backgroundColor:'#fff',borderRadius:18},qrUrl:{textAlign:'center',color:'#34415a',fontSize:13,fontWeight:'700'},
  page:{flex:1,backgroundColor:'#f3f5f9'},content:{paddingHorizontal:18,paddingVertical:22,gap:12,flexGrow:1},
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
  nav:{flexDirection:'row',gap:7},tab:{flex:1,borderRadius:15,paddingVertical:14,paddingHorizontal:3,backgroundColor:'#fff',borderWidth:1,borderColor:'#e5e9f1',alignItems:'center',gap:5},
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
