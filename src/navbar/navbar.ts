import './navbar.css'

/**
 * The Navbar sits at the top of the screen at all times. Clicking its title
 * opens the Start Screen. Its Status area shows what the current mode is
 * about: the Explored Country in Explore Mode, the Quiz Progress and Prompt in
 * a Quiz Run. Controls such as the Sound Toggle sit in the top-right corner.
 */
export class Navbar {
  readonly element: HTMLElement
  private readonly status: HTMLElement

  constructor(options: { onTitleClick: () => void; controls: HTMLElement[] }) {
    this.element = document.createElement('header')
    this.element.className = 'navbar'
    this.element.innerHTML = `
      <button class="navbar__title" type="button" title="Open the start menu" aria-label="SnoozieWorld: open the start menu">
        <img class="navbar__logo" src="${import.meta.env.BASE_URL}favicon.svg" alt="" />
        <span class="navbar__title-text">SnoozieWorld</span>
      </button>
      <div class="navbar__status" aria-live="polite"></div>
      <div class="navbar__controls"></div>
    `
    this.status = this.element.querySelector('.navbar__status')!
    this.element.querySelector('.navbar__title')!.addEventListener('click', options.onTitleClick)
    this.element.querySelector('.navbar__controls')!.append(...options.controls)
  }

  /** Replaces the content of the Status area; null empties it. */
  setStatus(content: Node | null): void {
    this.status.replaceChildren(...(content ? [content] : []))
  }
}
