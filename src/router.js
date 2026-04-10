import { setRouteRunner } from './nav.js'
import { mountLanding } from './pages/landing.js'
import { mountRegister } from './pages/register.js'
import { mountLoginCompany } from './pages/loginCompany.js'
import { mountForgotPasswordCompany } from './pages/forgotPasswordCompany.js'
import { mountResetPasswordCompany } from './pages/resetPasswordCompany.js'
import { mountPendingApproval } from './pages/pendingApproval.js'
import { mountDashboardCompany } from './pages/dashboardCompany.js'
import { mountChangePasswordCompany } from './pages/changePasswordCompany.js'
import { mountBookCompany } from './pages/bookCompany.js'
import { mountAdminLogin } from './pages/adminLogin.js'
import { mountAdminDashboard } from './pages/adminDashboard.js'
import {
  mountTerms,
  mountTermsRiders,
  mountPrivacy,
  mountLegalNotice,
  mountCompanyTerms,
  mountContact,
} from './pages/legal.js'
import { mountTaxiDirectory } from './pages/taxiDirectory.js'
import { resolveBookSlugForRouter } from './lib/tenant.js'

function mountNotFound(root) {
  root.innerHTML = `
    <div class="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <p class="text-slate-900 text-xl font-bold mb-2">TAXIO</p>
      <p class="text-gray-600 mb-6">Page not found.</p>
      <a href="/" class="text-yellow-600 font-semibold hover:underline">Back home</a>
    </div>`
}

function route() {
  const root = document.getElementById('app')
  if (!root) return

  const path = window.location.pathname
  const bookSlug = resolveBookSlugForRouter(path)

  if (path === '/' || path === '') {
    if (bookSlug) {
      mountBookCompany(root, bookSlug).catch((err) => {
        console.error(err)
        mountNotFound(root)
      })
    } else {
      mountLanding(root)
    }
    return
  }
  if (path === '/register') {
    mountRegister(root)
    return
  }
  if (path === '/terms/riders') {
    mountTermsRiders(root)
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
  if (path === '/legal-notice') {
    mountLegalNotice(root)
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
  if (path === '/change-password/company') {
    mountChangePasswordCompany(root).catch((err) => {
      console.error(err)
      mountNotFound(root)
    })
    return
  }
  if (path === '/admin/login') {
    mountAdminLogin(root)
    return
  }
  if (path === '/admin/dashboard') {
    mountAdminDashboard(root).catch((err) => {
      console.error(err)
      mountNotFound(root)
    })
    return
  }
  if (bookSlug) {
    mountBookCompany(root, bookSlug).catch((err) => {
      console.error(err)
      mountNotFound(root)
    })
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
