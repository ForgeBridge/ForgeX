'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { createChart, ColorType, IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts'

export interface PricePoint {
  time: number // unix timestamp in seconds
  value: number // price in XLM
}

export interface PriceChartProps {
  data?: PricePoint[]
  symbol?: string
  currentPrice?: string
  height?: number
}

type TimeRange = '1H' | '24H' | '7D' | '1M' | 'ALL'

export function PriceChart({
  data,
  symbol = 'TOKEN',
  currentPrice = '0.0001',
  height = 320,
}: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null)

  const [timeRange, setTimeRange] = useState<TimeRange>('24H')

  // Generate synthetic curve data if no data provided
  const chartData = useMemo(() => {
    if (data && data.length > 0) {
      return [...data].sort((a, b) => a.time - b.time)
    }

    // Default sample curve progression
    const now = Math.floor(Date.now() / 1000)
    const basePrice = parseFloat(currentPrice) || 0.0001
    const points: PricePoint[] = []
    const count = 30
    const step = 3600 // 1 hour per step

    for (let i = count; i >= 0; i--) {
      const time = (now - i * step) as number
      // Natural exponential/random walk curve simulation
      const variance = 1 + (Math.sin(i / 3) * 0.08 + (Math.random() - 0.5) * 0.04)
      const progress = 1 + (count - i) * 0.02
      points.push({
        time,
        value: Math.max(0.000001, basePrice * variance * progress),
      })
    }
    return points
  }, [data, currentPrice])

  // Filter data based on selected time range
  const filteredData = useMemo(() => {
    if (chartData.length === 0) return []
    const latestTime = chartData[chartData.length - 1].time
    const rangeSeconds: Record<TimeRange, number> = {
      '1H': 3600,
      '24H': 86400,
      '7D': 86400 * 7,
      '1M': 86400 * 30,
      ALL: Infinity,
    }
    const cutoff = latestTime - rangeSeconds[timeRange]
    const filtered = chartData.filter((pt) => pt.time >= cutoff)
    return filtered.length > 0 ? filtered : chartData
  }, [chartData, timeRange])

  useEffect(() => {
    if (!containerRef.current) return

    // Clean up previous chart
    if (chartRef.current) {
      chartRef.current.remove()
      chartRef.current = null
      seriesRef.current = null
    }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#94a3b8',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(51, 65, 85, 0.4)' },
        horzLines: { color: 'rgba(51, 65, 85, 0.4)' },
      },
      crosshair: {
        vertLine: { color: '#2e8c8e', width: 1, style: 3 },
        horzLine: { color: '#2e8c8e', width: 1, style: 3 },
      },
      timeScale: {
        borderColor: 'rgba(51, 65, 85, 0.8)',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: 'rgba(51, 65, 85, 0.8)',
        scaleMargins: {
          top: 0.15,
          bottom: 0.15,
        },
      },
    })

    const areaSeries = chart.addAreaSeries({
      topColor: 'rgba(46, 140, 142, 0.4)',
      bottomColor: 'rgba(46, 140, 142, 0.0)',
      lineColor: '#2e8c8e',
      lineWidth: 2,
    })

    const formattedPoints = filteredData.map((pt) => ({
      time: pt.time as UTCTimestamp,
      value: pt.value,
    }))

    if (formattedPoints.length > 0) {
      areaSeries.setData(formattedPoints)
      chart.timeScale().fitContent()
    }

    chartRef.current = chart
    seriesRef.current = areaSeries

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
        })
      }
    }

    window.addEventListener('resize', handleResize)

    const resizeObserver = new ResizeObserver(() => handleResize())
    resizeObserver.observe(containerRef.current)

    return () => {
      window.removeEventListener('resize', handleResize)
      resizeObserver.disconnect()
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
        seriesRef.current = null
      }
    }
  }, [filteredData, height])

  return (
    <div
      aria-label="Price Chart Container"
      className="bg-[var(--forgex-surface)] rounded-lg border border-[var(--forgex-border)] p-4 space-y-4 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs text-[var(--forgex-text-muted)] font-medium">
            {symbol} Price
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-[var(--forgex-text)]">
            {currentPrice} <span className="text-xs font-normal text-[var(--forgex-text-muted)]">XLM</span>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-[var(--forgex-bg)] p-1 rounded-lg border border-[var(--forgex-border)] text-xs">
          {(['1H', '24H', '7D', '1M', 'ALL'] as TimeRange[]).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setTimeRange(range)}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                timeRange === range
                  ? 'bg-[var(--forgex-primary)] text-white shadow-sm'
                  : 'text-[var(--forgex-text-muted)] hover:text-[var(--forgex-text)]'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={containerRef}
        data-testid="price-chart-canvas"
        className="w-full relative overflow-hidden"
        style={{ height }}
      />
    </div>
  )
}
