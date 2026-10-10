import type { Country } from './country.ts'
import { flagUrl } from './flag.ts'
import './country-label.css'

/** A Country's Flag; a striped placeholder when it has none. */
export function createFlag(country: Country, size: 'small' | 'large' = 'small'): HTMLElement {
  const url = flagUrl(country)
  const flag = document.createElement(url ? 'img' : 'span')
  flag.className = `flag flag--${size}`
  if (url) {
    Object.assign(flag, { src: url, alt: '' })
  } else {
    flag.classList.add('flag--missing')
  }
  return flag
}

/** A Country's Flag followed by its name. */
export function createCountryLabel(country: Country): HTMLElement {
  const label = document.createElement('span')
  label.className = 'country-label'

  const name = document.createElement('span')
  name.className = 'country-label__name'
  name.textContent = country.name

  label.append(createFlag(country), name)
  return label
}
