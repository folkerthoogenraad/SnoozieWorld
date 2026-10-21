import { countryName } from './country-names.ts'
import type { Country } from './country.ts'
import { flagUrl } from './flag.ts'
import './country-label.css'

/** A Country's Flag; a striped placeholder when it has none. */
export function createFlag(country: Country, size: 'small' | 'large' = 'small'): HTMLElement {
  const url = flagUrl(country)
  const flag = document.createElement(url ? 'img' : 'span')
  flag.className = `flag flag--${size}`
  if (country.kind === 'state') flag.classList.add('flag--state')
  if (url) {
    Object.assign(flag, { src: url, alt: '' })
  } else {
    flag.classList.add('flag--missing')
  }
  return flag
}

/** A Country's Flag followed by its name in the current Language. */
export function createCountryLabel(country: Country): HTMLElement {
  const label = document.createElement('span')
  label.className = 'country-label'

  const name = document.createElement('span')
  name.className = 'country-label__name'
  name.textContent = countryName(country)

  label.append(createFlag(country), name)
  return label
}
