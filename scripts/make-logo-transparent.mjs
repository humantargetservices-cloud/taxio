/**
 * One-off: strip near-black background from official taxio-logo.png (shape unchanged).
 */
import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const input = join(root, 'src/assets/images/logo/taxio-logo-source.png')
const outSrc = join(root, 'src/assets/images/logo/taxio-logo.png')
const outPublic = join(root, 'public/taxio-logo.png')

// Preserve original bytes as source (run once from current official PNG).
try {
  readFileSync(input)
} catch {
  writeFileSync(input, readFileSync(outSrc))
}

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const threshold = 42
for (let i = 0; i < data.length; i += 4) {
  const r = data[i]
  const g = data[i + 1]
  const b = data[i + 2]
  if (r <= threshold && g <= threshold && b <= threshold) data[i + 3] = 0
}

const png = await sharp(data, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .png()
  .toBuffer()

writeFileSync(outSrc, png)
writeFileSync(outPublic, png)
console.log(`Wrote transparent logo ${info.width}x${info.height}`)
