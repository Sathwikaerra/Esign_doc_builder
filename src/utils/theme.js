const KEY = 'esign_theme'
const DEFAULT_THEME = 'default'

export function applyTheme() {
  document.documentElement.dataset.theme = DEFAULT_THEME
  try {
    localStorage.setItem(KEY, DEFAULT_THEME)
  } catch {
    // theme still applies for this visit
  }
}
