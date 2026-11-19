import './pwaManifestBootstrap.js'
import './style.css'
import { getLocale, syncDocumentLang } from './lib/locale.js'
import { syncPublicThemeClass } from './lib/publicTheme.js'
import { initRouter } from './router.js'
import { initServiceWorkerRegistration, isStandaloneMode } from './lib/pwaInstallPrompt.js'

navigator.serviceWorker?.addEventListener('message', (event) => {
  if (event.data?.type === 'TAXIO_IS_STANDALONE_DASHBOARD') {
    event.ports[0]?.postMessage(
      location.pathname.startsWith('/dashboard/') && isStandaloneMode()
    )
  }
})

syncDocumentLang(getLocale())
syncPublicThemeClass()
initRouter()
initServiceWorkerRegistration()
