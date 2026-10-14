import type { Country } from '../country/country.ts'
import { flagUrl } from '../country/flag.ts'
import { GAME_MODES, type GameMode } from '../quiz/game-mode.ts'
import { DEFAULT_MODIFIERS, type ModifierSettings } from '../quiz/modifier.ts'
import {
  CONTINENTS,
  replacedCountryIds,
  sectionKey,
  selectionCountries,
  selectionSummary,
  type Section,
  type SelectableContinent,
  type Selection,
} from '../quiz/selection.ts'
import { createContinentIcon } from './continent-icon.ts'
import './selection-page.css'

const CHEVRON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" /></svg>'

/** A Continent's card on the left. */
interface ContinentCard {
  element: HTMLLabelElement
  checkbox: HTMLInputElement
  icon: HTMLElement
  summary: HTMLElement
  count: HTMLElement
}

/** A Section on the right: its heading, and its Countries below it. */
interface SectionBlock {
  section: Section
  /** `<continent id>/<section id>` */
  key: string
  element: HTMLElement
  checkbox: HTMLInputElement
  count: HTMLElement
  collapseButton: HTMLButtonElement
  items: { country: Country; element: HTMLElement }[]
}

/** A chosen Continent on the right: its name and count, and its Sections. */
interface ContinentGroup {
  element: HTMLElement
  count: HTMLElement
  blocks: SectionBlock[]
}

const byName = (a: Country, b: Country) => a.name.localeCompare(b.name)

/**
 * The Selection page: the page of the Start Screen where the player chooses
 * what to quiz, opened from its *What do you want to quiz?* button.
 *
 * Left: a card per Continent; clicking it chooses or unchooses it. Choosing a
 * Continent starts from its default Sections, so unchoosing and choosing it
 * again resets it. A chosen card shows how many Countries the Continent adds in
 * the current Game Mode, and its summary line what differs from its default.
 * A Continent whose default has nothing the Game Mode can ask (Antarctica in
 * Capital to Location) is disabled, and left out of the Selection; it comes
 * back when the Game Mode changes back.
 *
 * Right: the Countries of each chosen Continent, per Section. Ticking a
 * Section's checkbox switches it on and opens it; unticking it switches it off
 * and closes it. The arrow opens or closes it without switching it, so the
 * player can see what a Section that is off holds (its Countries are greyed
 * out). Countries the Game Mode can't ask are greyed out with the reason as
 * tooltip; the USA is crossed out while its States are asked instead.
 *
 * The Countries are built once per Continent and then only updated in place,
 * so their Flags don't reload (no flicker) and the Sections can open and close
 * with an animation.
 *
 * The StartScreen owns the rest: `update` re-renders the page for the Game
 * Mode, and the page calls `onChange` after every change of the Selection.
 */
export class SelectionPage {
  readonly element: HTMLElement
  private readonly backButton: HTMLButtonElement
  private readonly doneButton: HTMLButtonElement
  private readonly total: HTMLElement
  private readonly groupList: HTMLElement
  private readonly emptyNote: HTMLElement
  private readonly cards = new Map<string, ContinentCard>()
  /** Built the first time a Continent is chosen, and kept, so its Flags never load twice. */
  private groups = new Map<string, ContinentGroup>()
  /** The chosen Continents, each with the ids of its Sections that are on. */
  private readonly chosen = new Map<string, Set<string>>()
  /** The keys of the Sections that are closed. */
  private readonly collapsed = new Set<string>()
  private countries: readonly Country[] = []
  private gameMode: GameMode = GAME_MODES[0]
  private modifiers: ModifierSettings = DEFAULT_MODIFIERS

  constructor(options: { onChange: () => void; onDone: () => void }) {
    this.element = document.createElement('div')
    this.element.className = 'screen__columns selection-page'
    this.element.hidden = true
    this.element.innerHTML = `
      <div class="screen__panel">
        <div class="selection-page__header">
          <button type="button" class="selection-page__back" title="Back" aria-label="Back">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" /></svg>
          </button>
          <h1 class="selection-page__title">What do you want to quiz?</h1>
        </div>
        <div class="selection-page__continents"></div>
        <div class="screen__actions">
          <button type="button" class="screen__button screen__button--secondary selection-page__clear">Clear all</button>
          <button type="button" class="screen__button selection-page__done">Done</button>
        </div>
      </div>
      <div class="screen__panel screen__panel--side">
        <section class="selection-page__countries">
          <h2 class="selection-page__countries-title">Countries <span class="selection-page__total"></span></h2>
          <div class="selection-page__groups"></div>
          <p class="selection-page__empty">Choose one or more continents to play.</p>
        </section>
      </div>
    `
    this.backButton = this.element.querySelector('.selection-page__back')!
    this.doneButton = this.element.querySelector('.selection-page__done')!
    this.total = this.element.querySelector('.selection-page__total')!
    this.groupList = this.element.querySelector('.selection-page__groups')!
    this.emptyNote = this.element.querySelector('.selection-page__empty')!

    const continentList = this.element.querySelector('.selection-page__continents')!
    for (const continent of CONTINENTS) {
      const card = this.createCard(continent)
      this.cards.set(continent.id, card)
      continentList.append(card.element)
    }

    continentList.addEventListener('change', (event) => {
      const checkbox = event.target as HTMLInputElement
      const continent = CONTINENTS.find((c) => c.id === checkbox.dataset.continentId)
      if (!continent) return
      if (checkbox.checked) this.choose(continent)
      else this.chosen.delete(continent.id)
      options.onChange()
    })
    // Ticking a Section opens it, unticking it closes it.
    this.groupList.addEventListener('change', (event) => {
      const checkbox = event.target as HTMLInputElement
      const key = checkbox.dataset.sectionKey
      if (!key) return
      const [continentId, sectionId] = key.split('/')
      const on = this.chosen.get(continentId)
      if (!on) return
      if (checkbox.checked) {
        on.add(sectionId)
        this.collapsed.delete(key)
      } else {
        on.delete(sectionId)
        this.collapsed.add(key)
      }
      options.onChange()
    })
    this.groupList.addEventListener('click', (event) => {
      const button = (event.target as Element).closest<HTMLButtonElement>('[data-collapse-key]')
      if (!button) return
      const key = button.dataset.collapseKey!
      if (!this.collapsed.delete(key)) this.collapsed.add(key)
      this.render()
    })
    this.element.querySelector('.selection-page__clear')!.addEventListener('click', () => {
      this.chosen.clear()
      options.onChange()
    })
    this.backButton.addEventListener('click', options.onDone)
    this.doneButton.addEventListener('click', options.onDone)
  }

  /** Starts from a stored Selection, e.g. the last one played. */
  setSelection(selection: Selection): void {
    this.chosen.clear()
    for (const continent of CONTINENTS) {
      const on = continent.sections.filter((section) => selection.includes(sectionKey(continent, section)))
      if (!on.length) continue
      this.chosen.set(continent.id, new Set(on.map((section) => section.id)))
      this.resetCollapsed(continent)
    }
  }

  /** Provides the Countries, once loaded, to list and count them. */
  setCountries(countries: readonly Country[]): void {
    this.countries = countries
    this.groups = new Map()
  }

  /** Re-renders the page for the Game Mode: what it can ask, the counts, and the disabled Continents. */
  update(gameMode: GameMode, modifiers: ModifierSettings): void {
    this.gameMode = gameMode
    this.modifiers = modifiers
    this.render()
  }

  /**
   * The Selection: the keys of the Sections that are on, without the
   * Continents that are disabled in the Game Mode given to `update`.
   */
  selection(): string[] {
    return CONTINENTS.filter((continent) => !this.isDisabled(continent)).flatMap((continent) => {
      const on = this.chosen.get(continent.id)
      if (!on) return []
      return continent.sections.filter((section) => on.has(section.id)).map((section) => sectionKey(continent, section))
    })
  }

  focus(): void {
    this.backButton.focus()
  }

  private canAsk(country: Country): boolean {
    return this.gameMode.canAsk(country, this.modifiers)
  }

  /** Nothing in the Continent's default Sections can be asked (Antarctica has no capital). */
  private isDisabled(continent: SelectableContinent): boolean {
    if (!this.countries.length) return false
    const defaults = continent.sections.filter((section) => section.isDefault)
    return !this.countries.some((country) => this.canAsk(country) && defaults.some((s) => s.includes(country)))
  }

  /** Chooses the Continent with its default Sections, opening those and closing the others. */
  private choose(continent: SelectableContinent): void {
    const defaults = continent.sections.filter((section) => section.isDefault)
    this.chosen.set(continent.id, new Set(defaults.map((section) => section.id)))
    this.resetCollapsed(continent)
  }

  private resetCollapsed(continent: SelectableContinent): void {
    const on = this.chosen.get(continent.id)
    for (const section of continent.sections) {
      const key = sectionKey(continent, section)
      if (on?.has(section.id)) this.collapsed.delete(key)
      else this.collapsed.add(key)
    }
  }

  private createCard(continent: SelectableContinent): ContinentCard {
    const element = document.createElement('label')
    element.className = 'selection-page__continent'
    element.innerHTML = `
      <input type="checkbox" class="selection-page__continent-check" data-continent-id="${continent.id}" />
      <span class="selection-page__continent-text">
        <span class="selection-page__continent-name">${continent.name}</span>
        <span class="selection-page__summary"></span>
      </span>
      <span class="selection-page__continent-count"></span>
    `
    const icon = createContinentIcon(continent.id)
    element.querySelector('input')!.after(icon)
    return {
      element,
      checkbox: element.querySelector('input')!,
      icon,
      summary: element.querySelector('.selection-page__summary')!,
      count: element.querySelector('.selection-page__continent-count')!,
    }
  }

  private createGroup(continent: SelectableContinent): ContinentGroup {
    const element = document.createElement('section')
    element.className = 'selection-page__group'
    const heading = document.createElement('h3')
    heading.className = 'selection-page__group-title'
    const count = document.createElement('span')
    heading.append(continent.name, ' ', count)
    element.append(heading)

    const blocks: SectionBlock[] = []
    for (const section of continent.sections) {
      const countries = this.countries.filter((country) => section.includes(country)).sort(byName)
      if (!countries.length) continue
      const key = sectionKey(continent, section)
      const block = document.createElement('div')
      block.className = 'selection-page__section'
      block.innerHTML = `
        <div class="selection-page__section-heading">
          <label class="selection-page__section-toggle">
            <input type="checkbox" data-section-key="${key}" />
            <span class="selection-page__section-label">${section.label}</span>
            <span class="selection-page__section-count"></span>
          </label>
          <button type="button" class="selection-page__collapse" data-collapse-key="${key}" title="Show or hide" aria-label="Show or hide: ${section.label}">${CHEVRON}</button>
        </div>
        <div class="selection-page__body">
          <div class="selection-page__body-inner">
            <ul class="selection-page__list"></ul>
          </div>
        </div>
      `
      const items = countries.map((country) => ({ country, element: this.createCountryItem(country) }))
      block.querySelector('ul')!.append(...items.map((item) => item.element))
      element.append(block)
      blocks.push({
        section,
        key,
        element: block,
        checkbox: block.querySelector('input')!,
        count: block.querySelector('.selection-page__section-count')!,
        collapseButton: block.querySelector('.selection-page__collapse')!,
        items,
      })
    }
    return { element, count, blocks }
  }

  /** A Country in a Section's list: its Flag and name. */
  private createCountryItem(country: Country): HTMLElement {
    const item = document.createElement('li')
    item.className = 'selection-page__country'
    const url = flagUrl(country)
    const flag = document.createElement(url ? 'img' : 'span')
    flag.className = 'selection-page__flag'
    if (country.kind === 'state') flag.classList.add('selection-page__flag--state')
    if (flag instanceof HTMLImageElement) Object.assign(flag, { src: url, alt: '', loading: 'lazy' })
    const name = document.createElement('span')
    name.className = 'selection-page__country-name'
    name.textContent = country.name
    item.append(flag, name)
    return item
  }

  private render(): void {
    const selection = this.selection()
    const replaced = replacedCountryIds(selection)
    const loaded = this.countries.length > 0
    /** How many Countries the Game Mode asks in this Selection. */
    const askedCount = (keys: Selection) =>
      selectionCountries(keys, this.countries).filter((country) => this.canAsk(country)).length
    const continentSelection = (continent: SelectableContinent) =>
      selection.filter((key) => key.startsWith(`${continent.id}/`))

    const shown: SelectableContinent[] = []
    for (const continent of CONTINENTS) {
      const card = this.cards.get(continent.id)!
      const disabled = this.isDisabled(continent)
      const chosen = this.chosen.has(continent.id) && !disabled
      if (chosen) shown.push(continent)
      card.checkbox.checked = chosen
      card.checkbox.disabled = disabled
      card.element.classList.toggle('selection-page__continent--chosen', chosen)
      card.element.classList.toggle('selection-page__continent--disabled', disabled)
      card.element.title = disabled ? `Nothing to ask in ${this.gameMode.label}` : ''
      card.icon.classList.toggle('continent-icon--chosen', chosen)
      // Always a line, so choosing a Continent never makes its card jump.
      const summary = chosen ? selectionSummary(continentSelection(continent), continent) : ''
      card.summary.textContent = summary || '–'
      card.summary.title = summary
      card.summary.classList.toggle('selection-page__summary--empty', !summary)
      card.count.textContent = chosen && loaded ? String(askedCount(continentSelection(continent))) : ''
    }

    // The Countries are listed once they are loaded.
    const groups = loaded ? shown.map((continent) => this.group(continent)) : []
    const current = [...this.groupList.children]
    // Only re-insert the groups when they change: that would cut a Section's animation short.
    if (groups.length !== current.length || groups.some((group, i) => group.element !== current[i])) {
      this.groupList.replaceChildren(...groups.map((group) => group.element))
    }
    groups.forEach((group, i) => {
      const continent = shown[i]
      group.count.textContent = this.cards.get(continent.id)!.count.textContent
      for (const block of group.blocks) this.updateBlock(block, this.chosen.get(continent.id)!, replaced)
    })

    const total = askedCount(selection)
    this.total.textContent = loaded && shown.length ? String(total) : ''
    this.emptyNote.hidden = shown.length > 0
    this.doneButton.disabled = loaded && total === 0
  }

  private group(continent: SelectableContinent): ContinentGroup {
    let group = this.groups.get(continent.id)
    if (!group) {
      group = this.createGroup(continent)
      this.groups.set(continent.id, group)
    }
    return group
  }

  private updateBlock(block: SectionBlock, on: Set<string>, replaced: Set<string>): void {
    const isOn = on.has(block.section.id)
    const closed = this.collapsed.has(block.key)
    block.element.classList.toggle('selection-page__section--off', !isOn)
    block.element.classList.toggle('selection-page__section--collapsed', closed)
    block.checkbox.checked = isOn
    block.collapseButton.setAttribute('aria-expanded', String(!closed))
    let count = 0
    for (const { country, element } of block.items) {
      const isReplaced = replaced.has(country.id)
      const unaskable = !isReplaced && !this.canAsk(country)
      if (!isReplaced && !unaskable) count++
      element.classList.toggle('selection-page__country--replaced', isReplaced)
      element.classList.toggle('selection-page__country--unaskable', unaskable)
      element.title = isReplaced
        ? 'Asked as its states'
        : unaskable
          ? `Not asked: ${this.gameMode.unaskableReason(country)}`
          : country.name
    }
    block.count.textContent = String(count)
  }
}
