'use client'

import { useEffect, useRef, useState, useMemo, useId } from 'react'
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
} from 'lightweight-charts'
import { useThemeStore } from '../../hooks/useTheme'

export interface PricePoint {
  time: number
  value: number
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
  height = 340,
}: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>('24H')
  const { theme } = useThemeStore()
  const summaryId = useId()

  const themeColors =
    theme === 'light'
      ? {
          text: '#71717a',
          grid: 'rgba(228, 228, 231, 0.9)',
          border: 'rgba(228, 228, 231, 1)',
        }
      : {
          text: '#a1a1aa',
          grid: 'rgba(39, 39, 42, 0.5)',
          border: 'rgba(39, 39, 42, 0.8)',
        }

  const chartData = useMemo(() => {
    if (data && data.length > 0) {
      return [...data].sort((a, b) => a.time - b.time)
    }
    const now = Math.floor(Date.now() / 1000)
    const basePrice = parseFloat(currentPrice) || 0.0001
    const points: PricePoint[] = []
    const count = 30
    const step = 3600
    for (let i = count; i >= 0; i--) {
      const time = (now - i * step) as number
      const variance =
        1 + (Math.sin(i / 3) * 0.08 + (Math.random() - 0.5) * 0.04)
      const progress = 1 + (count - i) * 0.02
      points.push({
        time,
        value: Math.max(0.000001, basePrice * variance * progress),
      })
    }
    return points
  }, [data, currentPrice])

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

  // Create chart + series once per height/theme; data updates flow via setData below.
  useEffect(() => {
    if (!containerRef.current) return
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
        textColor: themeColors.text,
        fontSize: 11,
        fontFamily: 'var(--font-geist-sans)',
      },
      grid: {
        vertLines: { color: themeColors.grid },
        horzLines: { color: themeColors.grid },
      },
      crosshair: {
        vertLine: { color: '#2563eb', width: 1, style: 3 },
        horzLine: { color: '#2563eb', width: 1, style: 3 },
      },
      timeScale: {
        borderColor: themeColors.border,
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: themeColors.border,
        scaleMargins: { top: 0.15, bottom: 0.15 },
      },
    })

    const areaSeries = chart.addAreaSeries({
      topColor: 'rgba(37, 99, 235, 0.25)',
      bottomColor: 'rgba(37, 99, 235, 0.0)',
      lineColor: '#2563eb',
      lineWidth: 2,
    })

    chartRef.current = chart
    seriesRef.current = areaSeries

    const container = containerRef.current
    const resizeObserver = new ResizeObserver(() => {
      if (container && chartRef.current) {
        chartRef.current.applyOptions({ width: container.clientWidth })
      }
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
        seriesRef.current = null
      }
    }
    // Theme colors intentionally read once per theme value via primitive deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, theme])

  // Push data updates without recreating the canvas node.
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return
    const formattedPoints = filteredData.map((pt) => ({
      time: pt.time as UTCTimestamp,
      value: pt.value,
    }))
    if (formattedPoints.length > 0) {
      seriesRef.current.setData(formattedPoints)
      chartRef.current.timeScale().fitContent()
    }
  }, [filteredData])

  const priceSummary = `${symbol} current price ${currentPrice} XLM over ${timeRange}. ${filteredData.length} data points.`
  const isDemoData = !data || data.length === 0

  return (
    <div
      role="img"
      aria-label={`${symbol} price chart`}
      aria-describedby={summaryId}
      className="bg-card rounded-lg border border-border p-4 space-y-3"
    >
      <p id={summaryId} className="sr-only">
        {priceSummary}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
            {symbol} Price
            {isDemoData && (
              <span className="rounded border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                Demo data
              </span>
            )}
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
            {currentPrice}{' '}
            <span className="text-xs font-normal text-muted-foreground">
              XLM
            </span>
          </div>
        </div>

        <div className="flex items-center gap-0.5 bg-muted p-0.5 rounded-md text-xs">
          {(['1H', '24H', '7D', '1M', 'ALL'] as TimeRange[]).map(
            (range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                aria-pressed={timeRange === range}
                aria-label={`Show ${range} price range`}
                className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {range}
              </button>
            )
          )}
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
