import { geoMercator, geoPath } from 'd3-geo'
import { select } from 'd3-selection'
import 'd3-transition'
import { zoom, zoomIdentity, type D3ZoomEvent, type ZoomBehavior, type ZoomTransform } from 'd3-zoom'
import { countryInfo } from '../country/country-info.ts'
import { toCountry, type Country, type CountryShape } from '../country/country.ts'
import './world-map.css'

// The world is projected once into "world units": WORLD_WIDTH wide, from
// NORTH_EDGE down to SOUTH_EDGE. Mercator stretches towards the poles, so the
// Map stops at these latitudes (Greenland's tip is at 83.7°N; south of 72°S
// is only Antarctic interior).
const WORLD_WIDTH = 1000
const NORTH_EDGE = 84
const SOUTH_EDGE = -72

// Zoom relative to the whole world fitting the screen. Deep enough to make
// Vatican City (a ~110m square in the dataset) clickable.
const MAX_ZOOM = 5000

// Tiny Country Markers: Countries smaller than this (km²) get a circle marker…
const MARKER_MAX_AREA = 2500
// …which is shown while the Country itself is smaller than this on screen (px).
const MARKER_HIDE_SIZE = 16
const MARKER_RADIUS = 5
// Capital Dots: radius on screen (px).
const CAPITAL_RADIUS = 2.5
// Radius of the invisible clickable area around a marker; larger for fingers.
const MARKER_HIT_RADIUS = matchMedia('(pointer: coarse)').matches ? 16 : 10

/** A Quiz-related look of a Country on the Map. */
export type CountryState = 'excluded' | 'correct' | 'half-correct' | 'missed'
const COUNTRY_STATES: readonly CountryState[] = ['excluded', 'correct', 'half-correct', 'missed']

// Focus: space kept free around the Country, and the minimum size it gets on screen (px).
const FOCUS_MARGIN = 60
const FOCUS_MIN_SIZE = 120

// The world repeats left and right. These copies (in world widths) are drawn;
// the view is wrapped so its centre always lies on copy 0, and it is never
// wider than two worlds, so these three always fill it.
const WORLD_COPIES = [-1, 0, 1]

// How long a Hint stays on the Map (ms).
const HINT_DURATION = 2500
// How long Countries take to fade back to land in fadeOutCountryStates (ms); see .map--fading.
const FADE_DURATION = 600

const SVG_NS = 'http://www.w3.org/2000/svg'

type CountryListener = (country: Country | null) => void
/** A point on the Map element, in pixels from its top-left corner. */
export type MapPoint = [number, number]
type CountryClickListener = (country: Country | null, point: MapPoint) => void

/** A Map Notice: a short text, optionally with one button. */
export interface MapNotice {
  text: string
  action?: { label: string; onClick: () => void }
}

interface Marker {
  element: SVGGElement
  dot: SVGCircleElement
  hit: SVGCircleElement
  /** Size of the Country in world units; the marker hides once size × zoom reaches MARKER_HIDE_SIZE. */
  size: number
}

/** [[left, top], [right, bottom]] in world units. */
type Bounds = [[number, number], [number, number]]

/**
 * The Map: the world map that takes up the screen below the Navbar.
 * Every Country is drawn as one SVG path; the Ocean is the area behind them.
 * Countries too small to click get a Tiny Country Marker, and every capital a
 * Capital Dot. The US States lie on top of the USA, hidden until
 * `setStatesShown`. Scrolling or pinching zooms, dragging with the left or middle
 * mouse button (or one finger) pans. Panning left or right never ends: the
 * world repeats.
 *
 * Named WorldMap in code because `Map` is a JavaScript built-in.
 */
export class WorldMap {
  readonly element: HTMLElement
  private readonly svg: SVGSVGElement
  /** One group per layer, each holding one group per world copy. */
  private readonly countriesLayer: SVGGElement
  private readonly capitalsLayer: SVGGElement
  private readonly markersLayer: SVGGElement
  private readonly projection
  private readonly worldHeight: number
  private readonly zoomBehavior: ZoomBehavior<HTMLElement, unknown>
  private transform: ZoomTransform | null = null
  private fitScale = 1

  private countries = new Map<string, Country>()
  /** The path, and marker if any, of each Country. */
  private countryElements = new Map<string, SVGElement[]>()
  private countryBounds = new Map<string, Bounds>()
  private markers: Marker[] = []
  private capitalDots: SVGCircleElement[] = []
  /** The zoom the Capital Dots were last sized for; panning alone doesn't resize them. */
  private capitalDotsK = 0
  private highlightedCountryId: string | null = null
  private selectedCountryId: string | null = null
  private pulsingCountryId: string | null = null
  private hoveredCountry: Country | null = null
  private readonly hoverListeners = new Set<CountryListener>()
  private readonly clickListeners = new Set<CountryClickListener>()
  private hint: { element: HTMLElement; worldPoint: [number, number]; timeout: number } | null = null
  /** Set while Countries fade back to land (fadeOutCountryStates). */
  private fadeTimeout: number | null = null
  private hideStatesTimeout: number | null = null

  constructor() {
    this.element = document.createElement('main')
    this.element.className = 'map'

    const scale = WORLD_WIDTH / (2 * Math.PI)
    const mercatorY = (latitude: number) => -scale * Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI) / 360))
    this.worldHeight = mercatorY(SOUTH_EDGE) - mercatorY(NORTH_EDGE)
    this.projection = geoMercator()
      .scale(scale)
      .translate([WORLD_WIDTH / 2, -mercatorY(NORTH_EDGE)])
      .clipExtent([
        [0, 0],
        [WORLD_WIDTH, this.worldHeight],
      ])

    const svg = select(this.element).append('svg').attr('class', 'map__svg')
    svg
      .append('rect')
      .attr('class', 'map__ocean')
      .attr('x', Math.min(...WORLD_COPIES) * WORLD_WIDTH)
      .attr('width', WORLD_COPIES.length * WORLD_WIDTH)
      .attr('height', this.worldHeight)
    this.svg = svg.node()!
    this.countriesLayer = svg.append('g').node()!
    // Capital Dots never take clicks: the Country under them does.
    this.capitalsLayer = svg.append('g').attr('class', 'map__capitals').node()!
    this.markersLayer = svg.append('g').node()!

    this.zoomBehavior = this.createZoomBehavior()
    select(this.element).call(this.zoomBehavior)
    new ResizeObserver(() => this.fitToScreen()).observe(this.element)

    this.listenForPointing()
    this.setStatus('Loading map…')
  }

  /** Draws the given Countries, replacing any drawn before. */
  render(shapes: CountryShape[]): void {
    // Rounded to keep the DOM small while staying (nearly) sub-pixel at maximum zoom.
    const path = geoPath(this.projection).digits(4)
    this.countries = new Map(shapes.map((shape) => [shape.id, toCountry(shape)]))
    this.countryBounds = new Map(shapes.map((shape) => [shape.id, path.bounds(shape)]))
    this.highlightedCountryId = null
    this.selectedCountryId = null
    this.pulsingCountryId = null
    const hasStates = new Set(shapes.map((shape) => shape.properties.stateOf))
    // US States are hidden unless shown instead of the USA (see setStatesShown).
    const stateClass = (shape: CountryShape) =>
      shape.properties.kind === 'state'
        ? ' map__country--us-state'
        : hasStates.has(shape.id)
          ? ' map__country--has-states'
          : ''

    // Copy 0 is drawn first, then cloned for the other copies.
    const countries = document.createElementNS(SVG_NS, 'g')
    select(countries)
      .selectAll('path')
      .data(shapes)
      .join('path')
      .attr('class', (d) => `map__country${stateClass(d)}`)
      .attr('data-country-id', (d) => d.id)
      .attr('d', (d) => path(d))

    // Capital Dots: circles, resized on zoom (updateMarkers) to keep their size on screen.
    // (Not zero-length round-capped lines with a non-scaling stroke: Safari doesn't keep those fixed.)
    const capitals = document.createElementNS(SVG_NS, 'g')
    for (const shape of shapes) {
      const point = countryInfo(shape)?.capitalPoint
      const [cx, cy] = (point && this.projection(point)) || []
      if (cx === undefined || cy === undefined) continue
      const dot = document.createElementNS(SVG_NS, 'circle')
      const stateDot = shape.properties.kind === 'state' ? ' map__capital-dot--us-state' : ''
      dot.setAttribute('class', `map__capital-dot${stateDot}`)
      dot.setAttribute('cx', cx.toFixed(4))
      dot.setAttribute('cy', cy.toFixed(4))
      capitals.append(dot)
    }

    // Smallest on top, so overlapping markers stay reachable.
    const tiny = shapes
      .filter((s) => s.properties.kind !== 'other' && s.properties.area < MARKER_MAX_AREA)
      .sort((a, b) => b.properties.area - a.properties.area)
    const markerSizes = new Map(tiny.map((shape) => [shape.id, Math.sqrt(path.area(shape))]))
    const markers = document.createElementNS(SVG_NS, 'g')
    select(markers)
      .selectAll('g')
      .data(tiny)
      .join((enter) => {
        const g = enter.append('g')
        g.append('circle').attr('class', 'map__marker-hit')
        g.append('circle').attr('class', 'map__marker-dot')
        return g
      })
      .attr('class', (d) => `map__marker${stateClass(d)}`)
      .attr('data-country-id', (d) => d.id)
      .each((d, i, nodes) => {
        const [cx, cy] = this.projection(d.properties.labelPoint) ?? [0, 0]
        for (const circle of (nodes[i] as SVGGElement).querySelectorAll('circle')) {
          circle.setAttribute('cx', String(cx))
          circle.setAttribute('cy', String(cy))
        }
      })

    for (const [layer, copy0] of [
      [this.countriesLayer, countries],
      [this.capitalsLayer, capitals],
      [this.markersLayer, markers],
    ] as const) {
      layer.replaceChildren(
        ...WORLD_COPIES.map((offset) => {
          const copy = offset === 0 ? copy0 : (copy0.cloneNode(true) as SVGGElement)
          if (offset) copy.setAttribute('transform', `translate(${offset * WORLD_WIDTH} 0)`)
          return copy
        }),
      )
    }

    this.countryElements = new Map()
    for (const element of this.svg.querySelectorAll<SVGElement>('[data-country-id]')) {
      const id = element.dataset.countryId!
      this.countryElements.set(id, [...(this.countryElements.get(id) ?? []), element])
    }
    this.markers = [...this.markersLayer.querySelectorAll<SVGGElement>('.map__marker')].map((element) => ({
      element,
      dot: element.querySelector('.map__marker-dot')!,
      hit: element.querySelector('.map__marker-hit')!,
      size: markerSizes.get(element.dataset.countryId!)!,
    }))
    this.capitalDots = [...this.capitalsLayer.querySelectorAll<SVGCircleElement>('circle')]
    this.capitalDotsK = 0
    this.updateMarkers()

    this.setStatus(null)
  }

  /** Called when the mouse moves onto a Country, or off it (with null). */
  onCountryHover(listener: CountryListener): () => void {
    this.hoverListeners.add(listener)
    return () => this.hoverListeners.delete(listener)
  }

  /**
   * Called when a Country, or the Ocean (with null), is clicked or tapped, with
   * the point clicked. Not called after a pan.
   */
  onCountryClick(listener: CountryClickListener): () => void {
    this.clickListeners.add(listener)
    return () => this.clickListeners.delete(listener)
  }

  /** Visually highlights one Country, or none. */
  setHighlightedCountry(countryId: string | null): void {
    if (this.highlightedCountryId) this.toggleClass(this.highlightedCountryId, 'map__country--highlighted', false)
    this.highlightedCountryId = countryId
    if (countryId) this.toggleClass(countryId, 'map__country--highlighted', true)
  }

  /** Marks one Country, or none, as Selected: Highlighted with an outline, drawn above its neighbours. */
  setSelectedCountry(countryId: string | null): void {
    if (this.selectedCountryId) this.toggleClass(this.selectedCountryId, 'map__country--selected', false)
    this.selectedCountryId = countryId
    if (!countryId) return
    this.toggleClass(countryId, 'map__country--selected', true)
    this.bringToFront(countryId)
  }

  /**
   * Shows the US States instead of the USA (during a Quiz with "Individual
   * states in USA"), or the USA as one Country again.
   */
  setStatesShown(shown: boolean): void {
    if (this.hideStatesTimeout !== null) window.clearTimeout(this.hideStatesTimeout)
    this.hideStatesTimeout = null
    if (!shown && this.fadeTimeout !== null) {
      // The States stay until they have faded to land, like the USA under them, so the swap doesn't show.
      this.hideStatesTimeout = window.setTimeout(() => this.setStatesShown(false), FADE_DURATION)
    } else {
      this.element.classList.toggle('map--us-states', shown)
    }
  }

  setCountryState(countryId: string, state: CountryState | null): void {
    for (const s of COUNTRY_STATES) this.toggleClass(countryId, `map__country--${s}`, s === state)
  }

  /** Removes all Country States, flashes and pulsing. */
  clearCountryStates(): void {
    for (const id of this.countryElements.keys()) {
      this.setCountryState(id, null)
      this.toggleClass(id, 'map__country--flash-wrong', false)
    }
    this.setPulsingCountry(null)
  }

  /**
   * Like clearCountryStates, but the Countries fade back to land instead of
   * switching at once (feedback 12), e.g. when a Quiz Run ends. Country States
   * set during the fade (by the next Mode) fade in too.
   */
  fadeOutCountryStates(): void {
    if (this.fadeTimeout !== null) window.clearTimeout(this.fadeTimeout)
    this.element.classList.add('map--fading')
    this.clearCountryStates()
    this.fadeTimeout = window.setTimeout(() => {
      this.element.classList.remove('map--fading')
      this.fadeTimeout = null
    }, FADE_DURATION)
  }

  /** Briefly flashes a Country to show it was a wrong Answer. */
  flashWrong(countryId: string): void {
    const className = 'map__country--flash-wrong'
    for (const element of this.countryElements.get(countryId) ?? []) {
      // Restart the animation if it is already running.
      element.classList.remove(className)
      void element.getBoundingClientRect()
      element.classList.add(className)
      element.addEventListener('animationend', () => element.classList.remove(className), { once: true })
    }
  }

  /** Makes one Country, or none, pulse until further notice. */
  setPulsingCountry(countryId: string | null): void {
    if (this.pulsingCountryId) this.toggleClass(this.pulsingCountryId, 'map__country--pulsing', false)
    this.pulsingCountryId = countryId
    if (!countryId) return
    this.toggleClass(countryId, 'map__country--pulsing', true)
    this.bringToFront(countryId)
  }

  /**
   * Flies to a Country (used by Focus): centres it and zooms so it is at least
   * FOCUS_MIN_SIZE on screen, or zooms out until all of it fits. Keeps the
   * current zoom when that already satisfies both.
   */
  showCountry(countryId: string): void {
    const bounds = this.countryBounds.get(countryId)
    if (!bounds || !this.transform) return
    const { clientWidth: width, clientHeight: height } = this.element
    // Fly to the copy of the Country nearest to the current view.
    const viewCentre = this.transform.invertX(width / 2)
    const shift = Math.round((viewCentre - (bounds[0][0] + bounds[1][0]) / 2) / WORLD_WIDTH) * WORLD_WIDTH
    const [[left, top], [right, bottom]] = [
      [bounds[0][0] + shift, bounds[0][1]],
      [bounds[1][0] + shift, bounds[1][1]],
    ]
    const countrySize = Math.max(right - left, bottom - top)

    const fitK = Math.min((width - 2 * FOCUS_MARGIN) / (right - left), (height - 2 * FOCUS_MARGIN) / (bottom - top))
    const minSizeK = FOCUS_MIN_SIZE / countrySize
    const [minK, maxK] = this.zoomBehavior.scaleExtent()
    const newK = Math.min(maxK, Math.max(minK, Math.min(fitK, Math.max(this.transform.k, minSizeK))))
    const centred = zoomIdentity
      .translate(width / 2, height / 2)
      .scale(newK)
      .translate(-(left + right) / 2, -(top + bottom) / 2)
    // Keep the world's edges in view, as when panning by hand.
    const target = this.zoomBehavior.constrain()(
      centred,
      [
        [0, 0],
        [width, height],
      ],
      this.zoomBehavior.translateExtent(),
    )
    select(this.element).transition().duration(750).call(this.zoomBehavior.transform, target)
  }

  /**
   * Shows a short instruction at the top of the Map, optionally with a button,
   * or hides it when `notice` is null.
   */
  setNotice(notice: MapNotice | null): void {
    this.element.querySelector('.map__notice')?.remove()
    if (!notice) return

    const element = document.createElement('div')
    element.className = 'map__notice'
    element.setAttribute('role', 'status')
    const text = document.createElement('span')
    text.textContent = notice.text
    element.append(text)
    if (notice.action) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'map__notice-button'
      button.textContent = notice.action.label
      button.addEventListener('click', notice.action.onClick)
      element.append(button)
    }
    // Keep presses on the notice from starting a pan or zoom of the Map behind it.
    for (const type of ['mousedown', 'touchstart', 'pointerdown', 'wheel', 'dblclick']) {
      element.addEventListener(type, (event) => event.stopPropagation())
    }
    this.element.append(element)
  }

  /**
   * Shows a Hint: a small popup pointing at a point on the Map (where the
   * player clicked). It moves along when the Map is panned or zoomed and
   * disappears after a few seconds, or when the next Hint is shown.
   */
  showHint(content: Node, point: MapPoint): void {
    this.hideHint()
    if (!this.transform) return
    const element = document.createElement('div')
    element.className = 'map__hint'
    element.setAttribute('role', 'status')
    element.append(content)
    this.element.append(element)
    this.hint = {
      element,
      worldPoint: this.transform.invert(point),
      timeout: window.setTimeout(() => this.hideHint(), HINT_DURATION),
    }
    this.positionHint()
  }

  hideHint(): void {
    if (!this.hint) return
    window.clearTimeout(this.hint.timeout)
    this.hint.element.remove()
    this.hint = null
  }

  /** Shows a message over the Map, or hides it when `message` is null. */
  setStatus(message: string | null): void {
    let status = this.element.querySelector<HTMLElement>('.map__status')
    if (message === null) {
      status?.remove()
      return
    }
    if (!status) {
      status = document.createElement('div')
      status.className = 'map__status'
      this.element.append(status)
    }
    status.textContent = message
  }

  private toggleClass(countryId: string, className: string, force: boolean): void {
    for (const element of this.countryElements.get(countryId) ?? []) element.classList.toggle(className, force)
  }

  /** Draws a Country's paths above their neighbours, so they don't cover its outline. */
  private bringToFront(countryId: string): void {
    for (const element of this.countryElements.get(countryId) ?? []) {
      if (element instanceof SVGPathElement) element.parentNode?.append(element)
    }
  }

  /** Places the Hint above its point (below it near the top), kept inside the Map. */
  private positionHint(): void {
    if (!this.hint || !this.transform) return
    const { element, worldPoint } = this.hint
    const [x, y] = this.transform.apply(worldPoint)
    const margin = 8
    const below = y - element.offsetHeight - 16 < margin
    const left = Math.min(
      Math.max(x - element.offsetWidth / 2, margin),
      this.element.clientWidth - element.offsetWidth - margin,
    )
    element.classList.toggle('map__hint--below', below)
    element.style.left = `${left}px`
    element.style.top = `${below ? y + 16 : y - element.offsetHeight - 16}px`
    // The arrow keeps pointing at the point when the box is pushed sideways.
    element.style.setProperty('--arrow-x', `${x - left}px`)
  }

  private countryAt(target: EventTarget | null): Country | null {
    const id = target instanceof Element ? target.closest<SVGElement>('[data-country-id]')?.dataset.countryId : undefined
    return (id && this.countries.get(id)) || null
  }

  private listenForPointing(): void {
    const setHovered = (country: Country | null) => {
      if (country === this.hoveredCountry) return
      this.hoveredCountry = country
      this.hoverListeners.forEach((listener) => listener(country))
    }
    // Touch has no hover; taps arrive as clicks.
    this.svg.addEventListener('pointerover', (event) => {
      if (event.pointerType !== 'touch') setHovered(this.countryAt(event.target))
    })
    this.svg.addEventListener('pointerleave', () => setHovered(null))
    this.svg.addEventListener('click', (event) => {
      const country = this.countryAt(event.target)
      const bounds = this.element.getBoundingClientRect()
      const point: MapPoint = [event.clientX - bounds.left, event.clientY - bounds.top]
      this.clickListeners.forEach((listener) => listener(country, point))
    })
  }

  private createZoomBehavior(): ZoomBehavior<HTMLElement, unknown> {
    // Stop the middle mouse button from starting the browser's autoscroll, so it can pan.
    this.element.addEventListener('mousedown', (event) => {
      if (event.button === 1) event.preventDefault()
    })

    return (
      zoom<HTMLElement, unknown>()
        // Unlimited sideways: the world repeats (see updateViewBox).
        .translateExtent([
          [-Infinity, 0],
          [Infinity, this.worldHeight],
        ])
        // d3's default, plus the middle mouse button.
        .filter((event) => (!event.ctrlKey || event.type === 'wheel') && (!event.button || event.button === 1))
        // Twice d3's default wheel speed, so the full zoom range takes ~30 scroll steps.
        .wheelDelta((event) => -event.deltaY * (event.deltaMode === 1 ? 0.1 : event.deltaMode ? 2 : 0.004))
        .on('zoom', (event: D3ZoomEvent<HTMLElement, unknown>) => {
          this.transform = event.transform
          this.updateViewBox()
          this.updateMarkers()
          this.positionHint()
        })
    )
  }

  // Zooming and panning change the SVG's viewBox rather than transforming a
  // group of paths. Browsers may cache a transformed group as a bitmap and
  // scale it, which looks blurry until the next repaint; a new viewBox always
  // makes them redraw the vector shapes at full resolution.
  //
  // d3-zoom's transform is not limited sideways, so panning never ends and a
  // drag never jumps. The viewBox is shifted by whole world widths so its
  // centre lies on world copy 0; the copies beside it fill the rest.
  private updateViewBox(): void {
    if (!this.transform) return
    const { x, y, k } = this.transform
    const { clientWidth, clientHeight } = this.element
    const left = -x / k
    const shift = Math.floor((left + clientWidth / k / 2) / WORLD_WIDTH) * WORLD_WIDTH
    this.svg.setAttribute('viewBox', `${left - shift} ${-y / k} ${clientWidth / k} ${clientHeight / k}`)
  }

  /**
   * Keeps markers and Capital Dots the same size on screen, and hides markers
   * whose Country is big enough to click.
   */
  private updateMarkers(): void {
    const k = this.transform?.k ?? 1
    if (k !== this.capitalDotsK) {
      this.capitalDotsK = k
      const r = String(CAPITAL_RADIUS / k)
      for (const dot of this.capitalDots) dot.setAttribute('r', r)
    }
    for (const marker of this.markers) {
      const visible = marker.size * k < MARKER_HIDE_SIZE
      marker.element.style.display = visible ? '' : 'none'
      if (!visible) continue
      marker.dot.setAttribute('r', String(MARKER_RADIUS / k))
      marker.hit.setAttribute('r', String(MARKER_HIT_RADIUS / k))
    }
  }

  /** Keeps the zoom limits in line with the screen size. The minimum zoom shows the whole world. */
  private fitToScreen(): void {
    const { clientWidth, clientHeight } = this.element
    if (!clientWidth || !clientHeight) return

    const wasFitted = !this.transform || this.transform.k <= this.fitScale * 1.0001
    // The whole world fits, but the view is never wider than two worlds (see WORLD_COPIES).
    this.fitScale = Math.max(
      Math.min(clientWidth / WORLD_WIDTH, clientHeight / this.worldHeight),
      clientWidth / (2 * WORLD_WIDTH),
    )
    this.zoomBehavior.scaleExtent([this.fitScale, this.fitScale * MAX_ZOOM])

    const selection = select(this.element)
    if (!this.transform) {
      // Start centred on the world.
      this.zoomBehavior.transform(
        selection,
        zoomIdentity.translate((clientWidth - WORLD_WIDTH * this.fitScale) / 2, 0).scale(this.fitScale),
      )
    }
    // scaleTo/scaleBy also re-apply the limits, centring the world when it is smaller than the screen.
    if (wasFitted) this.zoomBehavior.scaleTo(selection, this.fitScale)
    else this.zoomBehavior.scaleBy(selection, 1)
    this.updateViewBox()
  }
}
