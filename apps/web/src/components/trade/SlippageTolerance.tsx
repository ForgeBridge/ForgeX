'use client'

import { useState } from 'react'
import { useTradeStore } from '../../hooks/useBondingCurve'

export interface SlippageToleranceProps {
  value?: number
  onChange?: (slippage: number) => void
}

const PRESET_SLIPPAGES = [0.5, 1.0, 2.0, 5.0]

export function SlippageTolerance({ value, onChange }: SlippageToleranceProps) {
  const { slippage: storeSlippage, setSlippage: setStoreSlippage } =
    useTradeStore()
  const currentSlippage = value !== undefined ? value : storeSlippage

  const [isCustom, setIsCustom] = useState(
    !PRESET_SLIPPAGES.includes(currentSlippage)
  )
  const [customValue, setCustomValue] = useState(
    !PRESET_SLIPPAGES.includes(currentSlippage)
      ? currentSlippage.toString()
      : ''
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
      <div className="flex justify-between items-center text-muted-foreground">
        <label htmlFor="custom-slippage-input" className="font-medium">
          Slippage Tolerance
        </label>
        <span className="font-mono font-semibold text-foreground">
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
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-muted border-border text-muted-foreground hover:text-foreground'
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
            className={`w-full px-2 py-1 rounded text-xs bg-background border ${
              isCustom
                ? 'border-primary text-foreground'
                : 'border-border text-muted-foreground'
            } placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring`}
          />
          <span className="absolute right-2 top-1 text-muted-foreground pointer-events-none">
            %
          </span>
        </div>
      </div>

      {currentSlippage > 5 && (
        <p className="text-warning text-[11px] flex items-center gap-1">
          <svg
            className="w-3.5 h-3.5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z"
            />
          </svg>
          High slippage increases frontrunning risk.
        </p>
      )}

      {currentSlippage < 0.5 && (
        <p className="text-primary text-[11px]">
          Low slippage may cause transactions to revert.
        </p>
      )}
    </div>
  )
}
