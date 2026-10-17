import { countryInfo } from '../country/country-info.ts'
import type { Continent, Country } from '../country/country.ts'

/**
 * A group of a Continent's Countries with its own checkbox on the Selection
 * page: one of its Regions, its (inhabited) Overseas Territories, or its
 * uninhabited islands.
 */
export interface Section {
  id: string
  label: string
  /** How the summary line names it: "without the Balkans", "+ territories". */
  phrase: string
  /** On when the Continent is chosen. */
  isDefault: boolean
  /**
   * The Country this Section is asked instead of: the USA for US states. That
   * Country is never asked while the Section is on, and the summary line names
   * the Section last.
   */
  replaces?: string
  includes(country: Country): boolean
}

/** A Continent as the player chooses it on the Selection page, with its Sections in the order shown. */
export interface SelectableContinent {
  /** "north-america"; also its Leaderboard key when it is at its default Sections. */
  id: string
  name: Continent
  sections: readonly Section[]
}

/**
 * The Selection: what the player chose on the Selection page, as the keys of
 * the Sections that are on, `<continent id>/<section id>` (see `sectionKey`).
 * A Continent with no Section on is not chosen.
 */
export type Selection = readonly string[]

const TERRITORIES = 'territories'
const UNINHABITED = 'uninhabited'

/** An Overseas Territory with population 0 in Country Info, e.g. Clipperton Island. */
function isUninhabited(country: Country): boolean {
  return country.kind === 'territory' && countryInfo(country)?.population === 0
}

/** [id, label, phrase in the summary line (default: the label)] */
type RegionSpec = [id: string, label: string, phrase?: string]
const MAINLAND: RegionSpec = ['mainland', 'Mainland', 'the mainland']
const ISLANDS: RegionSpec = ['islands', 'Islands', 'the islands']

/**
 * A Continent's Sections: its Regions, then its Overseas Territories (on by
 * default only when `territoriesByDefault`) and uninhabited islands, then the
 * `extra` Sections.
 */
function continent(
  name: Continent,
  regions: RegionSpec[],
  options: { territoriesByDefault?: boolean; extra?: Section[] } = {},
): SelectableContinent {
  const inContinent = (country: Country) => country.continent === name
  return {
    id: name.toLowerCase().replace(' ', '-'),
    name,
    sections: [
      ...regions.map(([id, label, phrase = label]) => ({
        id,
        label,
        phrase,
        isDefault: true,
        includes: (country: Country) => inContinent(country) && country.region === id,
      })),
      {
        id: TERRITORIES,
        label: 'Overseas territories',
        phrase: 'territories',
        isDefault: !!options.territoriesByDefault,
        includes: (country) => inContinent(country) && country.kind === 'territory' && !isUninhabited(country),
      },
      {
        id: UNINHABITED,
        label: 'Uninhabited islands',
        phrase: 'uninhabited islands',
        isDefault: false,
        includes: (country) => inContinent(country) && isUninhabited(country),
      },
      ...(options.extra ?? []),
    ],
  }
}

/**
 * Off by default, and last: it is a long list, and above it the player sees
 * that the Islands are on too. With the Mainland the States replace the USA;
 * on its own it quizzes only the States.
 */
const US_STATES: Section = {
  id: 'us-states',
  label: 'US states',
  phrase: 'US states',
  isDefault: false,
  replaces: 'USA',
  includes: (country) => country.kind === 'state',
}

/**
 * The Continents and their Regions (plans 13 and 15); the Regions of the
 * Countries are set in scripts/build-map-data.mjs. Asia and Africa follow the
 * UN's regions, west to east and north to south.
 */
export const CONTINENTS: readonly SelectableContinent[] = [
  continent('Africa', [
    ['north', 'North', 'North Africa'],
    ['west', 'West', 'West Africa'],
    ['central', 'Central', 'Central Africa'],
    ['east', 'East', 'East Africa'],
    ['southern', 'Southern', 'Southern Africa'],
  ]),
  continent('Asia', [
    ['middle-east-and-caucasus', 'Middle East and Caucasus', 'the Middle East and Caucasus'],
    ['central-and-south', 'Central and South', 'Central and South Asia'],
    ['east-and-southeast', 'East and Southeast', 'East and Southeast Asia'],
  ]),
  continent('Europe', [MAINLAND, ['balkans', 'Balkans', 'the Balkans'], ISLANDS]),
  continent('North America', [MAINLAND, ISLANDS], { extra: [US_STATES] }),
  // French Guiana and the Falkland Islands feel part of it.
  continent('South America', [['south-america', 'South America']], { territoriesByDefault: true }),
  continent('Oceania', [
    ['australia-nz', 'Australia and New Zealand'],
    ['melanesia', 'Melanesia'],
    ['micronesia', 'Micronesia'],
    ['polynesia', 'Polynesia'],
  ]),
  continent('Antarctica', [['antarctica', 'Antarctica']]),
]

export function sectionKey(continent: SelectableContinent, section: Section): string {
  return `${continent.id}/${section.id}`
}

/** The keys of the Continent's default Sections: what choosing it switches on. */
export function defaultSelection(continent: SelectableContinent): string[] {
  return continent.sections.filter((section) => section.isDefault).map((section) => sectionKey(continent, section))
}

/** The Continent's Sections that are on. */
export function sectionsOn(selection: Selection, continent: SelectableContinent): Section[] {
  return continent.sections.filter((section) => selection.includes(sectionKey(continent, section)))
}

/** The Continents with at least one Section on. */
export function chosenContinents(selection: Selection): SelectableContinent[] {
  return CONTINENTS.filter((continent) => sectionsOn(selection, continent).length > 0)
}

/** The ids of the Countries asked as something else (the USA, as its States). */
export function replacedCountryIds(selection: Selection): Set<string> {
  const sections = CONTINENTS.flatMap((continent) => sectionsOn(selection, continent))
  return new Set(sections.flatMap((section) => (section.replaces ? [section.replaces] : [])))
}

/** Whether the US States are asked, so the Map must show them instead of the USA. */
export function includesUsStates(selection: Selection): boolean {
  return CONTINENTS.some((continent) => sectionsOn(selection, continent).includes(US_STATES))
}

/**
 * The Countries in the Selection's Sections, in the order of `countries`,
 * without those asked as something else (the USA while US states is on).
 * Whether the Game Mode can ask them is up to the caller.
 */
export function selectionCountries(selection: Selection, countries: readonly Country[]): Country[] {
  const sections = CONTINENTS.flatMap((continent) => sectionsOn(selection, continent))
  const replaced = replacedCountryIds(selection)
  return countries.filter((country) => !replaced.has(country.id) && sections.some((s) => s.includes(country)))
}

/**
 * What differs from the Continent's default, for its summary line: "without the
 * Balkans", "Islands + territories", "+ territories, US states", "US states";
 * "" at the default (or when nothing is on). Names whichever is shorter: the
 * default Sections that are off ("without …") or those that are on.
 */
export function selectionSummary(selection: Selection, continent: SelectableContinent): string {
  const on = sectionsOn(selection, continent)
  const sections = continent.sections.filter((section) => !section.replaces)
  const defaultsOn = sections.filter((section) => section.isDefault && on.includes(section))
  const defaultsOff = sections.filter((section) => section.isDefault && !on.includes(section))
  let text = ''
  if (defaultsOn.length && defaultsOff.length) {
    // On a tie, the Sections that are on, unless that only repeats the Continent's name
    // (South America without its territories).
    const repeatsName = defaultsOn.every((section) => section.label === continent.name)
    const without = defaultsOff.length < defaultsOn.length || (defaultsOff.length === defaultsOn.length && repeatsName)
    text = without
      ? `without ${defaultsOff.map((section) => section.phrase).join(' and ')}`
      : defaultsOn.map((section) => section.label).join(', ')
  }
  const extras = sections.filter((section) => !section.isDefault && on.includes(section))
  text = [text, ...extras.map((section) => `+ ${section.phrase}`)].filter(Boolean).join(' ')
  const replacing = on.filter((section) => section.replaces).map((section) => section.label)
  if (replacing.length) {
    if (text) text = `${text}, ${replacing.join(', ')}`
    else text = defaultsOn.length ? `+ ${replacing.join(', ')}` : replacing.join(', ')
  }
  return text
}

/** "Europe", "Europe (without the Balkans)", "North America (Islands + territories)", "Oceania + territories". */
function continentLabel(selection: Selection, continent: SelectableContinent): string {
  const summary = selectionSummary(selection, continent)
  if (!summary) return continent.name
  return summary.startsWith('+') ? `${continent.name} ${summary}` : `${continent.name} (${summary})`
}

/**
 * The Selection in words, for the Start Screen, the Leaderboard and the Pause
 * Screen: "Europe, North America (Islands + territories)".
 */
export function selectionLabel(selection: Selection): string {
  const labels = chosenContinents(selection).map((continent) => continentLabel(selection, continent))
  return labels.length ? labels.join(', ') : 'Nothing chosen'
}

/**
 * The Selection's part of the Leaderboard and Practice Set keys: the keys of
 * the Sections that are on, sorted, where a Continent at its default is written
 * as just its id. So the keys from before plan 13 (`europe`, `asia,europe`)
 * keep their meaning.
 */
export function selectionKey(selection: Selection): string {
  const parts = chosenContinents(selection).flatMap((continent) => {
    const on = sectionsOn(selection, continent).map((section) => sectionKey(continent, section))
    const defaults = defaultSelection(continent)
    const atDefault = on.length === defaults.length && defaults.every((key) => on.includes(key))
    return atDefault ? [continent.id] : on
  })
  return parts.sort().join(',')
}

/**
 * The Region keys of Africa and Asia from before plan 15. Their new Regions
 * divide the Continent differently, so a stored Selection with any of them
 * gets the Continent's default Sections instead.
 */
const REPLACED_REGION_KEYS = ['africa/mainland', 'africa/islands', 'asia/mainland', 'asia/middle-east', 'asia/islands']

/** The known Section keys of a stored Selection, without duplicates, in the order of CONTINENTS. */
export function normalizeSelection(stored: readonly unknown[]): string[] {
  const keys = [...stored]
  for (const key of REPLACED_REGION_KEYS.filter((key) => stored.includes(key))) {
    keys.push(...defaultSelection(CONTINENTS.find((continent) => key.startsWith(`${continent.id}/`))!))
  }
  return CONTINENTS.flatMap((continent) =>
    continent.sections.map((section) => sectionKey(continent, section)).filter((key) => keys.includes(key)),
  )
}

/**
 * The Selection that quizzes what the Categories and "Individual states in
 * USA" did before plan 13. A Continent Category asked its Sovereign States:
 * its Regions, without territories, so South America leaves them out. The
 * worldwide "Overseas Territories" Category no longer exists and is dropped.
 */
export function selectionFromCategories(categoryIds: readonly unknown[], usStates: boolean): string[] {
  const keys = CONTINENTS.filter((continent) => categoryIds.includes(continent.id)).flatMap((continent) =>
    continent.sections
      .filter((section) => section.isDefault && section.id !== TERRITORIES)
      .map((section) => sectionKey(continent, section)),
  )
  if (usStates) keys.push(sectionKey(CONTINENTS.find((c) => c.sections.includes(US_STATES))!, US_STATES))
  return normalizeSelection(keys)
}

/**
 * Moves the Categories part of a stored key from before plan 13 (`asia,europe`,
 * plus whether `|us-states` followed) to its Selection key, e.g.
 * `south-america` → `south-america/south-america`. Null for a key with the
 * Overseas Territories Category: its entries stay stored but can no longer be reached.
 */
export function selectionKeyFromCategories(categories: string, usStates: boolean): string | null {
  const ids = categories ? categories.split(',') : []
  if (ids.includes('overseas-territories')) return null
  return selectionKey(selectionFromCategories(ids, usStates))
}
