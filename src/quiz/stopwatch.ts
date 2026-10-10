/** Measures the Session Time: the time actually spent playing, excluding pauses. */
export class Stopwatch {
  private accumulated: number
  private startedAt: number | null = null

  constructor(elapsedMs = 0) {
    this.accumulated = elapsedMs
  }

  get running(): boolean {
    return this.startedAt !== null
  }

  get elapsedMs(): number {
    return this.accumulated + (this.startedAt === null ? 0 : performance.now() - this.startedAt)
  }

  start(): void {
    this.startedAt ??= performance.now()
  }

  pause(): void {
    if (this.startedAt === null) return
    this.accumulated += performance.now() - this.startedAt
    this.startedAt = null
  }
}

/** "4:07", or "1:02:09" from an hour on. */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`
}
