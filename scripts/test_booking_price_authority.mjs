/**
 * Server fare is authoritative. Client estimated_price_eur is never stored.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it, after } from 'node:test'
import { fileURLToPath } from 'node:url'
import { getPricingForCarType } from '../src/lib/tripEstimate.js'
import { tripPriceLabelFromBooking } from '../src/lib/rescuePrice.js'
import { publicAppOrigin } from '../api/_companyPush.js'
import {
  draftPriceWrite,
  mergedPricingRow,
  quoteFareEur,
  resolveStandardBookingPrice,
} from '../api/_bookingPrice.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function pageFare(companyPricing, carType, distanceKm) {
  const merged = mergedPricingRow(companyPricing, carType)
  const rate = getPricingForCarType({ [merged.typeName]: merged }, merged.typeName)
  const billableKm = Math.max(0, distanceKm - rate.initialKm)
  return Math.round((rate.baseFare + rate.perKm * billableKm) * 100) / 100
}

const COMPANY = {
  Standard: { start: '6.50', per_km: '2.20', initial_km: '2', enabled: true },
  Van: { start: '9', per_km: '3.10', initial_km: '3', enabled: true },
  __hourly: { enabled: true, rate_eur: 60 },
}

describe('authoritative standard fare', () => {
  const distanceKm = 10

  it('client estimated_price_eur 0 is not the stored price', async () => {
    const priced = await resolveStandardBookingPrice({
      companyPricing: COMPANY,
      carType: 'Standard',
      clientPriceEur: 0,
      distanceKm,
    })
    assert.equal(priced.ok, true)
    assert.notEqual(priced.estimatedPriceEur, 0)
    assert.equal(priced.estimatedPriceEur, quoteFareEur(COMPANY, 'Standard', distanceKm))
    assert.equal(priced.priceCurrency, 'EUR')
  })

  it('client estimated_price_eur 99999 is not the stored price', async () => {
    const priced = await resolveStandardBookingPrice({
      companyPricing: COMPANY,
      carType: 'Standard',
      clientPriceEur: 99999,
      distanceKm,
    })
    assert.equal(priced.ok, true)
    assert.notEqual(priced.estimatedPriceEur, 99999)
    assert.equal(priced.estimatedPriceEur, quoteFareEur(COMPANY, 'Standard', distanceKm))
  })

  it('matches the booking-page pricing formula', () => {
    const cases = [
      [{}, 'Standard', 10],
      [{}, 'Van', 10],
      [{}, 'Luxury', 4.25],
      [COMPANY, 'Standard', 10],
      [COMPANY, 'Van', 3],
      [COMPANY, 'standard', 2],
    ]
    for (const [pricing, carType, km] of cases) {
      assert.equal(quoteFareEur(pricing, carType, km), pageFare(pricing, carType, km))
    }
    // Default Standard: start 5 + max(0, 10 - 3) * 2 = 19
    assert.equal(quoteFareEur({}, 'Standard', 10), 19)
    // Included kilometres: distance inside initial_km is the start fare only
    assert.equal(quoteFareEur({}, 'Standard', 2), 5)
    // Company Standard: 6.50 + max(0, 10 - 2) * 2.20 = 24.10
    assert.equal(quoteFareEur(COMPANY, 'Standard', 10), 24.1)
  })

  it('refuses to price when the route cannot be resolved', async () => {
    const priced = await resolveStandardBookingPrice({
      companyPricing: COMPANY,
      carType: 'Standard',
      pickup: null,
      dropoff: null,
      clientPriceEur: 0,
    })
    assert.equal(priced.ok, false)
    assert.equal(priced.code, 'PRICE_UNAVAILABLE')
    assert.equal(priced.estimatedPriceEur, undefined)
  })
})

describe('draft reuse keeps the frozen fare', () => {
  it('does not replace a stored server fare with a client price', () => {
    const frozen = quoteFareEur(COMPANY, 'Standard', 10)
    const decision = draftPriceWrite(frozen, 0)
    assert.equal(decision.write, false)
    assert.equal(decision.estimatedPriceEur, frozen)
    assert.notEqual(decision.estimatedPriceEur, 0)
  })

  it('fills a null fare with the server quote', () => {
    const server = quoteFareEur({}, 'Standard', 10)
    const decision = draftPriceWrite(null, server)
    assert.equal(decision.write, true)
    assert.equal(decision.estimatedPriceEur, 19)
    assert.notEqual(decision.estimatedPriceEur, 99999)
  })
})

describe('rescue keeps the frozen booking fare', () => {
  it('reads booking_requests.estimated_price_eur and does not recalculate', () => {
    const frozen = quoteFareEur(COMPANY, 'Standard', 10)
    const label = tripPriceLabelFromBooking(
      { estimated_price_eur: frozen, price_currency: 'EUR', notes: 'Estimate: €0' },
      null
    )
    assert.equal(label, `€${frozen}`)
    assert.notEqual(label, '€0')
  })
})

describe('activation does not rewrite the fare', () => {
  it('activateDraftBooking does not set estimated_price_eur', () => {
    const src = fs.readFileSync(path.join(root, 'api', 'public-booking.js'), 'utf8')
    const start = src.indexOf('async function activateDraftBooking')
    const end = src.indexOf('export default async function handler')
    const activate = src.slice(start, end)
    assert.equal(activate.includes('estimated_price_eur'), false)
  })
})

describe('production origin fallback', () => {
  const prev = process.env.PUBLIC_APP_ORIGIN

  after(() => {
    if (prev == null) delete process.env.PUBLIC_APP_ORIGIN
    else process.env.PUBLIC_APP_ORIGIN = prev
  })

  it('uses PUBLIC_APP_ORIGIN, otherwise https://taxio.be', () => {
    delete process.env.PUBLIC_APP_ORIGIN
    assert.equal(publicAppOrigin(), 'https://taxio.be')
    process.env.PUBLIC_APP_ORIGIN = 'https://taxio.be/'
    assert.equal(publicAppOrigin(), 'https://taxio.be')
    process.env.PUBLIC_APP_ORIGIN = 'https://www.taxio.be'
    assert.equal(publicAppOrigin(), 'https://www.taxio.be')
  })
})

describe('production runtime staging identifiers', () => {
  it('has no staging host, staging supabase ref, or staging OneSignal app id', () => {
    const needles = [
      'staging.taxio.be',
      'lyjicuuyrvblbsqlduqg',
      '75ee6b23-1598-42f7-b787-8f294b10a409',
    ]
    const roots = ['api', 'src', 'public'].map((dir) => path.join(root, dir))
    const files = []
    function walk(dir) {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name)
        if (ent.isDirectory()) {
          if (ent.name === 'node_modules' || ent.name === 'dist') continue
          walk(p)
        } else if (/\.(js|mjs|cjs|html|json)$/.test(ent.name)) {
          files.push(p)
        }
      }
    }
    for (const dir of roots) walk(dir)
    files.push(path.join(root, 'vercel.json'))
    const hits = []
    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8')
      for (const needle of needles) {
        if (text.includes(needle)) hits.push(`${path.relative(root, file)}: ${needle}`)
      }
    }
    assert.deepEqual(hits, [])
  })
})
