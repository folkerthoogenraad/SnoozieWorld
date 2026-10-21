import { countryInfo, formatArea, formatPopulation, type FunFact } from '../country/country-info.ts'
import { createFlag } from '../country/country-label.ts'
import { capitalName, countryName } from '../country/country-names.ts'
import type { Country } from '../country/country.ts'
import '../screen/screen.css'
import './country-info-dialog.css'

const DICE_ICON = `<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="2" width="12" height="12" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.5" /><circle cx="5.4" cy="5.4" r="1.15" /><circle cx="8" cy="8" r="1.15" /><circle cx="10.6" cy="10.6" r="1.15" /></svg>`
const EXTERNAL_ICON = `<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2.5h4v4M13.5 2.5 7.5 8.5M12 9.5v3a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3" /></svg>`

/**
 * Country Info: a small modal with facts about one Country: its capital,
 * population, area, the Country an Overseas Territory or US State belongs to, and
 * a random Fun Fact. Names are in the current Language; in any other than
 * English, the English name and capital are shown below them in small grey
 * text. The dice shows another one (when there are more); the
 * source button opens the page that confirms it in a new tab. Opened by clicking the Explored Country in the Navbar, or the
 * Prompt during a Quiz Run with Hints on. Closes
 * with its button, Escape, or a click outside it.
 */
export class CountryInfoDialog {
  readonly element: HTMLDialogElement
  private countries = new Map<string, Country>()

  constructor() {
    this.element = document.createElement('dialog')
    this.element.className = 'country-info'
    // A click on the backdrop lands on the dialog element itself.
    this.element.addEventListener('click', (event) => {
      if (event.target === this.element) this.element.close()
    })
  }

  /** Provides the Countries, once loaded, to name the Sovereign State of an Overseas Territory or State. */
  setCountries(countries: readonly Country[]): void {
    this.countries = new Map(countries.map((country) => [country.id, country]))
  }

  /** Opens Country Info for one Country; `onClose` is called once it is closed. */
  open(country: Country, onClose?: () => void): void {
    const info = countryInfo(country)
    const parent = info?.partOf ? this.countries.get(info.partOf) : undefined

    const form = document.createElement('form')
    form.method = 'dialog'
    form.className = 'country-info__content'
    form.innerHTML = `
      <header class="country-info__header">
        <div class="country-info__flag"></div>
        <div>
          <h2 class="country-info__name"></h2>
          <p class="country-info__english-name" lang="en" hidden></p>
          <p class="country-info__kind"></p>
        </div>
      </header>
      <dl class="country-info__facts"></dl>
      <div class="country-info__fun-fact" hidden>
        <div class="country-info__fun-fact-header">
          <h3 class="country-info__fun-fact-title">Fun fact</h3>
          <button type="button" class="country-info__fun-fact-button country-info__reroll" title="Another fun fact" aria-label="Another fun fact">${DICE_ICON}</button>
          <a class="country-info__fun-fact-button country-info__source" target="_blank" rel="noopener noreferrer">${EXTERNAL_ICON}</a>
        </div>
        <p class="country-info__fun-fact-text"></p>
      </div>
      <div class="country-info__actions">
        <button class="screen__button" value="close" autofocus>Close</button>
      </div>
    `
    const part = (name: string) => form.querySelector<HTMLElement>(`.country-info__${name}`)!
    part('flag').append(createFlag(country, 'large'))
    const name = countryName(country)
    part('name').textContent = name
    const englishName = englishVersion(name, countryName(country, 'en'))
    part('english-name').textContent = englishName ? `In English: ${englishName}` : ''
    part('english-name').hidden = !englishName
    const parentName = parent ? countryName(parent) : 'another country'
    part('kind').textContent =
      country.kind === 'territory'
        ? `Overseas territory of ${parentName}`
        : country.kind === 'sovereign'
          ? `Sovereign state in ${country.continent}`
          : country.kind === 'state'
            ? `${country.id === 'US-DC' ? 'Federal district' : 'State'} of ${parentName}`
            : 'Not a country'

    const facts = part('facts')
    const addFact = (label: string, value: string, ...notes: (string | undefined)[]) => {
      const row = document.createElement('div')
      row.className = 'country-info__fact'
      const term = document.createElement('dt')
      term.textContent = label
      const description = document.createElement('dd')
      description.textContent = value
      for (const note of notes) {
        if (!note) continue
        const small = document.createElement('small')
        small.className = 'country-info__note'
        small.textContent = note
        description.append(small)
      }
      row.append(term, description)
      facts.append(row)
    }
    if (info) {
      const capital = capitalName(country)
      const englishCapital = capital && englishVersion(capital, info.capital)
      addFact('Capital', capital ?? 'None', englishCapital ? `In English: ${englishCapital}` : undefined, info.capitalNote)
      addFact('Population', formatPopulation(info.population))
      addFact('Area', formatArea(info.area))
      if (info.funFacts.length) this.showFunFacts(form, info.funFacts)
    } else {
      addFact('Area', formatArea(Math.round(country.area)))
    }

    this.element.replaceChildren(form)
    if (onClose) this.element.addEventListener('close', onClose, { once: true })
    this.element.showModal()
  }

  /** Shows a random Fun Fact; the dice picks another one (never the same twice in a row). */
  private showFunFacts(form: HTMLElement, facts: readonly FunFact[]): void {
    const box = form.querySelector<HTMLElement>('.country-info__fun-fact')!
    const text = form.querySelector<HTMLElement>('.country-info__fun-fact-text')!
    const source = form.querySelector<HTMLAnchorElement>('.country-info__source')!
    const reroll = form.querySelector<HTMLButtonElement>('.country-info__reroll')!
    let index = Math.floor(Math.random() * facts.length)
    const show = () => {
      const fact = facts[index]
      text.textContent = fact.text
      source.href = fact.source
      source.title = `Source: ${hostname(fact.source)} (opens in a new tab)`
      source.setAttribute('aria-label', source.title)
    }
    box.hidden = false
    reroll.hidden = facts.length < 2
    reroll.addEventListener('click', () => {
      index = (index + 1 + Math.floor(Math.random() * (facts.length - 1))) % facts.length
      show()
      restartAnimation(text, 'country-info__fun-fact-text--new')
      restartAnimation(reroll, 'country-info__reroll--roll')
    })
    show()
  }
}

/** The English name when it differs from the one shown (so never in English); null otherwise. */
function englishVersion(shown: string, english: string | null): string | null {
  return english && english !== shown ? english : null
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function restartAnimation(element: HTMLElement, className: string): void {
  element.classList.remove(className)
  void element.offsetWidth
  element.classList.add(className)
}
