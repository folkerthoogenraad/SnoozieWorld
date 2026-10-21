// A finger moving further than this (px) between down and up is a pan, not a tap.
const TAP_SLOP = 10
// A second tap within this time (ms) and distance (px) of the first makes a double tap, so a tap only counts
// after this time.
const DOUBLE_TAP_DELAY = 250
const DOUBLE_TAP_DISTANCE = 40

export interface TouchTapHandlers {
  /** A finger went down on `target`: show what it would tap. */
  press(target: EventTarget | null): void
  /** The finger went on to pan or pinch, or its tap was handled: stop showing it. */
  release(): void
  /**
   * A tap that did not become a double tap, DOUBLE_TAP_DELAY after the finger went up; or right away when
   * `countsAtOnce` says so.
   */
  tap(target: EventTarget | null, clientX: number, clientY: number): void
  /**
   * True when a tap here needs no wait (on the Prompt): it counts as the finger goes up, and can still start a
   * double tap.
   */
  countsAtOnce(target: EventTarget | null, clientX: number, clientY: number): boolean
  /** Two quick taps at the same spot. */
  doubleTap(clientX: number, clientY: number): void
  /**
   * The second tap is held and dragged; (clientX, clientY) is where it went down, `dy` the px it moved down since
   * the last call (negative: up).
   */
  zoomDrag(clientX: number, clientY: number, dy: number): void
}

type Gesture =
  | { kind: 'idle' }
  /** The first finger is down. */
  | { kind: 'pressed'; target: EventTarget | null; x: number; y: number }
  /**
   * The first finger went up without moving; the tap counts unless a second one follows, or `counted` already
   * (countsAtOnce).
   */
  | { kind: 'tapped'; target: EventTarget | null; x: number; y: number; timeout: number; counted: boolean }
  /** The second finger of a double tap is down, or dragging (zooming). */
  | { kind: 'second'; x: number; y: number; lastY: number; dragging: boolean }

/**
 * Recognises taps, double taps and the double-tap-and-drag zoom on a touch
 * screen (feedback 13), from the touch pointer events on `element`. Mouse and
 * pen are left alone. A tap waits DOUBLE_TAP_DELAY before it counts, so a
 * double tap only zooms; `press` shows right away what the finger is on. A
 * tap that `countsAtOnce` doesn't wait, but can still start a double tap.
 *
 * While `claimed` is true, the second finger of a double tap belongs to this
 * class, and d3-zoom must not pan with it (see WorldMap's zoom filter).
 * Pointer events arrive before the touch events d3-zoom listens to.
 */
export class TouchTaps {
  private gesture: Gesture = { kind: 'idle' }
  private readonly fingers = new Set<number>()
  private readonly handlers: TouchTapHandlers

  constructor(element: Element, handlers: TouchTapHandlers) {
    this.handlers = handlers
    element.addEventListener('pointerdown', (event) => this.down(event as PointerEvent))
    element.addEventListener('pointermove', (event) => this.move(event as PointerEvent))
    element.addEventListener('pointerup', (event) => this.up(event as PointerEvent))
    element.addEventListener('pointercancel', (event) => this.cancel(event as PointerEvent))
  }

  get claimed(): boolean {
    return this.gesture.kind === 'second'
  }

  private down(event: PointerEvent): void {
    if (event.pointerType !== 'touch') return
    this.fingers.add(event.pointerId)
    if (this.fingers.size > 1) {
      // A pinch: d3-zoom's.
      this.reset()
      return
    }
    const gesture = this.gesture
    if (gesture.kind === 'tapped') {
      window.clearTimeout(gesture.timeout)
      if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) < DOUBLE_TAP_DISTANCE) {
        this.handlers.release()
        this.gesture = { kind: 'second', x: event.clientX, y: event.clientY, lastY: event.clientY, dragging: false }
        return
      }
      // Too far away for a double tap: the first tap counts now.
      if (!gesture.counted) this.handlers.tap(gesture.target, gesture.x, gesture.y)
    }
    this.handlers.press(event.target)
    this.gesture = { kind: 'pressed', target: event.target, x: event.clientX, y: event.clientY }
  }

  private move(event: PointerEvent): void {
    if (event.pointerType !== 'touch' || !this.fingers.has(event.pointerId)) return
    const gesture = this.gesture
    if (gesture.kind !== 'pressed' && gesture.kind !== 'second') return
    const moved = Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y)
    if (gesture.kind === 'pressed' && moved > TAP_SLOP) {
      // A pan: d3-zoom's.
      this.reset()
    } else if (gesture.kind === 'second' && (gesture.dragging || moved > TAP_SLOP)) {
      gesture.dragging = true
      this.handlers.zoomDrag(gesture.x, gesture.y, event.clientY - gesture.lastY)
      gesture.lastY = event.clientY
    }
  }

  private up(event: PointerEvent): void {
    if (!this.fingers.delete(event.pointerId)) return
    const gesture = this.gesture
    if (gesture.kind === 'pressed') {
      const { target, x, y } = gesture
      const counted = this.handlers.countsAtOnce(target, x, y)
      if (counted) {
        this.handlers.tap(target, x, y)
        this.handlers.release()
      }
      const timeout = window.setTimeout(() => {
        this.gesture = { kind: 'idle' }
        if (counted) return
        this.handlers.tap(target, x, y)
        this.handlers.release()
      }, DOUBLE_TAP_DELAY)
      this.gesture = { kind: 'tapped', target, x, y, timeout, counted }
    } else if (gesture.kind === 'second') {
      if (!gesture.dragging) this.handlers.doubleTap(gesture.x, gesture.y)
      this.gesture = { kind: 'idle' }
    }
  }

  private cancel(event: PointerEvent): void {
    if (this.fingers.delete(event.pointerId)) this.reset()
  }

  /** Drops the current gesture, including a tap still waiting to count. */
  private reset(): void {
    if (this.gesture.kind === 'tapped') window.clearTimeout(this.gesture.timeout)
    if (this.gesture.kind !== 'idle') this.handlers.release()
    this.gesture = { kind: 'idle' }
  }
}
