import './style.css'
import { getLocale, syncDocumentLang } from './lib/locale.js'
import { initRouter } from './router.js'

syncDocumentLang(getLocale())
initRouter()
