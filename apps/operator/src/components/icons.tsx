import React from 'react'
import Svg, { Circle, Path, Rect } from 'react-native-svg'

type IconProps = { color?: string; size?: number }

export function IconHome({ color = '#f6c445', size = 22 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5.2v-6.2H10.2V21H5a1 1 0 0 1-1-1v-9.5Z" fill={color} /></Svg>
}
export function IconTrips({ color = '#6d7c96', size = 22 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M7 4h2.2l1.2 2.2h7.1a2 2 0 0 1 1.9 2.6l-1.2 4.2A2 2 0 0 1 16.3 15H9.2L8.6 17H18v2H7.2a2 2 0 0 1-1.9-2.6L6.6 13 5 6.5A1 1 0 0 1 6 5.2H4V4h3Zm3.2 13.2a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Zm7 0a1.6 1.6 0 1 0 .1 3.2 1.6 1.6 0 0 0-.1-3.2Z" fill={color} /></Svg>
}
export function IconEuro({ color = '#6d7c96', size = 22 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M16.8 6.2A6 6 0 0 0 7.4 9H5.5v2h1.5c0 .3 0 .7.1 1H5.5v2h1.8a6 6 0 0 0 9.3 2.6l-1.2-1.6A4 4 0 0 1 9.4 14H14v-2H9a8 8 0 0 1 0-1h5V9H9.4a4 4 0 0 1 6.1-1.1l1.3-1.7Z" fill={color} /></Svg>
}
export function IconAccount({ color = '#6d7c96', size = 22 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx="12" cy="8" r="3.2" fill={color} /><Path d="M6.2 19.2c.8-3 3-4.5 5.8-4.5s5 1.5 5.8 4.5" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" /></Svg>
}
export function IconShare({ color = '#d5deee', size = 18 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx="7" cy="12" r="2.2" fill={color} /><Circle cx="17" cy="7" r="2.2" fill={color} /><Circle cx="17" cy="17" r="2.2" fill={color} /><Path d="m9 11 6-3M9 13l6 3" stroke={color} strokeWidth="1.6" /></Svg>
}
export function IconQr({ color = '#d5deee', size = 18 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Rect x="3" y="3" width="7" height="7" rx="1" fill={color} /><Rect x="14" y="3" width="7" height="7" rx="1" fill={color} /><Rect x="3" y="14" width="7" height="7" rx="1" fill={color} /><Path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 18h2v3" fill={color} /></Svg>
}
export function IconNavigate({ color = '#f4f7fb', size = 18 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="m4 11 16-7-7 16-2-7-7-2Z" fill={color} /></Svg>
}
export function IconPhone({ color = '#f4f7fb', size = 18 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M8 3h3l1.2 4.2-2 1.2a12 12 0 0 0 5.4 5.4l1.2-2L21 13v3a2 2 0 0 1-2.2 2A17 17 0 0 1 3 5.2 2 2 0 0 1 5 3h3Z" fill={color} /></Svg>
}
export function IconClock({ color = '#1a1404', size = 18 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx="12" cy="12" r="8" stroke={color} strokeWidth="2" fill="none" /><Path d="M12 8v5l3 2" stroke={color} strokeWidth="2" strokeLinecap="round" /></Svg>
}
