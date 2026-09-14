// Web Audio Synthesizer for ethereal sound design

class SoundEngine {
  private ctx: AudioContext | null = null
  private isMuted: boolean = true
  private ambientOsc1: OscillatorNode | null = null
  private ambientOsc2: OscillatorNode | null = null
  private ambientGain: GainNode | null = null

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      this.ctx = new AudioCtx()
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted
    if (!this.isMuted) {
      this.initContext()
      this.playClick()
      this.startAmbient()
    } else {
      this.stopAmbient()
    }
    return this.isMuted
  }

  public getMuted(): boolean {
    return this.isMuted
  }

  public playClick() {
    if (this.isMuted) return
    try {
      this.initContext()
      if (!this.ctx) return

      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, this.ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(
        440,
        this.ctx.currentTime + 0.05
      )

      gain.gain.setValueAtTime(0.04, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        this.ctx.currentTime + 0.05
      )

      osc.connect(gain)
      gain.connect(this.ctx.destination)

      osc.start()
      osc.stop(this.ctx.currentTime + 0.06)
    } catch {
      // Audio context policy fallback
    }
  }

  public playBuySound() {
    if (this.isMuted) return
    try {
      this.initContext()
      if (!this.ctx) return

      const t = this.ctx.currentTime
      const freqs = [523.25, 659.25, 783.99, 987.77]
      freqs.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator()
        const gain = this.ctx!.createGain()

        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, t + idx * 0.04)

        gain.gain.setValueAtTime(0, t + idx * 0.04)
        gain.gain.linearRampToValueAtTime(0.06, t + idx * 0.04 + 0.02)
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          t + idx * 0.04 + 0.35
        )

        osc.connect(gain)
        gain.connect(this.ctx!.destination)

        osc.start(t + idx * 0.04)
        osc.stop(t + idx * 0.04 + 0.38)
      })
    } catch {
      // fallback
    }
  }

  public playSellSound() {
    if (this.isMuted) return
    try {
      this.initContext()
      if (!this.ctx) return

      const t = this.ctx.currentTime
      const freqs = [659.25, 587.33, 493.88]
      freqs.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator()
        const gain = this.ctx!.createGain()

        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, t + idx * 0.05)

        gain.gain.setValueAtTime(0, t + idx * 0.05)
        gain.gain.linearRampToValueAtTime(0.04, t + idx * 0.05 + 0.02)
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          t + idx * 0.05 + 0.3
        )

        osc.connect(gain)
        gain.connect(this.ctx!.destination)

        osc.start(t + idx * 0.05)
        osc.stop(t + idx * 0.05 + 0.32)
      })
    } catch {
      // fallback
    }
  }

  public playGraduationFanfare() {
    if (this.isMuted) return
    try {
      this.initContext()
      if (!this.ctx) return

      const t = this.ctx.currentTime
      const chords = [
        { f: 440, delay: 0 },
        { f: 554.37, delay: 0.1 },
        { f: 659.25, delay: 0.2 },
        { f: 880, delay: 0.3 },
        { f: 1108.73, delay: 0.45 },
      ]

      chords.forEach(({ f, delay }) => {
        const osc = this.ctx!.createOscillator()
        const gain = this.ctx!.createGain()

        osc.type = 'sine'
        osc.frequency.setValueAtTime(f, t + delay)

        gain.gain.setValueAtTime(0, t + delay)
        gain.gain.linearRampToValueAtTime(0.08, t + delay + 0.05)
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          t + delay + 1.2
        )

        osc.connect(gain)
        gain.connect(this.ctx!.destination)

        osc.start(t + delay)
        osc.stop(t + delay + 1.25)
      })
    } catch {
      // fallback
    }
  }

  private startAmbient() {
    if (this.isMuted || this.ambientOsc1) return
    try {
      this.initContext()
      if (!this.ctx) return

      this.ambientGain = this.ctx.createGain()
      this.ambientGain.gain.setValueAtTime(0.0001, this.ctx.currentTime)
      this.ambientGain.gain.linearRampToValueAtTime(
        0.015,
        this.ctx.currentTime + 2.0
      )

      this.ambientOsc1 = this.ctx.createOscillator()
      this.ambientOsc1.type = 'sine'
      this.ambientOsc1.frequency.setValueAtTime(110, this.ctx.currentTime)

      this.ambientOsc2 = this.ctx.createOscillator()
      this.ambientOsc2.type = 'sine'
      this.ambientOsc2.frequency.setValueAtTime(
        164.81,
        this.ctx.currentTime
      )

      this.ambientOsc1.connect(this.ambientGain)
      this.ambientOsc2.connect(this.ambientGain)
      this.ambientGain.connect(this.ctx.destination)

      this.ambientOsc1.start()
      this.ambientOsc2.start()
    } catch {
      // fallback
    }
  }

  private stopAmbient() {
    try {
      if (this.ambientGain && this.ctx) {
        this.ambientGain.gain.linearRampToValueAtTime(
          0.0001,
          this.ctx.currentTime + 0.5
        )
        setTimeout(() => {
          this.ambientOsc1?.stop()
          this.ambientOsc2?.stop()
          this.ambientOsc1?.disconnect()
          this.ambientOsc2?.disconnect()
          this.ambientOsc1 = null
          this.ambientOsc2 = null
          this.ambientGain = null
        }, 600)
      }
    } catch {
      // fallback
    }
  }
}

export const sound = new SoundEngine()
