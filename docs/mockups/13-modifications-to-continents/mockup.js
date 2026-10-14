// Shared by both mockups of plan 13: the data, the Start Screen (Game Mode, Modifiers, Leaderboard)
// and switching between the Start Screen and the Selection page. Each mockup page defines the
// Selection itself and calls startMockup() with:
//   render()     draws the Selection page
//   quizSet()    the Countries asked, as an array
//   describe()   the label: "Europe, North America (Islands + territories)"
//   key()        the Leaderboard key, without the Game Mode
//   continents() the ids of the Continents with anything selected
//   clear()      selects nothing

const COUNTRIES = DATA.countries
const ICONS = DATA.icons
const FLAG_DIR = '../../../node_modules/flag-icons/flags/4x3/'
const US_FLAG_DIR = '../../../src/country/us-state-flags/'

const state = {
  page: 'selection',
  gameModeId: 'name-to-location',
  modifiers: { flag: 'name-and-flag', guesses: 'two-guesses', hints: 'hints' },
  explainedModifier: null,
}

const svg = (body) =>
  `<svg class="modifier-icon" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`
const TEXT = '<path d="M1.5 3.5h6.5M4.75 3.5v9.5" />'
const FLAG = '<path d="M9.5 14V2.5M9.5 3h5l-1.4 2.5 1.4 2.5h-5" />'
const digit = (d) =>
  `<text x="8" y="12.6" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor" stroke="none">${d}</text>`
const SKULL =
  '<path fill="currentColor" stroke="none" fill-rule="evenodd" d="M8 1.5c-3.3 0-5.6 2.3-5.6 5.3 0 1.7.8 3.1 2 3.9v2.3c0 .4.3.7.7.7h1.4v-1.5h1v1.5h1v-1.5h1v1.5h1.4c.4 0 .7-.3.7-.7v-2.3c1.2-.8 2-2.2 2-3.9 0-3-2.3-5.3-5.6-5.3zM4.6 7.4a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0zm3.8 0a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0z" />'
const BULB = '<path d="M8 1.5a4.3 4.3 0 0 0-2.5 7.8c.4.3.6.8.6 1.3v.6h3.8v-.6c0-.5.2-1 .6-1.3A4.3 4.3 0 0 0 8 1.5zM6.2 13.5h3.6M7 15h2" />'
const SLASH = '<path d="M2 2l12 12" />'
const MODIFIERS = {
  flag: { label: 'Flag', states: [
    { id: 'name-and-flag', label: 'Name and flag', description: 'You get the name and the flag of the country.', icon: svg(TEXT + FLAG) },
    { id: 'name-only', label: 'Name only', description: 'You only get the name of the country, no flag.', icon: svg('<g transform="translate(3.5 0)">' + TEXT + '</g>') },
    { id: 'flag-only', label: 'Flag only', description: 'You only get the flag. Countries that share a flag (like Réunion) are left out.', icon: svg('<g transform="translate(-4 0)">' + FLAG + '</g>') },
  ] },
  guesses: { label: 'Guesses', states: [
    { id: 'two-guesses', label: 'Two guesses', description: 'You get two guesses per country. Right on the second guess counts as half correct.', icon: svg(digit('2')) },
    { id: 'single-guess', label: 'Single guess', description: 'You get only one guess per country.', icon: svg(digit('1')) },
    { id: 'sudden-death', label: 'Sudden death', description: 'One guess per country, and one wrong guess ends the whole quiz.', icon: svg(SKULL) },
  ] },
  hints: { label: 'Hints', states: [
    { id: 'hints', label: 'Hints', description: 'After a wrong guess, a hint shows which country you clicked.', icon: svg(BULB) },
    { id: 'no-hints', label: 'No hints', description: "A wrong guess doesn't tell you which country you clicked.", icon: svg(BULB + SLASH) },
  ] },
}
const MODE_MODIFIERS = { 'name-to-location': ['flag', 'guesses', 'hints'], 'capital-to-location': ['guesses', 'hints'] }
const MODE_LABELS = { 'name-to-location': 'Name to Location', 'capital-to-location': 'Capital to Location' }

// Sample entries, to show that "europe" keeps its Leaderboard.
const LEADERBOARDS = {
  'name-to-location|europe': [
    { score: 96, correct: 44, half: 2, missed: 0, time: '4:12', date: '3 Oct 2026' },
    { score: 91, correct: 41, half: 3, missed: 2, time: '5:01', date: '28 Sep 2026', modifiers: ['flag-only'] },
    { score: 84, correct: 38, half: 4, missed: 4, time: '6:40', date: '21 Sep 2026' },
  ],
}

// ---- Continents and Regions, as proposed in the plan ----
// A Continent with one Region ("all") shows no Region checkbox, only its Region Options. A Region with
// `extra` is not ticked by the Continent checkbox: the US States replace the USA, which would change
// what "North America" is.
const MAINLAND = { id: 'mainland', label: 'Mainland', phrase: 'the mainland' }
const ISLANDS = { id: 'islands', label: 'Islands', phrase: 'the islands' }
const CONTINENTS = [
  { id: 'africa', label: 'Africa', regions: [MAINLAND, ISLANDS] },
  { id: 'asia', label: 'Asia', regions: [MAINLAND, { id: 'middle-east', label: 'Middle East', phrase: 'the Middle East' }, ISLANDS] },
  { id: 'europe', label: 'Europe', regions: [MAINLAND, { id: 'balkans', label: 'Balkans', phrase: 'the Balkans' }, ISLANDS] },
  { id: 'north-america', label: 'North America', regions: [
    { ...MAINLAND, hint: 'Canada to Panama' },
    { id: 'us-states', label: 'US states', phrase: 'the US states', hint: 'Instead of the USA', extra: true },
    { ...ISLANDS, hint: 'The Caribbean' },
  ] },
  { id: 'south-america', label: 'South America', regions: [{ id: 'all', label: 'South America' }] },
  { id: 'oceania', label: 'Oceania', regions: ['Australia and New Zealand', 'Melanesia', 'Micronesia', 'Polynesia'].map((label) => ({
    id: label === 'Australia and New Zealand' ? 'australia-nz' : label.toLowerCase(), label, phrase: label,
  })) },
  { id: 'antarctica', label: 'Antarctica', regions: [{ id: 'all', label: 'Antarctica' }] },
]


// ---- Helpers ----
const canAsk = (c) =>
  state.gameModeId === 'capital-to-location' ? c.capital : state.modifiers.flag !== 'flag-only' || c.distinctFlag
/** Why a Country can't be asked in the current Game Mode. */
const leftOutReason = () => (state.gameModeId === 'capital-to-location' ? 'no capital' : 'shares a flag')
const byName = (a, b) => a.name.localeCompare(b.name)
const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
const names = (countries) => countries.map((c) => c.name).join(', ')
const CHEVRON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" /></svg>'
const continentIcon = (id, selected) =>
  `<span class="continent-icon${selected ? ' continent-icon--selected' : ''}">${ICONS[id]}</span>`
const flagImage = (c) =>
  c.flagFile
    ? `<img class="quiz-list__flag" alt="" loading="lazy" src="${c.flagFile.startsWith('us:') ? US_FLAG_DIR + c.flagFile.slice(3) : FLAG_DIR + c.flagFile}.svg" onerror="this.removeAttribute('src')" />`
    : '<span class="quiz-list__flag"></span>'
const inRegion = (continent, region) =>
  COUNTRIES.filter((c) => c.continent === continent.id && c.region === region.id).sort(byName)
const baseCountries = (continent, region) =>
  inRegion(continent, region).filter((c) => c.kind === 'sovereign' || c.kind === 'state')
const mainRegions = (continent) => continent.regions.filter((r) => !r.extra)
/** "Europe", "Europe (without the Balkans)", "South America + territories". */
const continentLabel = (label, text) =>
  !text ? label : text.startsWith('+') ? `${label} ${text}` : `${label} (${text})`

// ---- Start Screen ----
let variant

function renderSelectionButton() {
  const ids = variant.continents()
  document.querySelector('.start-screen__selection-icons').innerHTML = (ids.length ? ids : ['europe'])
    .map((id) => continentIcon(id, ids.length > 0))
    .join('')
  document.querySelector('.start-screen__selection-title').textContent = variant.describe()
  document.querySelector('.start-screen__selection-detail').textContent = `${variant.quizSet().length} countries · change`
}

function renderModifiers() {
  const ids = MODE_MODIFIERS[state.gameModeId]
  document.querySelector('.start-screen__modifiers').innerHTML = ids
    .map((id) => {
      const modifier = MODIFIERS[id]
      const modifierState = modifier.states.find((s) => s.id === state.modifiers[id])
      const on = modifierState !== modifier.states[0]
      return `<button type="button" class="start-screen__modifier${on ? ' start-screen__modifier--on' : ''}" data-modifier="${id}" title="${modifier.label}: ${modifierState.label}">${modifierState.icon}</button>`
    })
    .join('')
  const explanation = document.querySelector('.start-screen__modifier-explanation')
  const id = state.explainedModifier
  if (!id || !ids.includes(id)) {
    explanation.textContent = 'Click a modifier to change it.'
    return
  }
  const modifierState = MODIFIERS[id].states.find((s) => s.id === state.modifiers[id])
  explanation.innerHTML = `<b>${MODIFIERS[id].label}: ${modifierState.label}.</b> ${modifierState.description}`
}

function renderLeaderboard() {
  const key = `${state.gameModeId}|${variant.key()}`
  const entries = LEADERBOARDS[key] ?? []
  const rows = Array.from({ length: 10 }, (_, i) => {
    const e = entries[i]
    if (!e)
      return `<li class="leaderboard__row leaderboard__row--empty"><span class="leaderboard__rank">${i + 1}</span><span class="leaderboard__score">–</span><span class="leaderboard__modifiers"></span><span class="leaderboard__counts"></span><span class="leaderboard__time"></span><span class="leaderboard__date"></span></li>`
    const icons = (e.modifiers ?? [])
      .map((id) => MODIFIERS.flag.states.find((s) => s.id === id))
      .map((s) => `<span class="leaderboard__modifier" title="Flag: ${s.label}">${s.icon}</span>`)
      .join('')
    return `<li class="leaderboard__row"><span class="leaderboard__rank">${i + 1}</span><span class="leaderboard__score">${e.score}%</span><span class="leaderboard__modifiers">${icons}</span><span class="leaderboard__counts"><span class="leaderboard__correct">✓ ${e.correct}</span><span class="leaderboard__half-correct">~ ${e.half}</span><span class="leaderboard__missed">✗ ${e.missed}</span></span><span class="leaderboard__time" title="Time">${e.time}</span><span class="leaderboard__date">${e.date}</span></li>`
  }).join('')
  document.querySelector('[data-leaderboard]').innerHTML = `
    <section class="leaderboard">
      <h2 class="leaderboard__title">Leaderboard</h2>
      <p class="leaderboard__subtitle">${escape(variant.describe())} · ${MODE_LABELS[state.gameModeId]}</p>
      <ol class="leaderboard__list">${rows}</ol>
      ${entries.length ? '' : '<p class="leaderboard__note">No scores yet. Finish this quiz to get on the board.</p>'}
    </section>`
  document.querySelector('[data-key]').textContent = key
}

function update() {
  for (const element of document.querySelectorAll('[data-page]')) element.hidden = element.dataset.page !== state.page
  variant.render()
  renderSelectionButton()
  renderModifiers()
  renderLeaderboard()
  const total = variant.quizSet().length
  const start = document.querySelector('[data-start]')
  start.textContent = total ? `Start quiz (${total})` : 'Start quiz'
  start.disabled = total === 0
  document.querySelector('[data-done]').disabled = total === 0
}

/** Re-renders, then puts the keyboard focus back on the element matching the selector (render() replaced it). */
function updateKeepingFocus(selector) {
  update()
  if (selector) document.querySelector(selector)?.focus()
}

function startMockup(selectionVariant) {
  variant = selectionVariant

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-goto]')
    if (button && !button.disabled) {
      state.page = button.dataset.goto
      update()
    }
  })

  document.querySelector('[data-clear]').addEventListener('click', () => {
    variant.clear()
    update()
  })

  document.querySelectorAll('input[name="game-mode"]').forEach((input) =>
    input.addEventListener('change', () => {
      state.gameModeId = input.value
      update()
    }),
  )

  document.querySelector('.start-screen__modifiers').addEventListener('click', (event) => {
    const button = event.target.closest('[data-modifier]')
    if (!button) return
    const id = button.dataset.modifier
    const states = MODIFIERS[id].states
    const index = states.findIndex((s) => s.id === state.modifiers[id])
    state.modifiers[id] = states[(index + 1) % states.length].id
    state.explainedModifier = id
    updateKeepingFocus(`[data-modifier="${id}"]`)
  })

  update()
}
