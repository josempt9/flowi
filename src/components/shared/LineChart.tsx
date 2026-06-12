'use client'

export function LineChart({ data, height = 110 }: { data: number[]; height?: number }) {
  if (data.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-xs text-gray-400"
        style={{ height }}
      >
        Aún no hay suficientes datos para la gráfica.
      </div>
    )
  }

  const w = 320
  const h = height
  const pad = 6
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const x = (i: number) => pad + (i / (data.length - 1)) * (w - 2 * pad)
  const y = (v: number) => pad + (1 - (v - min) / range) * (h - 2 * pad)

  const line = data
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
    .join(' ')
  const area = `${line} L${x(data.length - 1).toFixed(1)},${h - pad} L${x(0).toFixed(1)},${h - pad} Z`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full text-black" preserveAspectRatio="none" style={{ height }}>
      <path d={area} fill="currentColor" opacity={0.08} />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
