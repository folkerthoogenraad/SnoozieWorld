import gbFlag from 'flag-icons/flags/1x1/gb.svg'
import nlFlag from 'flag-icons/flags/1x1/nl.svg'

/**
 * The Languages that Country and capital names can be shown in (request 16). The rest of the app stays English.
 * Each has a round Language Flag (feedback 13): the flag of the country whose spelling the names follow.
 */
export const LANGUAGES = [
  { id: 'en', name: 'English', flag: gbFlag },
  { id: 'nl', name: 'Nederlands', flag: nlFlag },
] as const

export type LanguageId = (typeof LANGUAGES)[number]['id']

/**
 * A Language Flag: small and round (see language-switcher.css), so it can't be taken for a Country's Flag, which
 * is a rectangle. Update it with `flag.src = languageFlagUrl(…)`.
 */
export function createLanguageFlag(language: LanguageId): HTMLImageElement {
  const flag = document.createElement('img')
  flag.className = 'language-flag'
  flag.alt = ''
  flag.src = languageFlagUrl(language)
  return flag
}

export function languageFlagUrl(language: LanguageId): string {
  return LANGUAGES.find((l) => l.id === language)!.flag
}

const STORAGE_KEY = 'snoozieworld.language'

function isLanguageId(value: unknown): value is LanguageId {
  return LANGUAGES.some((language) => language.id === value)
}

function loadLanguage(): LanguageId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isLanguageId(stored) ? stored : 'en'
  } catch {
    return 'en'
  }
}

let current: LanguageId = loadLanguage()
const listeners = new Set<(language: LanguageId) => void>()

/** The Language chosen with the Language Switcher, remembered in the browser. */
export function currentLanguage(): LanguageId {
  return current
}

export function setLanguage(language: LanguageId): void {
  if (language === current) return
  current = language
  try {
    localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // Not remembered, e.g. in a private window; it still applies until the page is reloaded.
  }
  listeners.forEach((listener) => listener(language))
}

/** Calls `listener` after every change of the Language; returns a function that stops it. */
export function onLanguageChange(listener: (language: LanguageId) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
