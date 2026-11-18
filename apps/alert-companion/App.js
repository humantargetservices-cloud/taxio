import React, { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import * as Linking from 'expo-linking'
import * as Notifications from 'expo-notifications'
import notifee, { EventType } from '@notifee/react-native'
import { assertSupabaseConfigured } from './src/supabase'
import { registerNativeDevice, unregisterNativeDevice } from './src/deviceRegistration'
import {
  extractTaxioAlertData,
  openTaxioFromAlert,
  showLocalTestAlert,
  startAndroidAlert,
} from './src/alertEngine'
import { TAXIO_API_ORIGIN } from './src/config'

export default function App() {
  const supabase = useMemo(() => {
    try { return assertSupabaseConfigured() } catch { return null }
  }, [])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [session, setSession] = useState(null)
  const [company, setCompany] = useState(null)
  const [status, setStatus] = useState('Checking TAXIO connection…')
  const [busy, setBusy] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setStatus('Build configuration is missing Supabase public settings.')
      setBusy(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data?.session || null)
      setBusy(false)
    })
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null)
    })
    return () => subscription?.subscription?.unsubscribe()
  }, [supabase])

  useEffect(() => {
    if (!session?.access_token) return
    let cancelled = false
    setBusy(true)
    setStatus('Connecting native alerts…')
    registerNativeDevice(session.access_token)
      .then((result) => {
        if (cancelled) return
        setCompany(result.company)
        setStatus('Native trip alerts are connected.')
      })
      .catch((err) => {
        if (cancelled) return
        setStatus(err?.message || 'Could not enable native alerts.')
      })
      .finally(() => {
        if (!cancelled) setBusy(false)
      })
    return () => { cancelled = true }
  }, [session?.access_token])

  useEffect(() => {
    const received = Notifications.addNotificationReceivedListener((notification) => {
      const alert = extractTaxioAlertData(notification)
      if (alert && Platform.OS === 'android') void startAndroidAlert(alert)
    })
    const pressed = Notifications.addNotificationResponseReceivedListener((response) => {
      void openTaxioFromAlert(response.notification)
    })
    const foregroundNotifee = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS || type === EventType.ACTION_PRESS) {
        void openTaxioFromAlert(detail.notification?.data)
      }
    })
    if (Platform.OS === 'android') {
      notifee.getInitialNotification()
        .then((initial) => {
          if (initial?.notification?.data) void openTaxioFromAlert(initial.notification.data)
        })
        .catch(() => {})
    }

    return () => {
      received.remove()
      pressed.remove()
      foregroundNotifee()
    }
  }, [])

  const login = async () => {
    if (!supabase) return
    setBusy(true)
    setStatus('Signing in…')
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) {
      setStatus(error.message)
      setBusy(false)
      return
    }
    setSession(data.session)
    setPassword('')
  }

  const logout = async () => {
    if (!supabase) return
    setBusy(true)
    try {
      await unregisterNativeDevice(session?.access_token)
      await supabase.auth.signOut()
      setCompany(null)
      setStatus('Signed out.')
    } finally {
      setBusy(false)
    }
  }

  if (busy && !session) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.card}>
          <ActivityIndicator size="large" />
          <Text style={styles.muted}>{status}</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.card}>
          <Text style={styles.logo}>TAXIO</Text>
          <Text style={styles.title}>Driver Alerts</Text>
          <Text style={styles.muted}>
            This companion handles urgent trip alerts only. Your TAXIO dashboard remains on the web.
          </Text>
          <TextInput value={email} onChangeText={setEmail} autoCapitalize="none"
            keyboardType="email-address" placeholder="TAXIO email" style={styles.input} />
          <TextInput value={password} onChangeText={setPassword} secureTextEntry
            placeholder="Password" style={styles.input} />
          <TouchableOpacity style={styles.primary} onPress={login} disabled={busy}>
            <Text style={styles.primaryText}>{busy ? 'Signing in…' : 'Connect TAXIO'}</Text>
          </TouchableOpacity>
          <Text style={styles.status}>{status}</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.logo}>TAXIO</Text>
        <Text style={styles.title}>Driver Alerts</Text>
        <View style={styles.okBox}>
          <Text style={styles.ok}>✓ Connected</Text>
          <Text style={styles.company}>{company?.name || 'TAXIO company'}</Text>
          <Text style={styles.muted}>{status}</Text>
        </View>

        <TouchableOpacity style={styles.primary} onPress={() => showLocalTestAlert()}>
          <Text style={styles.primaryText}>Test aggressive alert</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondary}
          onPress={() => Linking.openURL(`${TAXIO_API_ORIGIN}/dashboard/company`)}>
          <Text style={styles.secondaryText}>Open TAXIO dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logout} onPress={logout} disabled={busy}>
          <Text style={styles.logoutText}>Disconnect this phone</Text>
        </TouchableOpacity>

        <Text style={styles.foot}>
          Android: ongoing native alert until the request ends or its 49-second server deadline.
          iPhone: time-sensitive native notification; Apple sound and Focus settings remain authoritative.
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen:{flex:1,backgroundColor:'#f4f6f8',justifyContent:'center',padding:22},
  card:{backgroundColor:'#fff',borderRadius:18,padding:24,gap:14},
  logo:{fontSize:32,fontWeight:'900',letterSpacing:1},
  title:{fontSize:22,fontWeight:'800'},
  muted:{color:'#59636e',lineHeight:20},
  input:{borderWidth:1,borderColor:'#d8dde3',borderRadius:12,paddingHorizontal:14,paddingVertical:13,fontSize:16},
  primary:{backgroundColor:'#111827',borderRadius:12,padding:15,alignItems:'center'},
  primaryText:{color:'#fff',fontWeight:'800'},
  secondary:{borderWidth:1,borderColor:'#111827',borderRadius:12,padding:14,alignItems:'center'},
  secondaryText:{color:'#111827',fontWeight:'800'},
  okBox:{backgroundColor:'#f1f8f3',borderRadius:12,padding:15,gap:4},
  ok:{color:'#166534',fontWeight:'900',fontSize:18},
  company:{fontWeight:'800',fontSize:17},
  status:{color:'#7c2d12',fontSize:13},
  logout:{padding:10,alignItems:'center'},
  logoutText:{color:'#991b1b',fontWeight:'700'},
  foot:{color:'#6b7280',fontSize:12,lineHeight:17,marginTop:4},
})
