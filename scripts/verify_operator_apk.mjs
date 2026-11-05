import fs from 'node:fs'
import { inflateRawSync } from 'node:zlib'

const apkPath = process.argv[2]
if (!apkPath) {
  console.error('apk-path-missing')
  process.exit(1)
}
const apk = fs.readFileSync(apkPath)
let eocd = -1
for (let i = apk.length - 22; i >= Math.max(0, apk.length - 22 - 65535); i -= 1) {
  if (apk.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
}
if (eocd < 0) {
  console.error('apk-directory-missing')
  process.exit(1)
}
const count = apk.readUInt16LE(eocd + 10)
let cursor = apk.readUInt32LE(eocd + 16)
const chunks = []
for (let n = 0; n < count; n += 1) {
  if (apk.readUInt32LE(cursor) !== 0x02014b50) break
  const method = apk.readUInt16LE(cursor + 10)
  const compressed = apk.readUInt32LE(cursor + 20)
  const nameLen = apk.readUInt16LE(cursor + 28)
  const extraLen = apk.readUInt16LE(cursor + 30)
  const commentLen = apk.readUInt16LE(cursor + 32)
  const local = apk.readUInt32LE(cursor + 42)
  const localNameLen = apk.readUInt16LE(local + 26)
  const localExtraLen = apk.readUInt16LE(local + 28)
  const data = apk.subarray(local + 30 + localNameLen + localExtraLen, local + 30 + localNameLen + localExtraLen + compressed)
  if (method === 0) chunks.push(data)
  else if (method === 8) {
    try { chunks.push(inflateRawSync(data)) } catch { /* skip member */ }
  }
  cursor += 46 + nameLen + extraLen + commentLen
}
const haystack = Buffer.concat(chunks)
const required = ['lyjicuuyrvblbsqlduqg.supabase.co', 'https://staging.taxio.be']
// Bare production hostnames are present in the client blocklist. A connection uses the URL.
const forbidden = [
  'https://gdiamipqrhxbmrcsnqdk.supabase.co',
  'https://www.taxio.be',
  'https://taxio.be',
  'staging-not-configured.example',
]
const missing = required.filter((value) => !haystack.includes(Buffer.from(value)))
const forbiddenPresent = forbidden.filter((value) => haystack.includes(Buffer.from(value)))
console.log(JSON.stringify({ apkBytes: apk.length, entries: count, missing, forbiddenPresent }))
if (missing.length || forbiddenPresent.length) process.exit(1)
