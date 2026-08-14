'use client'

import { useEffect, useState } from 'react'
import { validateEnvConfig, EnvValidationResult } from '../../lib/env'

export function EnvValidationBanner() {
  const [result, setResult] = useState<EnvValidationResult | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const res = validateEnvConfig()
    if (!res.isValid || res.warnings.length > 0) {
      setResult(res)
    }
  }, [])

  if (!result || dismissed) return null

  const isError = !result.isValid

  return (
    <div
      role="alert"
      className={`px-4 py-2.5 text-xs flex items-center justify-between border-b ${
        isError
          ? 'bg-destructive/10 border-destructive/30 text-destructive'
          : 'bg-warning/10 border-warning/30 text-warning'
      }`}
    >
      <div className="flex items-center gap-2 max-w-5xl">
        <span className="font-bold uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded border border-current">
          {isError ? 'Config Error' : 'Config Warning'}
        </span>
        <span className="truncate">
          {isError ? result.errors.join(' | ') : result.warnings.join(' | ')}
        </span>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss config banner"
        className="text-current hover:opacity-70 font-semibold text-[11px] shrink-0 ml-4 underline"
      >
        Dismiss
      </button>
    </div>
  )
}
