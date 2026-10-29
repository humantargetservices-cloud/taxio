import React, { useEffect } from 'react'
import { BackHandler, Share, Text, TouchableOpacity, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { theme } from '../theme/theme'

export function QrSheet({
  visible,
  companyName,
  url,
  onClose,
}: {
  visible: boolean
  companyName: string
  url: string | null
  onClose: () => void
}) {
  useEffect(() => {
    if (!visible) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onClose(); return true })
    return () => sub.remove()
  }, [visible, onClose])

  if (!visible) return null
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(4,8,16,0.72)', justifyContent: 'center', padding: 18, zIndex: 20 }}>
      <View style={{ backgroundColor: theme.card, borderRadius: 22, padding: 18, gap: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800', flex: 1 }}>Scan to book with {companyName}</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close booking QR" onPress={onClose} style={{ backgroundColor: '#243049', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 }}>
            <Text style={{ color: theme.text, fontWeight: '700' }}>Close</Text>
          </TouchableOpacity>
        </View>
        {url ? (
          <View style={{ width: 212, height: 212, backgroundColor: '#fff', borderRadius: 12, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <QRCode value={url} size={180} />
          </View>
        ) : <Text style={{ color: theme.muted }}>A booking QR is available only for an isolated staging company address.</Text>}
        {url ? <Text style={{ color: theme.muted }}>{url}</Text> : null}
        {url ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Copy booking link" onPress={() => Share.share({ message: url })} style={{ backgroundColor: theme.gold, borderRadius: 14, minHeight: 52, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: theme.goldText, fontWeight: '900' }}>Copy booking link</Text></TouchableOpacity> : null}
      </View>
    </View>
  )
}
