import { translations, tBooking } from '../i18n.js'
import { getLocale, setLocale, syncDocumentLang } from '../lib/locale.js'
import { listApprovedCompaniesDirectory } from '../lib/api.js'
import { escapeHtml } from '../lib/html.js'
import { icon } from '../lib/icons.js'
import { taxioLogoImg } from '../lib/taxioLogo.js'
import { isPublicDarkMode, setPublicDarkMode, syncPublicThemeClass } from '../lib/publicTheme.js'
import { absolutePublicBookingUrl, bookPathFromSlug } from '../lib/tenant.js'
import { companyInitials, pickCompanyImageUrl } from '../lib/companyPwa.js'

const DIRECTORY_VIEW_KEY = 'directoryView'

function dirCopy() {
  return translations[getLocale()]?.directoryPage || translations.nl.directoryPage
}

/** Public booking URL (path on dev, subdomain when configured). */
function companyBookingHref(slug) {
  const s = String(slug || '').trim()
  if (!s) return bookPathFromSlug('')
  if (typeof window !== 'undefined') return absolutePublicBookingUrl(s)
  return bookPathFromSlug(s)
}

function dirCompanyStatus(c, tb) {
  const st = c.availability_status === 'busy' ? 'busy' : c.availability_status === 'offline' ? 'offline' : 'available'
  const label =
    st === 'busy' ? tb.availBusy : st === 'offline' ? tb.availOffline : tb.availAvailable
  const dot =
    st === 'available'
      ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.45)]'
      : st === 'busy'
        ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]'
        : 'bg-slate-400'
  return { label, dot }
}

function getViewMode() {
  try {
    const v = localStorage.getItem(DIRECTORY_VIEW_KEY)
    return v === 'list' ? 'list' : 'grid'
  } catch {
    return 'grid'
  }
}

function setViewMode(mode) {
  try {
    localStorage.setItem(DIRECTORY_VIEW_KEY, mode === 'list' ? 'list' : 'grid')
  } catch {
    /* ignore */
  }
}

function filterCompanies(companies, q) {
  const s = String(q || '').trim().toLowerCase()
  if (!s) return companies
  return companies.filter((c) => {
    const name = String(c.name || '').toLowerCase()
    const city = String(c.city || '').toLowerCase()
    const country = String(c.country || '').toLowerCase()
    const slug = String(c.slug || '').toLowerCase()
    return name.includes(s) || city.includes(s) || country.includes(s) || slug.includes(s)
  })
}

function viewToggleBtnClass(active) {
  return active
    ? 'rounded-full px-3 py-1.5 text-xs font-bold bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5 transition dark:bg-slate-700 dark:text-white dark:ring-white/10'
    : 'rounded-full px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
}

function dirCompanyAvatarHtml(c, size = 'grid') {
  const src = pickCompanyImageUrl(c)
  const initials = escapeHtml(companyInitials(c.name))
  const sizeCls =
    size === 'list'
      ? 'h-11 w-11 rounded-xl ring-1'
      : 'h-14 w-14 rounded-2xl ring-2 sm:h-[3.25rem] sm:w-[3.25rem]'
  if (src) {
    return `<div class="relative flex ${sizeCls} shrink-0 overflow-hidden bg-slate-200 shadow-md ring-amber-400/25 ring-offset-2 ring-offset-white dark:bg-slate-800 dark:ring-offset-slate-900">
      <img src="${escapeHtml(src)}" alt="" class="dir-company-photo h-full w-full object-cover" loading="lazy" decoding="async" />
      <div class="dir-company-photo-fallback absolute inset-0 hidden items-center justify-center bg-gradient-to-br from-amber-400 via-amber-300 to-yellow-500 text-sm font-bold text-slate-900">${initials}</div>
    </div>`
  }
  return `<div class="flex ${sizeCls} shrink-0 items-center justify-center bg-gradient-to-br from-amber-400 via-amber-300 to-yellow-500 text-sm font-bold text-slate-900 shadow-md ring-amber-400/25 ring-offset-2 ring-offset-white dark:ring-offset-slate-900">${initials}</div>`
}

function renderCompanyGridItem(c, d, tb) {
  const loc = [c.city, c.country].filter(Boolean).join(', ') || '—'
  const bookUrl = companyBookingHref(c.slug)
  const cta = escapeHtml(d.viewBooking || d.bookCta)
  const { label: statusLabel, dot } = dirCompanyStatus(c, tb)
  return `<li class="flex h-full min-h-[14.5rem] flex-col rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm ring-1 ring-slate-900/[0.04] transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700/80 dark:bg-slate-800/50 dark:ring-white/[0.06] dark:hover:bg-slate-800/70">
    <div class="flex flex-1 flex-col gap-5">
      <div class="flex items-start gap-4">
        ${dirCompanyAvatarHtml(c)}
        <div class="min-w-0 flex-1 text-left">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <p class="text-lg font-bold leading-tight tracking-tight text-slate-900 dark:text-white">${escapeHtml(c.name)}</p>
            <span class="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-700 ring-1 ring-slate-200/80 dark:bg-slate-900/80 dark:text-slate-200 dark:ring-slate-600/60">
              <span class="h-1.5 w-1.5 shrink-0 rounded-full ${dot}"></span>
              ${escapeHtml(statusLabel)}
            </span>
          </div>
          <p class="mt-2 text-sm font-medium leading-snug text-slate-600 dark:text-slate-400">${escapeHtml(loc)}</p>
        </div>
      </div>
      <a href="${escapeHtml(bookUrl)}" class="mt-auto inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 text-sm font-bold text-gray-900 shadow-sm ring-1 ring-black/5 transition hover:bg-yellow-500">${icon.arrowRight('h-4 w-4 shrink-0')} ${cta}</a>
    </div>
  </li>`
}

function renderCompanyRow(c, d, tb) {
  const loc = [c.city, c.country].filter(Boolean).join(', ') || '—'
  const bookUrl = companyBookingHref(c.slug)
  const cta = escapeHtml(d.viewBooking || d.bookCta)
  const { label: statusLabel, dot } = dirCompanyStatus(c, tb)
  return `<li class="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white px-5 py-4 shadow-sm ring-1 ring-slate-900/[0.03] transition hover:border-amber-200/90 hover:shadow dark:border-slate-700/80 dark:bg-slate-800/40 dark:ring-white/[0.05] sm:flex-row sm:items-center sm:justify-between sm:gap-5">
    <div class="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
      ${dirCompanyAvatarHtml(c, 'list')}
      <div class="min-w-0 flex-1 text-left">
        <p class="font-bold tracking-tight text-slate-900 dark:text-white">${escapeHtml(c.name)}</p>
        <p class="mt-0.5 text-sm font-medium text-slate-600 dark:text-slate-400">${escapeHtml(loc)}</p>
        <span class="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          <span class="h-1.5 w-1.5 shrink-0 rounded-full ${dot}"></span>
          ${escapeHtml(statusLabel)}
        </span>
      </div>
    </div>
    <a href="${escapeHtml(bookUrl)}" class="inline-flex h-11 shrink-0 items-center justify-center gap-2 self-stretch rounded-xl bg-yellow-400 px-5 text-sm font-bold text-gray-900 shadow-sm ring-1 ring-black/5 transition hover:bg-yellow-500 sm:self-center">${icon.arrowRight('h-4 w-4 shrink-0')} ${cta}</a>
  </li>`
}

function renderResults(companies, filtered, view, d, tb) {
  if (companies.length === 0) {
    return `<div class="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-14 text-center dark:border-slate-600 dark:bg-slate-800/40">
      <p class="text-sm font-medium text-slate-700 dark:text-slate-300">${escapeHtml(d.empty)}</p>
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-500">${escapeHtml(d.emptyHint)}</p>
    </div>`
  }
  if (filtered.length === 0) {
    return `<div class="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center dark:border-slate-600 dark:bg-slate-800/40">
      <p class="text-sm font-medium text-slate-700 dark:text-slate-300">${escapeHtml(d.noMatches)}</p>
    </div>`
  }
  if (view === 'list') {
    return `<ul class="space-y-3" role="list">${filtered.map((c) => renderCompanyRow(c, d, tb)).join('')}</ul>`
  }
  return `<ul class="grid gap-5 sm:grid-cols-2 lg:gap-6" role="list">${filtered.map((c) => renderCompanyGridItem(c, d, tb)).join('')}</ul>`
}

export async function mountTaxiDirectory(root) {
  syncDocumentLang(getLocale())
  syncPublicThemeClass()
  const d0 = dirCopy()
  const dark0 = isPublicDarkMode()
  root.innerHTML = `
    <div class="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 via-white to-white px-4 py-16 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
      <div class="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-amber-500 dark:border-slate-700 dark:border-t-amber-400"></div>
      <p class="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">${escapeHtml(d0.loading)}</p>
    </div>`

  let companies = []
  try {
    companies = await listApprovedCompaniesDirectory()
  } catch (e) {
    console.error(e)
    companies = []
  }

  const d = dirCopy()
  const dark = isPublicDarkMode()
  const view = getViewMode()
  const themeBtnIcon = dark ? icon.moon('h-5 w-5') : icon.sun('h-5 w-5')

  root.innerHTML = `
<div class="min-h-screen pb-20 pt-6 transition-colors duration-300 sm:pb-24 sm:pt-8 ${dark ? 'bg-slate-900' : 'bg-gradient-to-b from-slate-50 via-white to-white'}">
  <div class="fixed right-4 top-4 z-50 flex flex-wrap items-center justify-end gap-2">
    <button type="button" id="dir-toggle-dark" class="rounded-full p-3 shadow-lg transition-all ${dark ? 'bg-slate-800 text-gray-300 hover:bg-slate-700' : 'bg-white text-gray-600 hover:bg-gray-100'}" aria-label="${escapeHtml(d.themeToggle)}">${themeBtnIcon}</button>
    <div class="flex gap-0.5 rounded-full p-1 shadow-lg ${dark ? 'bg-slate-800' : 'bg-white'}">
      ${['nl', 'fr', 'en']
        .map(
          (lc) =>
            `<button type="button" data-taxio-locale="${lc}" class="rounded-full px-2.5 py-2 text-xs font-semibold transition-all ${getLocale() === lc ? 'bg-gray-900 text-white' : dark ? 'text-gray-400 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'}">${lc.toUpperCase()}</button>`
        )
        .join('')}
    </div>
  </div>

  <div class="mx-auto max-w-5xl px-4">
    <a href="/" class="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
      ${icon.arrowLeft('h-4 w-4')}
      ${escapeHtml(d.backHome)}
    </a>

    <div class="mt-8 text-center sm:mt-10">
      <div class="mx-auto mb-6 flex flex-col items-center gap-4">
        ${taxioLogoImg('h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]')}
        <div class="max-w-2xl space-y-3">
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700/90 dark:text-yellow-400/90">TAXIO</p>
          <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">${escapeHtml(d.eyebrow)}</p>
          <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">${escapeHtml(d.title)}</h1>
          <p class="text-base leading-relaxed text-slate-600 dark:text-slate-400">${escapeHtml(d.subtitle)}</p>
        </div>
      </div>
    </div>

    <div class="mx-auto mt-8 max-w-4xl">
      <label for="dir-search" class="sr-only">${escapeHtml(d.searchPlaceholder)}</label>
      <div class="relative">
        <span class="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400">${icon.search('h-5 w-5')}</span>
        <input id="dir-search" type="search" autocomplete="off" placeholder="${escapeHtml(d.searchPlaceholder)}" class="h-12 w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm font-medium text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-amber-400/25" />
      </div>
      <div class="mt-4 flex flex-wrap items-center justify-end gap-3">
        <div class="inline-flex rounded-full border border-slate-200 bg-slate-100/90 p-0.5 dark:border-slate-600 dark:bg-slate-800/90" role="group" aria-label="${escapeHtml(d.viewGrid)} / ${escapeHtml(d.viewList)}">
          <button type="button" id="dir-view-grid" class="${viewToggleBtnClass(view === 'grid')}">${escapeHtml(d.viewGrid)}</button>
          <button type="button" id="dir-view-list" class="${viewToggleBtnClass(view === 'list')}">${escapeHtml(d.viewList)}</button>
        </div>
      </div>
      <div id="dir-results" class="mt-6"></div>
    </div>
  </div>
</div>`

  function paintResults() {
    const input = root.querySelector('#dir-search')
    const q = input?.value || ''
    const list = filterCompanies(companies, q)
    const vm = getViewMode()
    const wrap = root.querySelector('#dir-results')
    if (wrap) wrap.innerHTML = renderResults(companies, list, vm, dirCopy(), tBooking(getLocale()))
    root.querySelectorAll('.dir-company-photo').forEach((img) => {
      img.addEventListener('error', () => {
        img.classList.add('hidden')
        const fb = img.parentElement?.querySelector('.dir-company-photo-fallback')
        if (fb) {
          fb.classList.remove('hidden')
          fb.classList.add('flex')
        }
      })
    })
    const g = root.querySelector('#dir-view-grid')
    const l = root.querySelector('#dir-view-list')
    if (g) g.className = viewToggleBtnClass(vm === 'grid')
    if (l) l.className = viewToggleBtnClass(vm === 'list')
  }

  paintResults()

  root.querySelector('#dir-search')?.addEventListener('input', () => {
    paintResults()
  })

  root.querySelector('#dir-view-grid')?.addEventListener('click', () => {
    setViewMode('grid')
    paintResults()
  })
  root.querySelector('#dir-view-list')?.addEventListener('click', () => {
    setViewMode('list')
    paintResults()
  })

  root.querySelector('#dir-toggle-dark')?.addEventListener('click', () => {
    setPublicDarkMode(!isPublicDarkMode())
    syncPublicThemeClass()
    mountTaxiDirectory(root)
  })

  root.querySelectorAll('[data-taxio-locale]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const lc = btn.getAttribute('data-taxio-locale')
      if (lc) {
        setLocale(lc)
        mountTaxiDirectory(root)
      }
    })
  })
}
