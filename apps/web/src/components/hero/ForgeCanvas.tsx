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
  curve: 'rgba(37, 99, 235, 0.55)',
  curveGlow: 'rgba(37, 99, 235, 0.16)',
  head: '234, 88, 12',
}

const LIGHT: Palette = {
  ember: '234, 88, 12',
  mote: '37, 99, 235',
  curve: 'rgba(37, 99, 235, 0.45)',
  curveGlow: 'rgba(37, 99, 235, 0.08)',
  head: '234, 88, 12',
}

/**
 * Full-bleed immersive hero canvas with:
 * - Cursor-reactive particles (gravitation field)
 * - Ambient aura waves that respond to mouse
 * - Exponential bonding curve with animated leading head
 * - Pulse shockwave on trade/creation events
 * - Shaded area under the bonding curve
 */
export function ForgeCanvas({
  className = '',
  pulseTrigger = 0,
}: {
  className?: string
  pulseTrigger?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { theme } = useThemeStore()
  const mouseRef = useRef({
    x: 0.5,
    y: 0.5,
    targetX: 0.5,
    targetY: 0.5,
    isHovering: false,
  })
  const pulseRef = useRef(0)

  useEffect(() => {
    if (pulseTrigger > 0) {
      pulseRef.current = 1.0
    }
  }, [pulseTrigger])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const palette = theme === 'light' ? LIGHT : DARK
    const alphaScale = theme === 'light' ? 0.65 : 1.0
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

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current.targetX = (e.clientX - rect.left) / (rect.width || 1)
      mouseRef.current.targetY = (e.clientY - rect.top) / (rect.height || 1)
      mouseRef.current.isHovering = true
    }

    const onMouseLeave = () => {
      mouseRef.current.isHovering = false
      mouseRef.current.targetX = 0.5
      mouseRef.current.targetY = 0.5
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseleave', onMouseLeave)

    const createParticle = (atBottom = false): Particle => {
      const isEmber = Math.random() < 0.65
      return {
        x: Math.random() * w,
        y: atBottom ? h + 10 : Math.random() * h,
        vx: (Math.random() - 0.5) * (isEmber ? 0.4 : 0.25),
        vy: isEmber
          ? -(Math.random() * 0.7 + 0.35)
          : -(Math.random() * 0.25 + 0.08),
        r: isEmber
          ? Math.random() * 2.2 + 0.8
          : Math.random() * 1.5 + 0.5,
        ember: isEmber,
        life: atBottom ? 0 : Math.random() * 280,
        maxLife: Math.random() * 260 + 180,
        phase: Math.random() * Math.PI * 2,
      }
    }

    const COUNT = 90
    const particles: Particle[] = Array.from({ length: COUNT }, () =>
      createParticle(false)
    )

    let time = 0

    const tick = () => {
      if (!running) return
      time += 0.016

      // Smooth mouse interpolation
      mouseRef.current.x +=
        (mouseRef.current.targetX - mouseRef.current.x) * 0.05
      mouseRef.current.y +=
        (mouseRef.current.targetY - mouseRef.current.y) * 0.05

      // Decay pulse shockwave
      if (pulseRef.current > 0.005) {
        pulseRef.current *= 0.94
      } else {
        pulseRef.current = 0
      }

      ctx.clearRect(0, 0, w, h)

      // 1. Ambient aura waves — layered sine waves that react to cursor
      const waveCount = 3
      for (let wave = 0; wave < waveCount; wave++) {
        ctx.beginPath()
        const baseH = h * (0.68 + wave * 0.1)
        const freq = 0.0018 + wave * 0.0006
        const amp = (24 + wave * 16) * (1 + pulseRef.current * 0.8)
        const speed = time * (0.8 + wave * 0.4)

        ctx.moveTo(0, h)
        for (let x = 0; x <= w; x += 16) {
          const mouseDist = Math.hypot(
            x - mouseRef.current.x * w,
            baseH - mouseRef.current.y * h
          )
          const mousePull =
            Math.max(0, 1 - mouseDist / (w * 0.35)) * 18
          const y =
            baseH + Math.sin(x * freq + speed) * amp - mousePull
          ctx.lineTo(x, y)
        }
        ctx.lineTo(w, h)
        ctx.closePath()

        const grad = ctx.createLinearGradient(0, baseH - 40, 0, h)
        if (wave === 0) {
          grad.addColorStop(
            0,
            `rgba(${palette.ember}, ${0.06 * alphaScale})`
          )
          grad.addColorStop(1, 'transparent')
        } else {
          grad.addColorStop(
            0,
            `rgba(${palette.mote}, ${0.04 * alphaScale})`
          )
          grad.addColorStop(1, 'transparent')
        }
        ctx.fillStyle = grad
        ctx.fill()
      }

      // 2. Exponential bonding curve — shaded area + glowing stroke + animated head
      const k = 2.4
      const curveStartY = h * 0.86
      const curveEndY = h * 0.22

      const curvePath = () => {
        ctx.beginPath()
        for (let x = 0; x <= w; x += 8) {
          const t = x / w
          const expVal = (Math.exp(k * t) - 1) / (Math.exp(k) - 1)
          const wobble =
            Math.sin(t * 8 + time * 2) * (2 + pulseRef.current * 8)
          const y =
            curveStartY - expVal * (curveStartY - curveEndY) + wobble
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
      }

      // Shaded area under the curve
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      curvePath()
      ctx.lineTo(w, h)
      ctx.lineTo(0, h)
      ctx.closePath()
      const areaGrad = ctx.createLinearGradient(0, curveEndY, 0, h)
      areaGrad.addColorStop(
        0,
        `rgba(${palette.ember}, ${0.08 * alphaScale})`
      )
      areaGrad.addColorStop(
        0.5,
        `rgba(${palette.mote}, ${0.04 * alphaScale})`
      )
      areaGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = areaGrad
      ctx.fill()

      // Outer glow stroke
      curvePath()
      ctx.strokeStyle = palette.curveGlow
      ctx.lineWidth = 6 + pulseRef.current * 8
      ctx.stroke()

      // Sharp curve stroke
      curvePath()
      ctx.strokeStyle = palette.curve
      ctx.lineWidth = 2.5
      ctx.stroke()

      // Animated leading head that travels along the curve
      const headT = 0.5 + Math.sin(time * 0.8) * 0.45
      const headX = headT * w
      const headExp = (Math.exp(k * headT) - 1) / (Math.exp(k) - 1)
      const headY =
        curveStartY - headExp * (curveStartY - curveEndY)

      const headGlow = ctx.createRadialGradient(
        headX,
        headY,
        0,
        headX,
        headY,
        18
      )
      headGlow.addColorStop(0, `rgba(${palette.head}, 0.9)`)
      headGlow.addColorStop(0.4, `rgba(${palette.head}, 0.3)`)
      headGlow.addColorStop(1, 'transparent')
      ctx.fillStyle = headGlow
      ctx.beginPath()
      ctx.arc(headX, headY, 18, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = `rgb(${palette.head})`
      ctx.beginPath()
      ctx.arc(headX, headY, 3.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // 3. Pulse shockwave ripple on trade/creation
      if (pulseRef.current > 0.01) {
        ctx.save()
        const shockRadius =
          (1 - pulseRef.current) * Math.max(w, h) * 0.7
        const shockAlpha = pulseRef.current * 0.4 * alphaScale
        ctx.beginPath()
        ctx.arc(
          w * mouseRef.current.x,
          h * mouseRef.current.y,
          shockRadius,
          0,
          Math.PI * 2
        )
        ctx.strokeStyle = `rgba(${palette.ember}, ${shockAlpha})`
        ctx.lineWidth = 3
        ctx.stroke()
        ctx.restore()
      }

      // 4. Particles — cursor gravitation + life cycle
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        p.life++
        p.phase += 0.02

        // Cursor gravitation
        if (mouseRef.current.isHovering) {
          const dx = mouseRef.current.x * w - p.x
          const dy = mouseRef.current.y * h - p.y
          const dist = Math.hypot(dx, dy)
          if (dist < 220 && dist > 10) {
            const force = (1 - dist / 220) * 0.35
            p.vx += (dx / dist) * force
            p.vy += (dy / dist) * force * 0.5
          }
        }

        // Velocity + air drag
        p.x += p.vx + Math.sin(p.phase) * (p.ember ? 0.35 : 0.15)
        p.y += p.vy
        p.vx *= 0.985

        // Life fade envelope
        const lifeRatio = p.life / p.maxLife
        let alpha =
          Math.sin(lifeRatio * Math.PI) *
          (p.ember ? 0.85 : 0.45) *
          alphaScale
        if (p.ember) {
          alpha += pulseRef.current * 0.3
        }

        // Respawn when expired or out of bounds
        if (
          p.life >= p.maxLife ||
          p.y < -20 ||
          p.x < -20 ||
          p.x > w + 20
        ) {
          particles[i] = createParticle(true)
          continue
        }

        // Draw particle
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        const col = p.ember ? palette.ember : palette.mote
        ctx.fillStyle = `rgba(${col}, ${Math.max(0, Math.min(1, alpha))})`
        ctx.fill()

        // Extra flare for larger embers
        if (p.ember && p.r > 1.6) {
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.r * 2.5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${palette.ember}, ${alpha * 0.25})`
          ctx.fill()
        }
      }
      ctx.restore()

      if (!reduced) {
        raf = requestAnimationFrame(tick)
      }
    }

    if (reduced) {
      tick()
    } else {
      raf = requestAnimationFrame(tick)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !running) {
          running = true
          raf = requestAnimationFrame(tick)
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
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [theme, pulseTrigger])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none select-none transition-opacity duration-700 ${className}`}
    />
  )
}
