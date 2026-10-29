import React from 'react'
import Svg, { Circle, Path, Rect } from 'react-native-svg'

type IconProps = { color?: string; size?: number }

export function IconHome({ color = '#FFC329', size = 22 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" /></Svg>
}
export function IconTrips({ color = '#7E8DA6', size = 22 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Circle cx="7" cy="7" r="2.2" stroke={color} strokeWidth="1.8" /><Circle cx="17" cy="17" r="2.2" stroke={color} strokeWidth="1.8" /><Path d="M9 8.5c2.2 0 3.2 2 4 4.2.7 1.8 1.4 3.3 3.8 3.3" stroke={color} strokeWidth="1.8" strokeLinecap="round" /></Svg>
}
export function IconEuro({ color = '#7E8DA6', size = 22 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M16.2 7.2A5 5 0 0 0 8 10.2M16.2 16.8A5 5 0 0 1 8 13.8M6.5 10.5h7.2M6.5 13.5h7.2" stroke={color} strokeWidth="1.8" strokeLinecap="round" /></Svg>
}
export function IconAccount({ color = '#7E8DA6', size = 22 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Circle cx="12" cy="8" r="3" stroke={color} strokeWidth="1.8" /><Path d="M6.2 19.2c.9-2.8 3-4.2 5.8-4.2s4.9 1.4 5.8 4.2" stroke={color} strokeWidth="1.8" strokeLinecap="round" /></Svg>
}
export function IconShare({ color = '#D5DEEE', size = 16 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Circle cx="7" cy="12" r="2" stroke={color} strokeWidth="1.8" /><Circle cx="17" cy="7" r="2" stroke={color} strokeWidth="1.8" /><Circle cx="17" cy="17" r="2" stroke={color} strokeWidth="1.8" /><Path d="m9 11 6-3M9 13l6 3" stroke={color} strokeWidth="1.8" /></Svg>
}
export function IconQr({ color = '#D5DEEE', size = 16 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Rect x="4" y="4" width="6" height="6" rx="1" stroke={color} strokeWidth="1.8" /><Rect x="14" y="4" width="6" height="6" rx="1" stroke={color} strokeWidth="1.8" /><Rect x="4" y="14" width="6" height="6" rx="1" stroke={color} strokeWidth="1.8" /><Path d="M14 14h3v3M18 18h2v2M14 18v2" stroke={color} strokeWidth="1.8" strokeLinecap="round" /></Svg>
}
export function IconNavigate({ color = '#F4F7FB', size = 16 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="m4 11 16-7-7 16-2-7-7-2Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" /></Svg>
}
export function IconPhone({ color = '#F4F7FB', size = 16 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M8 4h2.4l1 3.4-1.7 1a12 12 0 0 0 5 5l1-1.7L19.2 13V16a2 2 0 0 1-2.2 2A16 16 0 0 1 6 6.2 2 2 0 0 1 8 4Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" /></Svg>
}
export function IconClock({ color = '#1A1404', size = 16 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Circle cx="12" cy="12" r="7.5" stroke={color} strokeWidth="1.8" /><Path d="M12 8.5V12l2.5 1.6" stroke={color} strokeWidth="1.8" strokeLinecap="round" /></Svg>
}
