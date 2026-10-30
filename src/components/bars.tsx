// Small accessible bar chart in plain SVG. A table of the same numbers sits underneath for screen readers and keyboards.
export function Bars({ data, label }: { data: { label: string; value: number }[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const w = 10, gap = 3, h = 80
  return (
    <figure style={{ margin: 0 }}>
      <svg role="img" aria-label={label} viewBox={`0 0 ${data.length * (w + gap)} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: 90 }}>
        {data.map((d, i) => {
          const bh = d.value ? Math.max(2, (d.value / max) * (h - 4)) : 1
          return <rect key={d.label} x={i * (w + gap)} y={h - bh} width={w} height={bh} rx={2} fill="var(--blue)" opacity={d.value ? 1 : 0.25}><title>{`${d.label}: ${d.value}`}</title></rect>
        })}
      </svg>
      <details><summary className="small">Show as a table</summary>
        <table className="small"><thead><tr><th>Day</th><th>Count</th></tr></thead><tbody>{data.filter((d) => d.value).map((d) => <tr key={d.label}><td>{d.label}</td><td>{d.value}</td></tr>)}</tbody></table>
      </details>
    </figure>
  )
}
