import type { Feature, MultiPolygon, Polygon } from 'geojson'
import { feature } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'

/**
 * - sovereign: a sovereign state (the 193 UN members plus Vatican City, Kosovo, Taiwan, Palestine and Western Sahara)
 * - territory: an Overseas Territory, belonging to a sovereign state
 * - other: anything else, e.g. Antarctica or unclaimed land like Bir Tawil; only Antarctica is asked
 * - state: a US State, lying on top of the USA; only shown and asked with the US states Section
 */
export type CountryKind = 'sovereign' | 'territory' | 'other' | 'state'

export type Continent = 'Africa' | 'Antarctica' | 'Asia' | 'Europe' | 'North America' | 'Oceania' | 'South America'

export interface Country {
  /** Unique id (a Natural Earth code), e.g. "NLD". */
  id: string
  name: string
  kind: CountryKind
  /** ISO 3166-1 alpha-2 code, used for the Flag. Null when the Country has none. */
  isoA2: string | null
  isoA3: string | null
  /** Natural Earth id of the sovereign state, e.g. "FR1" for French Guiana. */
  sovereign: string
  continent: Continent
  subregion: string
  /**
   * The Region of its Continent, e.g. "mainland", "balkans", "us-states" (see
   * scripts/build-map-data.mjs). Set for Sovereign States, US States and
   * Antarctica; null for Overseas Territories and the other Other Areas.
   */
  region: string | null
  /** [longitude, latitude] of a good point to place a label or Tiny Country Marker. */
  labelPoint: [number, number]
  /** Land area in km². */
  area: number
  /** True when the Country has a Flag that no other Country shares (Réunion, for example, uses the French flag). */
  distinctFlag: boolean
  /** For a State: the id of the Country it is part of ("USA"). */
  stateOf?: string
}

export type CountryShape = Feature<Polygon | MultiPolygon, Omit<Country, 'id'>> & { id: string }

const DATASET_URL = `${import.meta.env.BASE_URL}data/countries.topo.json`

/** Loads the shapes of all Countries (see scripts/build-map-data.mjs). */
export async function loadCountryShapes(): Promise<CountryShape[]> {
  const response = await fetch(DATASET_URL)
  if (!response.ok) throw new Error(`Failed to load Country dataset: ${response.status}`)
  const topology = (await response.json()) as Topology<{ countries: GeometryCollection<Omit<Country, 'id'>> }>
  return feature(topology, topology.objects.countries).features as CountryShape[]
}

export function toCountry(shape: CountryShape): Country {
  return { id: shape.id, ...shape.properties }
}
