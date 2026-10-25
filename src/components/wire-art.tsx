// Small static line illustrations in the same hand as the globe. Pure SVG, no script.
export function WireArt({ kind, size = 220 }: { kind: 'rings' | 'mesh' | 'steps'; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 200 200', fill: 'none', stroke: 'var(--blue)', strokeWidth: 1, 'aria-hidden': true as const, className: 'wire-art' }
  if (kind === 'rings')
    return (
      <svg {...common}>
        {Array.from({ length: 18 }, (_, i) => (
          <ellipse key={i} cx="100" cy="100" rx="86" ry="26" transform={`rotate(${i * 10} 100 100)`} opacity={0.35 + (i % 3) * 0.2} />
        ))}
        <circle cx="100" cy="100" r="3" fill="var(--blue)" />
      </svg>
    )
  if (kind === 'mesh') {
    const pts: [number, number][] = [[100, 14], [172, 52], [180, 120], [128, 182], [58, 170], [20, 108], [44, 40], [100, 96], [140, 80], [74, 128]]
    const edges = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0], [0, 7], [1, 8], [2, 8], [3, 9], [4, 9], [5, 9], [6, 7], [7, 8], [7, 9], [8, 2], [0, 8], [6, 9]]
    return (
      <svg {...common}>
        {edges.map(([a, b], i) => <line key={i} x1={pts[a][0]} y1={pts[a][1]} x2={pts[b][0]} y2={pts[b][1]} opacity="0.55" />)}
        {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="var(--blue)" stroke="none" />)}
      </svg>
    )
  }
  return (
    <svg {...common}>
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(${i * 14} ${i * -6})`}>
          <path d={`M20 ${150 - i * 26} L100 ${118 - i * 26} L180 ${150 - i * 26} L100 ${182 - i * 26} Z`} opacity={0.35 + i * 0.2} />
        </g>
      ))}
      <path d="M100 150 V30" strokeDasharray="3 4" />
      <circle cx="100" cy="30" r="4" fill="var(--blue)" />
    </svg>
  )
}
