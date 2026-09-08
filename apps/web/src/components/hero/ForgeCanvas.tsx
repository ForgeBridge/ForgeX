'use client'

import { useEffect, useRef } from 'react'
import { useThemeStore } from '../../hooks/useTheme'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  ember: boolean
  life: number
  maxLife: number
  phase: number
}

interface Palette {
  ember: string
  mote: string
  curve: string
  curveGlow: string
  head: string
}

const DARK: Palette = {
  ember: '251, 146, 60',
  mote: '96, 165, 250',
  curve: 'rgba(37, 99, 235, 0.45)',
  curveGlow: 'rgba(37, 99, 235, 0.12)',
  head: '234, 88, 12',
}

const LIGHT: Palette = {
  ember: '234, 88, 12',
  mote: '37, 99, 235',
  curve: 'rgba(37, 99, 235, 0.5)',
  curveGlow: 'rgba(37, 99, 235, 0.08)',
  head: '234, 88, 12',
}

/**
 * Full-bleed immersive hero canvas: embers rise from the forge while a
 * glowing exponential bonding curve arcs across the viewport.
 *
 * - Renders one static frame when `prefers-reduced-motion` is set.
 * - Pauses when scrolled out of view; caps DPR at 2 for perf.
 */
export function ForgeCanvas({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { theme } = useThemeStore()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const palette = theme === 'light' ? LIGHT : DARK
    const alphaScale = theme === 'light' ? 0.55 : 1
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    let w = 0
    let h = 0
    let raf = 0
    let running = true
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      w = Math.max(1, Math.floor(rect.width))
      h = Math.max(1, Math.floor(rect.height))
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    const spawn = (initial: boolean): Particle => ({
      x: Math.random() * w,
      y: initial ? Math.random() * h : h + 10,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -(0.3 + Math.random() * 1.0),
      r: 0.8 + Math.random() * 2.4,
      ember: Math.random() < 0.7,
      life: 0,
      maxLife: 220 + Math.random() * 260,
      phase: Math.random() * Math.PI * 2,
    })

    const COUNT = 90
    const particles: Particle[] = Array.from({ length: COUNT }, () =>
      spawn(true)
    )

    const curveY = (p: number, t: number) =>
      h * 0.84 -
      h * 0.64 * ((Math.exp(2.2 * p) - 1) / (Math.exp(2.2) - 1)) +
      Math.sin(p * 6 + t * 0.6) * 4

    const drawCurve = (t: number) => {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.beginPath()
      const steps = 120
      for (let i = 0; i <= steps; i++) {
        const p = i / steps
        const x = p * w
        const y = curveY(p, t)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.strokeStyle = palette.curveGlow
      ctx.lineWidth = 12
      ctx.stroke()
      ctx.strokeStyle = palette.curve
      ctx.lineWidth = 2
      ctx.stroke()

      // Glowing head at the live edge of the curve.
      const pulse = reduced ? 0.8 : 0.6 + 0.25 * Math.sin(t * 2.4)
      const hx = w - 8
      const hy = curveY(1, t)
      const grad = ctx.createRadialGradient(hx, hy, 0, hx, hy, 26)
      grad.addColorStop(0, `rgba(${palette.head}, ${0.55 * pulse})`)
      grad.addColorStop(1, `rgba(${palette.head}, 0)`)
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(hx, hy, 26, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = `rgba(${palette.head}, ${0.95 * pulse})`
      ctx.beginPath()
      ctx.arc(hx, hy, 3.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    const drawParticles = () => {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      for (const p of particles) {
        const fade =
          Math.sin((p.life / p.maxLife) * Math.PI) *
          (0.55 + 0.45 * Math.sin(p.phase + p.life * 0.05))
        const a = Math.max(0, fade) * 0.7 * alphaScale
        if (a <= 0.01) continue
        const rgb = p.ember ? palette.ember : palette.mote
        ctx.fillStyle = `rgba(${rgb}, ${a.toFixed(3)})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }

    const step = (t: number) => {
      for (const p of particles) {
        p.life += 1
        p.x += p.vx + Math.sin(p.life * 0.02 + p.phase) * 0.15
        p.y += p.vy
        if (p.y < -12 || p.life > p.maxLife) Object.assign(p, spawn(false))
      }
      drawCurve(t)
    }

    if (reduced) {
      ctx.clearRect(0, 0, w, h)
      drawCurve(0)
      drawParticles()
      return
    }

    const frame = (now: number) => {
      if (!running) return
      ctx.clearRect(0, 0, w, h)
      step(now / 1000)
      drawParticles()
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !running) {
          running = true
          raf = requestAnimationFrame(frame)
        } else if (!entry.isIntersecting && running) {
          running = false
          cancelAnimationFrame(raf)
        }
      },
      { threshold: 0 }
    )
    observer.observe(canvas)

    window.addEventListener('resize', resize)
    return () => {
      running = false
      cancelAnimationFrame(raf)
      observer.disconnect()
      window.removeEventListener('resize', resize)
    }
  }, [theme])

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />
}
