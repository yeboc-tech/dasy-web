import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'KIDARI - 통합사회 학습지 제작 도구'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
        }}
      >
        {/* Logo */}
        <span
          style={{
            fontSize: 72,
            fontWeight: 600,
            color: '#0a0a0a',
            marginBottom: 12,
          }}
        >
          KIDARI
        </span>
        {/* Subtext */}
        <span
          style={{
            fontSize: 28,
            color: '#4b5563',
          }}
        >
          학습지 제작 도구
        </span>
      </div>
    ),
    {
      ...size,
    }
  )
}
