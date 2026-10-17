import { setRouteRunner } from './nav.js'
import { mountLanding } from './pages/landing.js'
import { mountRegister } from './pages/register.js'
import { mountLoginCompany } from './pages/loginCompany.js'
import { mountForgotPasswordCompany } from './pages/forgotPasswordCompany.js'
import { mountResetPasswordCompany } from './pages/resetPasswordCompany.js'
import { mountPendingApproval } from './pages/pendingApproval.js'
import { mountDashboardCompany } from './pages/dashboardCompany.js'
import { mountChangePasswordCompany } from './pages/changePasswordCompany.js'
import { mountOnboardingCompany } from './pages/onboardingCompany.js'
import { mountTerms, mountPrivacy, mountCompanyTerms, mountContact } from './pages/legal.js'
import { mountTaxiDirectory } from './pages/taxiDirectory.js'
import { mountRescuePassengerConfirm } from './pages/rescuePassengerConfirm.js'
import { mountTripLive } from './pages/tripLive.js'
import { resolveBookSlugForRouter } from './lib/tenant.js'
import { ensureGenericSiteManifest, primeBookingPwaManifest } from './lib/companyPwa.js'
import { getLocale, syncDocumentLang } from './lib/locale.js'
import { taxioLogoImg } from './lib/taxioLogo.js'

function mountNotFound(root) {
  root.innerHTML = `
    <div class="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div class="mb-4">${taxioLogoImg('h-14 w-14')}</div>
      <p class="text-gray-600 mb-6">Page not found.</p>
      <a href="/" class="text-yellow-600 font-semibold hover:underline">Back home</a>
    </div>`
}

/** Brief shell while a route chunk downloads (admin / booking). */
function mountChunkLoading(root) {
  root.innerHTML = `
    <div class="flex min-h-screen flex-col items-center justify-center bg-[#eef0f3] px-4 dark:bg-slate-950">
      <div class="h-10 w-10 animate-pulse rounded-full border-2 border-gray-300 border-t-yellow-500 dark:border-slate-600 dark:border-t-amber-400"></div>
    </div>`
}

/**
 * Lazy-load a page module, then run its mount. Failures → not-found.
 * @param {HTMLElement} root
 * @param {() => Promise<Record<string, unknown>>} importer
 * @param {string} exportName
 * @param  {...unknown} args
 */
function loadRouteChunk(root, importer, exportName, ...args) {
  mountChunkLoading(root)
  return importer()
    .then((mod) => {
      const fn = mod?.[exportName]
      if (typeof fn !== 'function') {
        throw new Error(`Route export missing: ${exportName}`)
      }
      return fn(root, ...args)
    })
    .catch((err) => {
      console.error(err)
      mountNotFound(root)
    })
}

function route() {
  const root = document.getElementById('app')
  if (!root) return
  document.title = 'TAXIO'
  syncDocumentLang(getLocale())

  const path = window.location.pathname
  const bookSlug = resolveBookSlugForRouter(path)

  if (bookSlug) {
    primeBookingPwaManifest(bookSlug)
  } else if (path !== '/dashboard/company') {
    ensureGenericSiteManifest()
  }

  if (path === '/' || path === '') {
    if (bookSlug) {
      loadRouteChunk(root, () => import('./pages/bookCompany.js'), 'mountBookCompany', bookSlug)
    } else {
      mountLanding(root)
    }
    return
  }
  if (path.startsWith('/r/')) {
    const redirectSlug = decodeURIComponent(path.slice(3).split('/')[0] || '').trim()
    if (redirectSlug) {
      loadRouteChunk(
        root,
        () => import('./pages/companyAnalyticsRedirect.js'),
        'mountCompanyAnalyticsRedirect',
        redirectSlug
      )
      return
    }
    mountNotFound(root)
    return
  }
  if (path.startsWith('/trip/')) {
    const tripToken = decodeURIComponent(path.slice('/trip/'.length).split('/')[0] || '')
      .trim()
      .split('?')[0]
      .split('#')[0]
      .trim()
    if (tripToken) {
      mountTripLive(root, tripToken).catch((err) => {
        console.error(err)
        mountNotFound(root)
      })
      return
    }
    mountNotFound(root)
    return
  }
  if (path.startsWith('/rescue/confirm/')) {
    const token = decodeURIComponent(path.slice('/rescue/confirm/'.length).split('/')[0] || '').trim()
    if (token) {
      // Prefer live trip page when passenger_trip_token exists; else legacy confirm UI.
      fetch(`/api/trip-status?confirm_token=${encodeURIComponent(token)}`)
        .then((r) => r.json().catch(() => ({})))
        .then((body) => {
          const tripTok = String(body?.trip_token || '').trim()
          if (tripTok.length >= 20) {
            window.history.replaceState({}, '', `/trip/${encodeURIComponent(tripTok)}`)
            return mountTripLive(root, tripTok)
          }
          return mountRescuePassengerConfirm(root, token)
        })
        .catch(() => mountRescuePassengerConfirm(root, token))
        .catch((err) => {
          console.error(err)
          mountNotFound(root)
        })
      return
    }
    mountNotFound(root)
    return
  }
  if (path === '/register') {
    mountRegister(root)
    return
  }
  if (path === '/terms/riders' || path === '/legal-notice') {
    window.history.replaceState({}, '', '/terms')
    mountTerms(root)
    return
  }
  if (path === '/terms') {
    mountTerms(root)
    return
  }
  if (path === '/taxis') {
    mountTaxiDirectory(root).catch((err) => {
      console.error(err)
      mountNotFound(root)
    })
    return
  }
  if (path === '/privacy') {
    mountPrivacy(root)
    return
  }
  if (path === '/company-terms') {
    mountCompanyTerms(root)
    return
  }
  if (path === '/contact') {
    mountContact(root)
    return
  }
  if (path === '/login/company') {
    mountLoginCompany(root)
    return
  }
  if (path === '/forgot-password') {
    mountForgotPasswordCompany(root)
    return
  }
  if (path === '/reset-password') {
    mountResetPasswordCompany(root)
    return
  }
  if (path === '/pending-approval') {
    mountPendingApproval(root).catch((err) => {
      console.error(err)
      mountNotFound(root)
    })
    return
  }
  if (path === '/dashboard/company') {
    mountDashboardCompany(root).catch((err) => {
      console.error(err)
      mountNotFound(root)
    })
    return
  }
  if (path === '/onboarding/company') {
    mountOnboardingCompany(root).catch((err) => {
      console.error(err)
      mountNotFound(root)
    })
    return
  }
  if (path === '/change-password/company') {
    mountChangePasswordCompany(root).catch((err) => {
      console.error(err)
      mountNotFound(root)
    })
    return
  }
  if (path === '/admin/login') {
    loadRouteChunk(root, () => import('./pages/adminLogin.js'), 'mountAdminLogin')
    return
  }
  if (path === '/admin/dashboard') {
    loadRouteChunk(root, () => import('./pages/adminDashboard.js'), 'mountAdminDashboard')
    return
  }
  if (bookSlug) {
    loadRouteChunk(root, () => import('./pages/bookCompany.js'), 'mountBookCompany', bookSlug)
    return
  }

  mountNotFound(root)
}

function onLinkClick(e) {
  const a = e.target.closest('a[href]')
  if (!a) return
  if (a.target === '_blank' || a.hasAttribute('download')) return
  if (a.hasAttribute('data-external')) return
  if (a.hasAttribute('data-no-route')) return
  const href = a.getAttribute('href')
  if (!href || href.startsWith('mailto:') || href.startsWith('tel:')) return
  if (href.startsWith('#')) return
  if (href.startsWith('http://') || href.startsWith('https://')) return
  if (href.startsWith('/')) {
    e.preventDefault()
    window.history.pushState({}, '', href)
    route()
  }
}

export function initRouter() {
  setRouteRunner(route)
  window.addEventListener('popstate', route)
  document.body.addEventListener('click', onLinkClick)
  route()
}
