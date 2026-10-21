import {
  createLanguageFlag,
  currentLanguage,
  LANGUAGES,
  onLanguageChange,
  setLanguage,
  type LanguageId,
} from '../language/language.ts'
import type { SoundPlayer } from '../sound/sound-player.ts'
import { SOUND_OFF_ICON, SOUND_ON_ICON } from '../sound/sound-toggle.ts'
import './settings-menu.css'

const GEAR_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>`
const CHECK_ICON = `<svg class="settings-menu__check" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3.2L13 5" /></svg>`

/**
 * The Settings Menu: on phones and tablets (up to 960px wide), a gear button
 * in the top-right corner of the Navbar instead of the Language Switcher and
 * Sound Toggle (feedback 13). It opens a small menu with the Languages (Flag
 * and name) and a Sound Effects switch. Picking a Language, Escape or tapping
 * outside closes it; that tap doesn't reach the Map behind.
 */
export function createSettingsMenu(sounds: SoundPlayer): HTMLElement {
  const element = document.createElement('div')
  element.className = 'settings-menu'
  element.innerHTML = `
    <button class="settings-menu__button" type="button" title="Settings" aria-label="Settings" aria-haspopup="menu" aria-expanded="false">${GEAR_ICON}</button>
    <div class="settings-menu__backdrop" hidden></div>
    <div class="settings-menu__list" role="menu" aria-label="Settings" hidden>
      <div class="settings-menu__heading">Country names</div>
      ${LANGUAGES.map(
        (language) =>
          `<button class="settings-menu__item" type="button" role="menuitemradio" data-language="${language.id}">${language.name}${CHECK_ICON}</button>`,
      ).join('')}
      <hr class="settings-menu__separator" />
      <button class="settings-menu__item" type="button" role="menuitemcheckbox" data-sound>
        <span class="settings-menu__sound-icon"></span>Sound effects<span class="settings-menu__switch"></span>
      </button>
    </div>
  `
  const button = element.querySelector<HTMLButtonElement>('.settings-menu__button')!
  const backdrop = element.querySelector<HTMLElement>('.settings-menu__backdrop')!
  const list = element.querySelector<HTMLElement>('.settings-menu__list')!
  const languageItems = [...list.querySelectorAll<HTMLButtonElement>('[data-language]')]
  const soundItem = list.querySelector<HTMLButtonElement>('[data-sound]')!
  for (const item of languageItems) item.prepend(createLanguageFlag(item.dataset.language as LanguageId))

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return
    setOpen(false)
    button.focus()
  }
  const setOpen = (open: boolean) => {
    list.hidden = backdrop.hidden = !open
    button.setAttribute('aria-expanded', String(open))
    if (open) {
      document.addEventListener('keydown', onKeyDown)
      languageItems.find((item) => item.getAttribute('aria-checked') === 'true')?.focus()
    } else {
      document.removeEventListener('keydown', onKeyDown)
    }
  }
  button.addEventListener('click', () => setOpen(button.getAttribute('aria-expanded') !== 'true'))
  backdrop.addEventListener('click', () => setOpen(false))
  for (const item of languageItems) {
    item.addEventListener('click', () => {
      setLanguage(item.dataset.language as LanguageId)
      setOpen(false)
    })
  }
  soundItem.addEventListener('click', () => {
    sounds.muted = !sounds.muted
  })

  const renderLanguage = (language: string) => {
    for (const item of languageItems) item.setAttribute('aria-checked', String(item.dataset.language === language))
  }
  const renderSound = (muted: boolean) => {
    soundItem.setAttribute('aria-checked', String(!muted))
    soundItem.querySelector('.settings-menu__sound-icon')!.innerHTML = muted ? SOUND_OFF_ICON : SOUND_ON_ICON
  }
  renderLanguage(currentLanguage())
  renderSound(sounds.muted)
  onLanguageChange(renderLanguage)
  sounds.onMutedChange(renderSound)
  return element
}
