// Variant A: Continent cards that open to show their Regions and Region Options.

// The Selection: ticked Regions ("europe/mainland") and Region Options that are on
// ("north-america/islands/territories"). Unticking a Region drops its Region Options, so ticking it
// again (or the Continent) starts from the default.
const selection = new Set(['europe/mainland', 'europe/balkans', 'europe/islands', 'north-america/islands', 'north-america/islands/territories'])
let openContinent = 'north-america'

const keyOf = (continent, region) => `${continent.id}/${region.id}`
const isTicked = (continent, region) => selection.has(keyOf(continent, region))
const usStatesOn = () => selection.has('north-america/us-states')
const tickedRegions = (continent) => continent.regions.filter((r) => isTicked(continent, r))
/** A Region's Region Options: its inhabited overseas territories and its uninhabited islands, if it has any. */
function regionOptions(continent, region) {
  const countries = inRegion(continent, region)
  return [
    { id: 'territories', label: 'Include overseas territories', short: 'territories', countries: countries.filter((c) => c.kind === 'territory') },
    { id: 'uninhabited', label: 'Include uninhabited islands', short: 'uninhabited islands', countries: countries.filter((c) => c.kind === 'uninhabited') },
  ].filter((option) => option.countries.length)
}

const optionOn = (continent, region, option) => selection.has(`${keyOf(continent, region)}/${option.id}`)

/** The Countries a ticked Region adds, as asked in the current Game Mode. */
function regionCountries(continent, region) {
  let countries = baseCountries(continent, region)
  for (const option of regionOptions(continent, region))
    if (optionOn(continent, region, option)) countries = countries.concat(option.countries)
  if (usStatesOn() && region.id === 'mainland') countries = countries.filter((c) => c.id !== 'USA')
  return countries.filter(canAsk).sort(byName)
}

/** Nothing to ask by default in this Game Mode (Antarctica in Capital to Location): its checkbox is disabled. */
const isDisabled = (continent) => !mainRegions(continent).some((r) => baseCountries(continent, r).some(canAsk))

/** The Continents with anything ticked that can be asked. */
const activeContinents = () => CONTINENTS.filter((c) => tickedRegions(c).length && !isDisabled(c))

function continentCountries(continent) {
  if (isDisabled(continent)) return []
  return [...new Set(tickedRegions(continent).flatMap((r) => regionCountries(continent, r)))]
}

/** What differs from the default: "Islands + territories", "without the Balkans", "US states", or "". */
function summary(continent) {
  const ticked = tickedRegions(continent)
  if (!ticked.length) return ''
  const main = mainRegions(continent).filter((r) => ticked.includes(r))
  const missing = mainRegions(continent).filter((r) => !ticked.includes(r))
  let text = ''
  if (missing.length && main.length)
    text = missing.length < main.length ? `without ${missing.map((r) => r.phrase).join(' and ')}` : main.map((r) => r.label).join(', ')
  const options = new Set(ticked.flatMap((r) => regionOptions(continent, r).filter((o) => optionOn(continent, r, o)).map((o) => `+ ${o.short}`)))
  text = [text, ...options].filter(Boolean).join(' ')
  if (ticked.some((r) => r.extra)) text = text ? `${text}, US states` : 'US states'
  return text
}

startMockup({
  quizSet: () => [...new Set(CONTINENTS.flatMap(continentCountries))],
  continents: () => activeContinents().map((c) => c.id),
  clear: () => selection.clear(),

  describe() {
    const parts = activeContinents().map((c) => continentLabel(c.label, summary(c)))
    return parts.length ? parts.join(', ') : 'Nothing chosen'
  },

  /** A Continent at its default is written as just its id, so today's keys keep working. */
  key() {
    const parts = []
    for (const continent of activeContinents()) {
      const ticked = tickedRegions(continent)
      if (!summary(continent)) parts.push(continent.id)
      else
        for (const region of ticked) {
          parts.push(keyOf(continent, region))
          for (const option of regionOptions(continent, region))
            if (optionOn(continent, region, option)) parts.push(`${keyOf(continent, region)}/${option.id}`)
        }
    }
    return parts.sort().join(',')
  },

  render() {
    renderContinents()
    renderList()
  },
})

function renderContinents() {
  document.querySelector('.quiz-set__continents').innerHTML = CONTINENTS.map((continent) => {
    const ticked = tickedRegions(continent)
    const allMain = mainRegions(continent).every((r) => ticked.includes(r))
    const disabled = isDisabled(continent)
    const open = openContinent === continent.id && !disabled
    const text = summary(continent)
    return `
      <section class="quiz-set__continent${ticked.length && !disabled ? ' quiz-set__continent--selected' : ''}${open ? ' quiz-set__continent--open' : ''}${disabled ? ' quiz-set__continent--disabled' : ''}"
        ${disabled ? `title="Nothing to ask in ${MODE_LABELS[state.gameModeId]}"` : ''}>
        <div class="quiz-set__continent-head" data-open="${continent.id}">
          <input type="checkbox" class="quiz-set__continent-check" data-continent="${continent.id}" aria-label="${continent.label}"
            ${allMain && !disabled ? 'checked' : ''} ${disabled ? 'disabled' : ''} data-indeterminate="${ticked.length > 0 && !allMain && !disabled}" />
          ${continentIcon(continent.id, ticked.length > 0 && !disabled)}
          <span class="quiz-set__continent-text">
            <span class="quiz-set__continent-name">${continent.label}</span>
            <span class="quiz-set__summary${text ? '' : ' quiz-set__summary--empty'}" title="${escape(text)}">${text ? escape(text) : '–'}</span>
          </span>
          <span class="quiz-set__continent-count">${ticked.length && !disabled ? continentCountries(continent).length : ''}</span>
          <button type="button" class="quiz-set__toggle" aria-expanded="${open}" aria-label="${open ? 'Close' : 'Open'} ${continent.label}" ${disabled ? 'disabled' : ''}>${CHEVRON}</button>
        </div>
        ${open ? renderRegions(continent) : ''}
      </section>`
  }).join('')
  for (const input of document.querySelectorAll('[data-indeterminate="true"]')) input.indeterminate = true
}

function renderRegions(continent) {
  const single = continent.regions.length === 1
  return `
    <div class="quiz-set__regions">
      ${continent.regions
        .map((region) => {
          const key = keyOf(continent, region)
          const ticked = isTicked(continent, region)
          const base = baseCountries(continent, region)
          let contents = (region.hint ? `${region.hint}: ` : '') + names(base)
          if (region.id === 'mainland' && usStatesOn()) contents = contents.replace('United States of America', 'United States (as its states)')
          const asked = base.filter(canAsk).filter((c) => !(usStatesOn() && c.id === 'USA'))
          const head = single
            ? `<div class="start-screen__option" style="cursor: default">
                 <span class="quiz-set__region-text"><span class="quiz-set__contents" title="${escape(contents)}">${escape(contents)}</span></span>
               </div>`
            : `<label class="start-screen__option">
                 <input type="checkbox" data-region="${key}" ${ticked ? 'checked' : ''} />
                 <span class="quiz-set__region-text">
                   <span class="start-screen__option-label">${region.label}</span>
                   <span class="quiz-set__contents" title="${escape(contents)}">${escape(contents)}</span>
                 </span>
                 <span class="start-screen__count">${ticked ? asked.length : ''}</span>
               </label>`
          const options = regionOptions(continent, region)
            .map((option) => {
              const on = optionOn(continent, region, option)
              return `
                <label class="start-screen__option quiz-set__option${ticked ? '' : ' quiz-set__option--disabled'}" ${ticked ? '' : `title="Tick ${region.label} first"`}>
                  <input type="checkbox" data-option="${key}/${option.id}" ${on ? 'checked' : ''} ${ticked ? '' : 'disabled'} />
                  <span class="quiz-set__region-text">
                    <span class="start-screen__option-label">${option.label}</span>
                    <span class="quiz-set__contents" title="${escape(names(option.countries))}">${escape(names(option.countries))}</span>
                  </span>
                  <span class="start-screen__count">${on ? `+${option.countries.filter(canAsk).length}` : ''}</span>
                </label>`
            })
            .join('')
          return `<div class="quiz-set__region">${head}${options}</div>`
        })
        .join('')}
    </div>`
}

/** Where the Leaderboard usually is: every Country in the Selection, by Continent, Region and Region Option. */
function renderList() {
  const set = CONTINENTS.flatMap(continentCountries)
  const leftOut = []
  const groups = CONTINENTS.map((continent) => {
    const countries = continentCountries(continent)
    if (!countries.length) return ''
    const sections = tickedRegions(continent)
      .flatMap((region) => {
        const options = regionOptions(continent, region).filter((o) => optionOn(continent, region, o))
        let base = baseCountries(continent, region)
        if (usStatesOn() && region.id === 'mainland') base = base.filter((c) => c.id !== 'USA')
        for (const c of [...base, ...options.flatMap((o) => o.countries)]) if (!canAsk(c)) leftOut.push(c)
        return [
          { label: continent.regions.length > 1 ? region.label : continent.label, countries: base.filter(canAsk) },
          ...options.map((o) => ({ label: o.short[0].toUpperCase() + o.short.slice(1), countries: o.countries.filter(canAsk) })),
        ]
      })
      .filter((section) => section.countries.length)
      .map(
        (section) => `
          <h4 class="quiz-list__region">${section.label} · ${section.countries.length}</h4>
          <ul class="quiz-list__countries">
            ${section.countries.map((c) => `<li class="quiz-list__country">${flagImage(c)}<span title="${escape(c.name)}">${escape(c.name)}</span></li>`).join('')}
          </ul>`,
      )
      .join('')
    return `
      <section class="quiz-list__group">
        <h3 class="quiz-list__continent">${continent.label} <span>${countries.length}</span></h3>
        ${sections}
      </section>`
  }).join('')

  document.querySelector('[data-list]').innerHTML = `
    <section class="leaderboard">
      <h2 class="leaderboard__title">Your quiz</h2>
      <p class="leaderboard__subtitle">${set.length} countries · ${MODE_LABELS[state.gameModeId]}</p>
      ${groups || '<p class="leaderboard__note">Tick a continent to add its countries.</p>'}
      ${leftOut.length ? `<p class="quiz-list__left-out">Left out (${leftOutReason()}): ${escape(names(leftOut.sort(byName)))}.</p>` : ''}
    </section>`
}

// ---- Events ----
const continentList = document.querySelector('.quiz-set__continents')

/** Drops every Region and Region Option of a Continent (or of one Region, with `prefix`). */
function drop(prefix) {
  for (const key of [...selection]) if (key === prefix || key.startsWith(`${prefix}/`)) selection.delete(key)
}

continentList.addEventListener('change', (event) => {
  const input = event.target
  if (input.dataset.continent) {
    const continent = CONTINENTS.find((c) => c.id === input.dataset.continent)
    // Ticking starts from the default: the main Regions, no Region Options.
    drop(continent.id)
    if (input.checked) for (const region of mainRegions(continent)) selection.add(keyOf(continent, region))
    return updateKeepingFocus(`[data-continent="${continent.id}"]`)
  }
  if (input.dataset.region) {
    drop(input.dataset.region)
    if (input.checked) selection.add(input.dataset.region)
    return updateKeepingFocus(`[data-region="${input.dataset.region}"]`)
  }
  if (input.checked) selection.add(input.dataset.option)
  else selection.delete(input.dataset.option)
  updateKeepingFocus(`[data-option="${input.dataset.option}"]`)
})

// A click on a Continent's row (but not on its checkbox) opens or closes it.
continentList.addEventListener('click', (event) => {
  const head = event.target.closest('[data-open]')
  if (!head || event.target.closest('input') || head.closest('.quiz-set__continent--disabled')) return
  openContinent = openContinent === head.dataset.open ? null : head.dataset.open
  updateKeepingFocus(`[data-open="${head.dataset.open}"] .quiz-set__toggle`)
})
