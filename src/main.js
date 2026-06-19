import './pwaManifestBootstrap.js'
import './style.css'
import { getLocale, syncDocumentLang } from './lib/locale.js'
import { syncPublicThemeClass } from './lib/publicTheme.js'
import { initRouter } from './router.js'

syncDocumentLang(getLocale())
syncPublicThemeClass()
initRouter()

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
