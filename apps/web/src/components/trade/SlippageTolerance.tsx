'use client'

import { useState } from 'react'
import { useTradeStore } from '../../hooks/useBondingCurve'

export interface SlippageToleranceProps {
  value?: number
  onChange?: (slippage: number) => void
}

const PRESET_SLIPPAGES = [0.5, 1.0, 2.0, 5.0]

export function SlippageTolerance({ value, onChange }: SlippageToleranceProps) {
  const { slippage: storeSlippage, setSlippage: setStoreSlippage } = useTradeStore()
  const currentSlippage = value !== undefined ? value : storeSlippage

  const [isCustom, setIsCustom] = useState(!PRESET_SLIPPAGES.includes(currentSlippage))
  const [customValue, setCustomValue] = useState(
    !PRESET_SLIPPAGES.includes(currentSlippage) ? currentSlippage.toString() : '',
  )

  const handleSelect = (percent: number) => {
    setIsCustom(false)
    setCustomValue('')
    if (onChange) {
      onChange(percent)
    } else {
      setStoreSlippage(percent)
    }
  }

  const handleCustomChange = (valStr: string) => {
    setCustomValue(valStr)
    const parsed = parseFloat(valStr)
    if (!isNaN(parsed) && parsed >= 0.1 && parsed <= 50) {
      if (onChange) {
        onChange(parsed)
      } else {
        setStoreSlippage(parsed)
      }
    }
  }

  return (
    <div className="space-y-2 py-1 text-xs">
      <div className="flex justify-between items-center text-[var(--forgex-text-muted)]">
        <label htmlFor="custom-slippage-input" className="font-medium">Slippage Tolerance</label>
        <span className="font-mono font-semibold text-[var(--forgex-text)]">
          {currentSlippage}%
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {PRESET_SLIPPAGES.map((preset) => {
          const isSelected = !isCustom && currentSlippage === preset
          return (
            <button
              key={preset}
              type="button"
              onClick={() => handleSelect(preset)}
              className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                isSelected
                  ? 'bg-[var(--forgex-primary)]/20 border-[var(--forgex-primary)] text-[var(--forgex-primary)] font-bold'
                  : 'bg-[var(--forgex-bg)] border-[var(--forgex-border)] text-[var(--forgex-text-muted)] hover:text-[var(--forgex-text)]'
              }`}
            >
              {preset}%
            </button>
          )
        })}

        <div className="relative flex-1">
          <input
            id="custom-slippage-input"
            type="number"
            step="0.1"
            min="0.1"
            max="50"
            placeholder="Custom"
            value={customValue}
            onChange={(e) => {
              setIsCustom(true)
              handleCustomChange(e.target.value)
            }}
            onFocus={() => setIsCustom(true)}
            className={`w-full px-2 py-1 rounded text-xs bg-[var(--forgex-bg)] border ${
              isCustom
                ? 'border-[var(--forgex-primary)] text-[var(--forgex-text)]'
                : 'border-[var(--forgex-border)] text-[var(--forgex-text-muted)]'
            } placeholder-[var(--forgex-text-muted)] focus:outline-none`}
          />
          <span className="absolute right-2 top-1 text-[var(--forgex-text-muted)] pointer-events-none">
            %
          </span>
        </div>
      </div>

      {currentSlippage > 5 && (
        <p className="text-amber-400 text-[11px] flex items-center gap-1">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          High slippage increases the risk of frontrunning and unfavorable execution.
        </p>
      )}

      {currentSlippage < 0.5 && (
        <p className="text-blue-400 text-[11px]">
          Low slippage may cause your transaction to revert due to price movement.
        </p>
      )}
    </div>
  )
}
