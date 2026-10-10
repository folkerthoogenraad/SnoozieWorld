/** The Sound Effects played during a Quiz Run. */
export type SoundEffect = 'correct' | 'half-correct' | 'wrong' | 'next'

const STORAGE_KEY = 'snoozieworld.soundMuted'
const MASTER_VOLUME = 0.6

interface Tone {
  frequency: number
  type: OscillatorType
  /** Seconds after the effect starts. */
  start: number
  duration: number
  volume: number
}

// Synthesised with the Web Audio API, so there are no sound files (and no licences) involved.
const EFFECTS: Record<SoundEffect, { tones: Tone[]; lowpass?: number }> = {
  // A bright "pling": E6 with a soft octave overtone, ringing out.
  correct: {
    tones: [
      { frequency: 1318.5, type: 'sine', start: 0, duration: 0.6, volume: 0.3 },
      { frequency: 2637, type: 'sine', start: 0, duration: 0.35, volume: 0.07 },
    ],
  },
  // A lower, shorter, quieter pling: less happy, still positive.
  'half-correct': {
    tones: [{ frequency: 659.3, type: 'triangle', start: 0, duration: 0.35, volume: 0.22 }],
  },
  // A soft buzzer: two slightly detuned low sawtooths, with the harsh highs filtered out.
  wrong: {
    tones: [
      { frequency: 110, type: 'sawtooth', start: 0, duration: 0.24, volume: 0.16 },
      { frequency: 116.5, type: 'sawtooth', start: 0, duration: 0.24, volume: 0.16 },
    ],
    lowpass: 700,
  },
  // A short, soft, neutral blip: confirms a Missed Prompt and moves on.
  next: {
    tones: [{ frequency: 587.3, type: 'sine', start: 0, duration: 0.14, volume: 0.18 }],
  },
}

/** Plays Sound Effects, unless muted. Whether it is muted is remembered in the browser. */
export class SoundPlayer {
  private context: AudioContext | null = null
  private mutedState = loadMuted()
  private readonly listeners = new Set<(muted: boolean) => void>()

  get muted(): boolean {
    return this.mutedState
  }

  set muted(muted: boolean) {
    this.mutedState = muted
    try {
      localStorage.setItem(STORAGE_KEY, String(muted))
    } catch {
      // Not remembering it is fine.
    }
    this.listeners.forEach((listener) => listener(muted))
  }

  onMutedChange(listener: (muted: boolean) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  play(effect: SoundEffect): void {
    if (this.mutedState) return
    const context = this.audioContext()
    if (!context) return

    const now = context.currentTime
    const { tones, lowpass } = EFFECTS[effect]
    let output: AudioNode = context.destination
    if (lowpass) {
      const filter = new BiquadFilterNode(context, { type: 'lowpass', frequency: lowpass })
      filter.connect(output)
      output = filter
    }
    for (const tone of tones) {
      const start = now + tone.start
      const end = start + tone.duration
      const gain = new GainNode(context, { gain: 0 })
      // Quick attack, then an exponential fade, so there are no clicks.
      gain.gain.linearRampToValueAtTime(tone.volume * MASTER_VOLUME, start + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.0001, end)
      const oscillator = new OscillatorNode(context, { type: tone.type, frequency: tone.frequency })
      oscillator.connect(gain).connect(output)
      oscillator.start(start)
      oscillator.stop(end + 0.02)
    }
  }

  // Created on first use: browsers only allow audio after the player has clicked something.
  private audioContext(): AudioContext | null {
    if (!this.context) {
      try {
        this.context = new AudioContext()
      } catch {
        return null
      }
    }
    if (this.context.state === 'suspended') void this.context.resume()
    return this.context
  }
}

function loadMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}
