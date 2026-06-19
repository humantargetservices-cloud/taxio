import './pwaManifestBootstrap.js'
import './style.css'
import { getLocale, syncDocumentLang } from './lib/locale.js'
import { syncPublicThemeClass } from './lib/publicTheme.js'
import { initRouter } from './router.js'
import { initServiceWorkerRegistration } from './lib/pwaInstallPrompt.js'

syncDocumentLang(getLocale())
syncPublicThemeClass()
initRouter()
initServiceWorkerRegistration()
