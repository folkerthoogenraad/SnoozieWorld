/**
 * What the app is doing with the Map and Navbar: Explore Mode, or a Quiz Run.
 * Exactly one mode is active at a time.
 */
export interface Mode {
  start(): void
  stop(): void
}
