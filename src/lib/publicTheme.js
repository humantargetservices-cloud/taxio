/** Shared public theme: same `localStorage` key as landing (`darkMode`). */

export function isPublicDarkMode() {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem('darkMode') === 'true'
  } catch {
    return false
  }
}

export function setPublicDarkMode(dark) {
  try {
    localStorage.setItem('darkMode', String(!!dark))
  } catch {
    /* ignore */
  }
}

export function syncPublicThemeClass() {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', isPublicDarkMode())
}
