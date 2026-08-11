import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'ForgeX — Launch & Trade Tokens on Stellar'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0f172a',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          color: '#ffffff',
          padding: 48,
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: '#2e8c8e',
            marginBottom: 20,
          }}
        >
          ForgeX
        </div>
        <div
          style={{
            fontSize: 32,
            fontWeight: 600,
            color: '#f1f5f9',
            textAlign: 'center',
            maxWidth: 900,
          }}
        >
          Fair Launch Exponential Bonding Curves on Stellar &amp; Soroban
        </div>
        <div
          style={{
            fontSize: 20,
            color: '#94a3b8',
            marginTop: 32,
          }}
        >
          Zero Upfront Liquidity • Instant AMM Trading • Automatic Graduation
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
