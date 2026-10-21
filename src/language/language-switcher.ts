import {
  createLanguageFlag,
  currentLanguage,
  languageFlagUrl,
  LANGUAGES,
  onLanguageChange,
  setLanguage,
  type LanguageId,
} from './language.ts'
import './language-switcher.css'

const CHEVRON = `<svg class="language-switcher__chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" /></svg>`

/**
 * The Language Switcher: a small dropdown in the top-right corner of the
 * Navbar, next to the Sound Toggle, that sets the Language of Country and
 * capital names. It shows the Language Flag and short code ("NL"); a native
 * <select> lies invisibly on top, so the open list gives the full names.
 * Phones and tablets have the Settings Menu instead.
 */
export function createLanguageSwitcher(): HTMLElement {
  const element = document.createElement('label')
  element.className = 'language-switcher'
  element.title = 'Language of country and capital names'
  const flag = createLanguageFlag(currentLanguage())
  element.innerHTML = `<span class="language-switcher__code"></span>${CHEVRON}`
  element.prepend(flag)

  const select = document.createElement('select')
  select.className = 'language-switcher__select'
  select.setAttribute('aria-label', 'Language of country and capital names')
  for (const language of LANGUAGES) select.add(new Option(language.name, language.id))
  element.append(select)

  const code = element.querySelector('.language-switcher__code')!
  const render = (language: LanguageId) => {
    select.value = language
    code.textContent = language.toUpperCase()
    flag.src = languageFlagUrl(language)
  }
  render(currentLanguage())
  onLanguageChange(render)
  select.addEventListener('change', () => setLanguage(select.value as LanguageId))
  return element
}
