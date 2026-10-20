/**
 * Dry-run proofs for passenger_locale → WhatsApp template language mapping.
 */
import assert from 'node:assert/strict'
import { describe, it, before, after } from 'node:test'
import {
  normalizePassengerLocale,
  mapPassengerLocaleToWhatsAppLanguage,
  resolveWhatsAppTemplateLanguage,
} from '../api/_passengerLocale.js'
import {
  sendBookingConfirmedTemplate,
  sendRescueOfferTemplate,
  sendRescueReminderTemplate,
} from '../api/_whatsapp.js'

const PROD = {
  booking: 'taxio_booking_confirmed',
  offer: 'taxio_rescue_offer',
  reminder: 'taxio_rescue_reminder',
}
const STAGING = {
  booking: 'taxio_booking_confirmed_staging',
  offer: 'taxio_rescue_offer_staging',
  reminder: 'taxio_rescue_reminder_staging',
}

describe('normalizePassengerLocale', () => {
  it('maps en / nl / fr families', () => {
    assert.equal(normalizePassengerLocale('en'), 'en')
    assert.equal(normalizePassengerLocale('en-US'), 'en')
    assert.equal(normalizePassengerLocale('nl'), 'nl')
    assert.equal(normalizePassengerLocale('nl-BE'), 'nl')
    assert.equal(normalizePassengerLocale('nl_BE'), 'nl')
    assert.equal(normalizePassengerLocale('fr'), 'fr')
    assert.equal(normalizePassengerLocale('fr-FR'), 'fr')
  })
  it('falls back to en', () => {
    assert.equal(normalizePassengerLocale(null), 'en')
    assert.equal(normalizePassengerLocale(''), 'en')
    assert.equal(normalizePassengerLocale('de'), 'en')
    assert.equal(normalizePassengerLocale('xx'), 'en')
  })
})

describe('mapPassengerLocaleToWhatsAppLanguage (production)', () => {
  it('en → en, nl → nl_BE, fr → fr, null → en', () => {
    assert.equal(mapPassengerLocaleToWhatsAppLanguage('en'), 'en')
    assert.equal(mapPassengerLocaleToWhatsAppLanguage('nl'), 'nl_BE')
    assert.equal(mapPassengerLocaleToWhatsAppLanguage('nl-BE'), 'nl_BE')
    assert.equal(mapPassengerLocaleToWhatsAppLanguage('fr'), 'fr')
    assert.equal(mapPassengerLocaleToWhatsAppLanguage(null), 'en')
    assert.equal(mapPassengerLocaleToWhatsAppLanguage(undefined), 'en')
  })
})

describe('resolveWhatsAppTemplateLanguage', () => {
  const prev = { ...process.env }

  after(() => {
    for (const k of Object.keys(process.env)) {
      if (!(k in prev)) delete process.env[k]
    }
    Object.assign(process.env, prev)
  })

  it('production templates use booking locale', () => {
    delete process.env.TAXIO_STAGING
    delete process.env.PUBLIC_APP_ORIGIN
    assert.equal(
      resolveWhatsAppTemplateLanguage({
        templateName: PROD.booking,
        passengerLocale: 'en',
      }),
      'en'
    )
    assert.equal(
      resolveWhatsAppTemplateLanguage({
        templateName: PROD.offer,
        passengerLocale: 'nl',
      }),
      'nl_BE'
    )
    assert.equal(
      resolveWhatsAppTemplateLanguage({
        templateName: PROD.reminder,
        passengerLocale: 'fr',
      }),
      'fr'
    )
    assert.equal(
      resolveWhatsAppTemplateLanguage({
        templateName: PROD.booking,
        passengerLocale: null,
      }),
      'en'
    )
  })

  it('staging template names always force en', () => {
    assert.equal(
      resolveWhatsAppTemplateLanguage({
        templateName: STAGING.booking,
        passengerLocale: 'nl',
      }),
      'en'
    )
    assert.equal(
      resolveWhatsAppTemplateLanguage({
        templateName: STAGING.offer,
        passengerLocale: 'fr',
      }),
      'en'
    )
    assert.equal(
      resolveWhatsAppTemplateLanguage({
        templateName: STAGING.reminder,
        passengerLocale: 'nl',
      }),
      'en'
    )
  })

  it('staging host/env forces en even for production names', () => {
    process.env.PUBLIC_APP_ORIGIN = 'https://staging.taxio.be'
    assert.equal(
      resolveWhatsAppTemplateLanguage({
        templateName: PROD.booking,
        passengerLocale: 'nl',
      }),
      'en'
    )
    delete process.env.PUBLIC_APP_ORIGIN
    process.env.TAXIO_STAGING = 'true'
    assert.equal(
      resolveWhatsAppTemplateLanguage({
        templateName: PROD.offer,
        passengerLocale: 'fr',
      }),
      'en'
    )
    delete process.env.TAXIO_STAGING
  })

  it('WHATSAPP_TEMPLATE_LANG does not override stored locale on production', () => {
    delete process.env.TAXIO_STAGING
    delete process.env.PUBLIC_APP_ORIGIN
    process.env.WHATSAPP_TEMPLATE_LANG = 'fr'
    assert.equal(
      resolveWhatsAppTemplateLanguage({
        templateName: PROD.booking,
        passengerLocale: 'nl',
      }),
      'nl_BE'
    )
    assert.equal(
      resolveWhatsAppTemplateLanguage({
        templateName: PROD.booking,
        passengerLocale: null,
      }),
      'fr'
    )
    delete process.env.WHATSAPP_TEMPLATE_LANG
  })
})

describe('dry-run WhatsApp payloads', () => {
  const token = 'a'.repeat(32)
  const prevOrigin = process.env.PUBLIC_APP_ORIGIN
  const prevStaging = process.env.TAXIO_STAGING
  const prevBooking = process.env.WHATSAPP_BOOKING_CONFIRMED_TEMPLATE_NAME
  const prevOffer = process.env.WHATSAPP_RESCUE_OFFER_TEMPLATE_NAME
  const prevReminder = process.env.WHATSAPP_RESCUE_REMINDER_TEMPLATE_NAME

  before(() => {
    delete process.env.TAXIO_STAGING
    delete process.env.PUBLIC_APP_ORIGIN
    process.env.WHATSAPP_BOOKING_CONFIRMED_TEMPLATE_NAME = PROD.booking
    process.env.WHATSAPP_RESCUE_OFFER_TEMPLATE_NAME = PROD.offer
    process.env.WHATSAPP_RESCUE_REMINDER_TEMPLATE_NAME = PROD.reminder
  })

  after(() => {
    if (prevOrigin == null) delete process.env.PUBLIC_APP_ORIGIN
    else process.env.PUBLIC_APP_ORIGIN = prevOrigin
    if (prevStaging == null) delete process.env.TAXIO_STAGING
    else process.env.TAXIO_STAGING = prevStaging
    if (prevBooking == null) delete process.env.WHATSAPP_BOOKING_CONFIRMED_TEMPLATE_NAME
    else process.env.WHATSAPP_BOOKING_CONFIRMED_TEMPLATE_NAME = prevBooking
    if (prevOffer == null) delete process.env.WHATSAPP_RESCUE_OFFER_TEMPLATE_NAME
    else process.env.WHATSAPP_RESCUE_OFFER_TEMPLATE_NAME = prevOffer
    if (prevReminder == null) delete process.env.WHATSAPP_RESCUE_REMINDER_TEMPLATE_NAME
    else process.env.WHATSAPP_RESCUE_REMINDER_TEMPLATE_NAME = prevReminder
  })

  async function assertLang(passengerLocale, expected) {
    const confirmed = await sendBookingConfirmedTemplate({
      toPhone: '+32470000000',
      companyName: 'TAXIO Test',
      bookingReference: 'TX-TEST',
      tripToken: token,
      passengerLocale,
      dryRun: true,
    })
    const offer = await sendRescueOfferTemplate({
      toPhone: '+32470000000',
      originalCompanyName: 'Company A',
      winnerCompanyName: 'Company B',
      tripToken: token,
      passengerLocale,
      dryRun: true,
    })
    const reminder = await sendRescueReminderTemplate({
      toPhone: '+32470000000',
      winnerCompanyName: 'Company B',
      tripToken: token,
      passengerLocale,
      dryRun: true,
    })
    assert.equal(confirmed.ok, true)
    assert.equal(offer.ok, true)
    assert.equal(reminder.ok, true)
    assert.equal(confirmed.dryRunPayload.template.language.code, expected)
    assert.equal(offer.dryRunPayload.template.language.code, expected)
    assert.equal(reminder.dryRunPayload.template.language.code, expected)
  }

  it('production EN', async () => assertLang('en', 'en'))
  it('production NL', async () => assertLang('nl', 'nl_BE'))
  it('production NL-BE input', async () => assertLang('nl-BE', 'nl_BE'))
  it('production FR', async () => assertLang('fr', 'fr'))
  it('production null fallback', async () => assertLang(null, 'en'))

  it('staging templates stay en regardless of passenger_locale', async () => {
    process.env.WHATSAPP_BOOKING_CONFIRMED_TEMPLATE_NAME = STAGING.booking
    process.env.WHATSAPP_RESCUE_OFFER_TEMPLATE_NAME = STAGING.offer
    process.env.WHATSAPP_RESCUE_REMINDER_TEMPLATE_NAME = STAGING.reminder
    await assertLang('nl', 'en')
    await assertLang('fr', 'en')
    process.env.WHATSAPP_BOOKING_CONFIRMED_TEMPLATE_NAME = PROD.booking
    process.env.WHATSAPP_RESCUE_OFFER_TEMPLATE_NAME = PROD.offer
    process.env.WHATSAPP_RESCUE_REMINDER_TEMPLATE_NAME = PROD.reminder
  })
})
