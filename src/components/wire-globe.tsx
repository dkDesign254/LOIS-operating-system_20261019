'use client'
import { useEffect, useRef } from 'react'

// A quiet wireframe globe drawn on canvas: meridians, parallels, a few linked nodes and a receding floor grid.
// No libraries. Pauses when off-screen or the tab is hidden, draws one still frame for people who prefer reduced motion,
// and leans slightly toward the pointer. Colour comes from the --blue CSS variable.
function rng(seed: number) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647
}

export function WireGlobe({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ctx) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const color = getComputedStyle(cv).getPropertyValue('--blue').trim() || '#2a63f0'
    const rand = rng(42)
    const nodes = Array.from({ length: 44 }, () => {
      const u = rand() * 2 - 1
      const t = rand() * Math.PI * 2
      const r = Math.sqrt(1 - u * u)
      return [r * Math.cos(t), u, r * Math.sin(t)] as [number, number, number]
    })
    const links: [number, number][] = []
    for (let i = 0; i < nodes.length; i++)
      for (let j = i + 1; j < nodes.length; j++) {
        const d = Math.hypot(nodes[i][0] - nodes[j][0], nodes[i][1] - nodes[j][1], nodes[i][2] - nodes[j][2])
        if (d < 0.62) links.push([i, j])
      }

    let w = 0, h = 0, raf = 0, last = 0, visible = true
    let rot = 0.6, tilt = 0.32, tiltTarget = 0.32, speed = 0.12, speedTarget = 0.12

    function size() {
      const r = cv!.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      w = r.width; h = r.height
      cv!.width = Math.max(1, Math.round(w * dpr)); cv!.height = Math.max(1, Math.round(h * dpr))
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function project(x: number, y: number, z: number, R: number, cx: number, cy: number): [number, number, number] {
      const cr = Math.cos(rot), sr = Math.sin(rot)
      const X = x * cr + z * sr
      const Z = -x * sr + z * cr
      const ct = Math.cos(tilt), st = Math.sin(tilt)
      const Y2 = y * ct - Z * st
      const Z2 = y * st + Z * ct
      const p = 1 / (1 - Z2 * 0.18)
      return [cx + X * R * p, cy + Y2 * R * p, Z2]
    }

    function draw(t: number) {
      ctx!.clearRect(0, 0, w, h)
      const R = Math.min(w, h) * 0.36
      const cx = w * 0.5, cy = h * 0.46

      // receding floor grid
      ctx!.strokeStyle = color
      ctx!.lineWidth = 1
      const floorY = cy + R * 1.12
      for (let k = 0; k < 9; k++) {
        const y = floorY + Math.pow(k / 8, 1.8) * (h - floorY)
        ctx!.globalAlpha = 0.22 * (1 - k / 10)
        ctx!.beginPath(); ctx!.moveTo(0, y); ctx!.lineTo(w, y); ctx!.stroke()
      }
      const drift = ((t * 0.00004) % 1) * (w / 14)
      for (let k = -8; k <= 8; k++) {
        ctx!.globalAlpha = 0.16
        ctx!.beginPath()
        ctx!.moveTo(cx + k * (w / 40), floorY)
        ctx!.lineTo(cx + k * (w / 7) + drift, h)
        ctx!.stroke()
      }

      // sphere lines, split into near and far so the far side reads as a lighter ghost
      const near = new Path2D(), far = new Path2D()
      const add = (pts: [number, number, number][]) => {
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], b = pts[i]
          const path = a[2] + b[2] > 0 ? near : far
          path.moveTo(a[0], a[1]); path.lineTo(b[0], b[1])
        }
      }
      for (let m = 0; m < 12; m++) {
        const phi = (m / 12) * Math.PI
        const pts: [number, number, number][] = []
        for (let s = 0; s <= 64; s++) {
          const th = (s / 64) * Math.PI * 2
          pts.push(project(Math.cos(th) * Math.cos(phi), Math.sin(th), Math.cos(th) * Math.sin(phi), R, cx, cy))
        }
        add(pts)
      }
      for (let l = -4; l <= 4; l++) {
        const lat = (l / 5) * (Math.PI / 2)
        const pts: [number, number, number][] = []
        for (let s = 0; s <= 72; s++) {
          const th = (s / 72) * Math.PI * 2
          pts.push(project(Math.cos(lat) * Math.cos(th), Math.sin(lat), Math.cos(lat) * Math.sin(th), R, cx, cy))
        }
        add(pts)
      }
      ctx!.globalAlpha = 0.16; ctx!.stroke(far)
      ctx!.globalAlpha = 0.75; ctx!.lineWidth = 1.1; ctx!.stroke(near)

      // nodes and links
      const P = nodes.map((n) => project(n[0] * 1.0, n[1], n[2], R, cx, cy))
      ctx!.lineWidth = 1
      for (const [i, j] of links) {
        if (P[i][2] < 0 || P[j][2] < 0) continue
        ctx!.globalAlpha = 0.45
        ctx!.beginPath(); ctx!.moveTo(P[i][0], P[i][1]); ctx!.lineTo(P[j][0], P[j][1]); ctx!.stroke()
      }
      ctx!.fillStyle = color
      P.forEach((p) => {
        ctx!.globalAlpha = p[2] > 0 ? 0.95 : 0.25
        ctx!.beginPath(); ctx!.arc(p[0], p[1], p[2] > 0 ? 2.2 : 1.2, 0, Math.PI * 2); ctx!.fill()
      })
      ctx!.globalAlpha = 1
    }

    function frame(t: number) {
      raf = requestAnimationFrame(frame)
      if (!visible || document.hidden) { last = t; return }
      const dt = Math.min(0.05, (t - last) / 1000 || 0)
      last = t
      speed += (speedTarget - speed) * 0.05
      tilt += (tiltTarget - tilt) * 0.05
      rot += dt * speed
      draw(t)
    }

    function onMove(e: PointerEvent) {
      const mx = e.clientX / window.innerWidth - 0.5
      const my = e.clientY / window.innerHeight - 0.5
      speedTarget = 0.12 + mx * 0.22
      tiltTarget = 0.32 + my * 0.22
    }

    size()
    draw(0)
    const ro = new ResizeObserver(() => { size(); draw(0) })
    ro.observe(cv)
    let io: IntersectionObserver | undefined
    if (!reduce) {
      io = new IntersectionObserver(([e]) => { visible = e.isIntersecting }, { threshold: 0 })
      io.observe(cv)
      window.addEventListener('pointermove', onMove, { passive: true })
      raf = requestAnimationFrame(frame)
    }
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io?.disconnect()
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  return <canvas ref={ref} className={className} role="img" aria-label="A slowly turning wireframe globe of connected nodes" />
}
