import type { SoundPlayer } from './sound-player.ts'
import './sound-toggle.css'

export const SOUND_ON_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path class="sound-toggle__speaker" d="M4 9h4l5-4v14l-5-4H4z" /><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" /></svg>`
export const SOUND_OFF_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path class="sound-toggle__speaker" d="M4 9h4l5-4v14l-5-4H4z" /><path d="M16.5 9.5l5 5M21.5 9.5l-5 5" /></svg>`

/** The Sound Toggle: a button in the top-right corner of the Navbar that mutes and unmutes Sound Effects. */
export function createSoundToggle(sounds: SoundPlayer): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'sound-toggle'

  const render = (muted: boolean) => {
    button.innerHTML = muted ? SOUND_OFF_ICON : SOUND_ON_ICON
    button.title = muted ? 'Sound off (click to turn on)' : 'Sound on (click to turn off)'
    button.setAttribute('aria-label', 'Sound')
    button.setAttribute('aria-pressed', String(!muted))
  }
  render(sounds.muted)
  sounds.onMutedChange(render)
  button.addEventListener('click', () => {
    sounds.muted = !sounds.muted
  })
  return button
}
