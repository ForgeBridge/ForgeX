'use client'

import { useState } from 'react'
import { sound } from '../../lib/sound'

export function SoundControl() {
  const [isMuted, setIsMuted] = useState(sound.getMuted())

  const handleToggle = () => {
    const muted = sound.toggleMute()
    setIsMuted(muted)
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      title={isMuted ? 'Turn on sound effects' : 'Mute sound effects'}
      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:border-forge/40 transition-colors"
      aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
    >
      {isMuted ? (
        <svg className="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-3.72a.75.75 0 011.28.53v14.88a.75.75 0 01-1.28.53l-4.72-3.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
        </svg>
      ) : (
        <div className="flex items-center gap-1 text-forge">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-3.72a.75.75 0 011.28.53v14.88a.75.75 0 01-1.28.53l-4.72-3.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
          </svg>
          <span className="flex items-center gap-0.5 h-2.5">
            <span className="w-0.5 h-2.5 bg-forge rounded-full animate-[soundWave_0.7s_ease-in-out_infinite]" />
            <span className="w-0.5 h-1.5 bg-forge rounded-full animate-[soundWave_0.9s_ease-in-out_infinite_0.2s]" />
          </span>
        </div>
      )}
    </button>
  )
}
