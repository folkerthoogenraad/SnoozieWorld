// Variant B: the player only ticks Continents on the left. On the right, every chosen Continent lists
// its Countries in Sections (its Regions, then its overseas territories and uninhabited islands).
// Unticking a Section's checkbox greys out its Countries and closes it; ticking it opens it. The
// arrow on the right of a heading opens or closes it by hand.

/**
 * The Sections of a Continent: its Regions (on by default), the territories (off, except in South
 * America) and the uninhabited islands (off), then US states (off; last, as it is a long list).
 */
function sections(continent) {
  const all = COUNTRIES.filter((c) => c.continent === continent.id).sort(byName)
  return [
    ...continent.regions.filter((r) => !r.extra).map((region) => ({
      id: region.id,
      label: region.label,
      phrase: region.phrase ?? region.label,
      isDefault: true,
      countries: baseCountries(continent, region),
    })),
    {
      id: 'territories',
      label: 'Overseas territories',
      phrase: 'territories',
      isDefault: continent.id === 'south-america',
      countries: all.filter((c) => c.kind === 'territory'),
    },
    { id: 'uninhabited', label: 'Uninhabited islands', phrase: 'uninhabited islands', countries: all.filter((c) => c.kind === 'uninhabited') },
    ...continent.regions.filter((r) => r.extra).map((region) => ({
      id: region.id,
      label: region.label,
      phrase: region.phrase,
      extra: true,
      countries: baseCountries(continent, region),
    })),
  ].filter((section) => section.countries.length)
}

// The Selection: the chosen Continents, each with the ids of its Sections that are on. Choosing a
// Continent (again) starts from its default Sections.
const defaultSections = (continent) => new Set(sections(continent).filter((s) => s.isDefault).map((s) => s.id))
const chosen = new Map([
  ['europe', defaultSections(CONTINENTS.find((c) => c.id === 'europe'))],
  ['north-america', new Set(['islands', 'territories'])],
])

// Sections that are closed, by key ("europe/territories"). Ticking a Section opens it, unticking
// closes it; the arrow opens or closes it without ticking or unticking it.
const collapsed = new Set()

const isOn = (continent, section) => !!chosen.get(continent.id)?.has(section.id)
/** Closes the Sections that are off and opens the others, as when the Continent is chosen. */
function resetCollapsed(continent) {
  for (const section of sections(continent)) {
    if (isOn(continent, section)) collapsed.delete(`${continent.id}/${section.id}`)
    else collapsed.add(`${continent.id}/${section.id}`)
  }
}
for (const id of chosen.keys()) resetCollapsed(CONTINENTS.find((c) => c.id === id))
const usStatesOn = () => !!chosen.get('north-america')?.has('us-states')
/** The USA is never asked while its States are. */
const isReplaced = (c) => c.id === 'USA' && usStatesOn()
const isDisabled = (continent) => !sections(continent).some((s) => s.isDefault && s.countries.some(canAsk))
const chosenContinents = () => CONTINENTS.filter((c) => chosen.has(c.id) && !isDisabled(c))

function continentCountries(continent) {
  if (!chosen.has(continent.id) || isDisabled(continent)) return []
  const countries = sections(continent).filter((s) => isOn(continent, s)).flatMap((s) => s.countries)
  return [...new Set(countries)].filter((c) => canAsk(c) && !isReplaced(c))
}

/** What differs from the default: "Islands + territories", "without the Balkans", "US states", or "". */
function summary(continent) {
  if (!chosen.has(continent.id)) return ''
  const all = sections(continent)
  const on = all.filter((s) => s.isDefault && isOn(continent, s))
  const missing = all.filter((s) => s.isDefault && !isOn(continent, s))
  let text = ''
  if (missing.length && on.length)
    text = missing.length < on.length ? `without ${missing.map((s) => s.phrase).join(' and ')}` : on.map((s) => s.label).join(', ')
  const extras = all.filter((s) => !s.isDefault && !s.extra && isOn(continent, s)).map((s) => `+ ${s.phrase}`)
  text = [text, ...extras].filter(Boolean).join(' ')
  if (all.some((s) => s.extra && isOn(continent, s))) text = text ? `${text}, US states` : 'US states'
  return text
}

function renderContinents() {
  document.querySelector('.quiz-set__continents').innerHTML = CONTINENTS.map((continent) => {
    const disabled = isDisabled(continent)
    const selected = chosen.has(continent.id) && !disabled
    const text = selected ? summary(continent) : ''
    return `
      <label class="quiz-set__continent quiz-set__continent-head pick__continent${selected ? ' quiz-set__continent--selected' : ''}${disabled ? ' quiz-set__continent--disabled' : ''}"
        ${disabled ? `title="Nothing to ask in ${MODE_LABELS[state.gameModeId]}"` : ''}>
        <input type="checkbox" class="quiz-set__continent-check" data-continent="${continent.id}" ${selected ? 'checked' : ''} ${disabled ? 'disabled' : ''} />
        ${continentIcon(continent.id, selected)}
        <span class="quiz-set__continent-text">
          <span class="quiz-set__continent-name">${continent.label}</span>
          <span class="quiz-set__summary${text ? '' : ' quiz-set__summary--empty'}" title="${escape(text)}">${text ? escape(text) : '–'}</span>
        </span>
        <span class="quiz-set__continent-count">${selected ? continentCountries(continent).length : ''}</span>
      </label>`
  }).join('')
}

// The right side is built once per Continent and then updated in place, so Flags don't reload
// (no flicker) and Sections can open and close with an animation.
const groupElements = new Map()
let listElements

function renderSections() {
  if (!listElements) {
    const panel = document.querySelector('[data-list]')
    panel.innerHTML = `
      <section class="leaderboard">
        <h2 class="leaderboard__title">Countries <span class="pick__total"></span></h2>
        <div class="pick__groups"></div>
        <p class="leaderboard__note">Choose one or more continents to play.</p>
      </section>`
    listElements = {
      total: panel.querySelector('.pick__total'),
      groups: panel.querySelector('.pick__groups'),
      empty: panel.querySelector('.leaderboard__note'),
    }
  }
  const continents = chosenContinents()
  for (const id of groupElements.keys()) if (!continents.some((c) => c.id === id)) groupElements.delete(id)
  for (const continent of continents) if (!groupElements.has(continent.id)) groupElements.set(continent.id, buildGroup(continent))
  // Moving the existing elements keeps their loaded Flags.
  listElements.groups.replaceChildren(...continents.map((c) => groupElements.get(c.id)))
  for (const continent of continents) updateGroup(continent, groupElements.get(continent.id))

  const total = new Set(CONTINENTS.flatMap(continentCountries)).size
  listElements.total.textContent = continents.length ? total : ''
  listElements.empty.hidden = continents.length > 0
}

function buildGroup(continent) {
  const element = document.createElement('section')
  element.className = 'quiz-list__group'
  element.innerHTML = `
    <h3 class="quiz-list__continent">${continent.label} <span data-count></span></h3>
    ${sections(continent)
      .map((section) => {
        const key = `${continent.id}/${section.id}`
        return `
          <div class="pick__block" data-block="${key}">
            <div class="pick__heading">
              <label class="pick__section">
                <input type="checkbox" data-section="${key}" />
                <span class="pick__section-label">${section.label}</span>
                <span class="pick__section-count"></span>
              </label>
              <button type="button" class="pick__collapse" data-collapse="${key}" aria-label="Show or hide the ${section.label.toLowerCase()}">${CHEVRON}</button>
            </div>
            <div class="pick__body">
              <div class="pick__body-inner">
                <ul class="quiz-list__countries">
                  ${section.countries.map((c) => `<li class="quiz-list__country" data-country="${c.id}">${flagImage(c)}<span>${escape(c.name)}</span></li>`).join('')}
                </ul>
              </div>
            </div>
          </div>`
      })
      .join('')}`
  return element
}

function updateGroup(continent, element) {
  element.querySelector('[data-count]').textContent = continentCountries(continent).length
  for (const section of sections(continent)) {
    const key = `${continent.id}/${section.id}`
    const block = element.querySelector(`[data-block="${key}"]`)
    const on = isOn(continent, section)
    const closed = collapsed.has(key)
    block.classList.toggle('pick__block--off', !on)
    block.classList.toggle('pick__block--collapsed', closed)
    block.querySelector('[data-section]').checked = on
    block.querySelector('[data-collapse]').setAttribute('aria-expanded', String(!closed))
    block.querySelector('.pick__section-count').textContent = section.countries.filter((c) => canAsk(c) && !isReplaced(c)).length
    for (const c of section.countries) {
      const item = block.querySelector(`[data-country="${c.id}"]`)
      item.classList.toggle('quiz-list__country--replaced', isReplaced(c))
      item.classList.toggle('quiz-list__country--unaskable', !isReplaced(c) && !canAsk(c))
      item.title = isReplaced(c) ? 'Asked as its states' : !canAsk(c) ? `Not asked: ${leftOutReason()}` : c.name
    }
  }
}

// ---- Events ----
document.querySelector('.quiz-set__continents').addEventListener('change', (event) => {
  const continent = CONTINENTS.find((c) => c.id === event.target.dataset.continent)
  if (event.target.checked) {
    chosen.set(continent.id, defaultSections(continent))
    resetCollapsed(continent)
  } else chosen.delete(continent.id)
  updateKeepingFocus(`[data-continent="${continent.id}"]`)
})

// Ticking a Section opens it, unticking it closes it.
document.querySelector('[data-list]').addEventListener('change', (event) => {
  const key = event.target.dataset.section
  const [continentId, sectionId] = key.split('/')
  const ids = chosen.get(continentId)
  if (event.target.checked) {
    ids.add(sectionId)
    collapsed.delete(key)
  } else {
    ids.delete(sectionId)
    collapsed.add(key)
  }
  update()
})

document.querySelector('[data-list]').addEventListener('click', (event) => {
  const arrow = event.target.closest('[data-collapse]')
  if (arrow) {
    const key = arrow.dataset.collapse
    if (collapsed.has(key)) collapsed.delete(key)
    else collapsed.add(key)
    update()
  }
})

startMockup({
  quizSet: () => [...new Set(CONTINENTS.flatMap(continentCountries))],
  continents: () => chosenContinents().map((c) => c.id),
  clear: () => chosen.clear(),

  describe() {
    const parts = chosenContinents().map((c) => continentLabel(c.label, summary(c)))
    return parts.length ? parts.join(', ') : 'Nothing chosen'
  },

  /** A Continent at its default is written as just its id, so today's keys keep working. */
  key() {
    const parts = []
    for (const continent of chosenContinents()) {
      if (!summary(continent)) parts.push(continent.id)
      else for (const id of chosen.get(continent.id)) parts.push(`${continent.id}/${id}`)
    }
    return parts.sort().join(',')
  },

  render() {
    renderContinents()
    renderSections()
  },
})
