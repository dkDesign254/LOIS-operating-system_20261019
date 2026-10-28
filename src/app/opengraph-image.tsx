import { ImageResponse } from 'next/og'

export const alt = 'LOIS: clarity for the people who decide'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 90, background: '#eef3ff', color: '#0f1d3d', fontFamily: 'monospace' }}>
        <div style={{ fontSize: 30, color: '#2a63f0', letterSpacing: 4 }}>THE LUCREBAG</div>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 20 }}><div style={{ fontSize: 120, fontWeight: 700 }}>LOIS</div><div style={{ width: 28, height: 100, background: '#2a63f0', marginLeft: 18 }} /></div>
        <div style={{ fontSize: 44, marginTop: 20 }}>Know whether a decision is ready before you make it.</div>
        <div style={{ fontSize: 28, marginTop: 30, color: '#2a63f0' }}>LOIS prepares and recommends. A person decides.</div>
      </div>
    ),
    size,
  )
}
