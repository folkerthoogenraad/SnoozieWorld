import './country-info-button.css'

const INFO_ICON = `<svg class="country-info-button__icon" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5" /><path d="M8 7.2v4M8 4.6v.1" /></svg>`

/**
 * Wraps what the Navbar shows about a Country (the Explored Country, or the
 * Prompt) in a button with an ⓘ icon that opens Country Info.
 */
export function createCountryInfoButton(content: Node, title: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'country-info-button'
  button.title = title
  button.append(content)
  button.insertAdjacentHTML('beforeend', INFO_ICON)
  button.addEventListener('click', onClick)
  return button
}
