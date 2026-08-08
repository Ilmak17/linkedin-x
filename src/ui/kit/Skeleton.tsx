/** Shown while a surface waits for LinkedIn to hydrate. */
export function Skeleton({ lines = 3, lead = true }: { lines?: number; lead?: boolean }) {
  const widths = ['38%', '92%', '84%', '58%', '70%']
  return (
    <div class="kit-skeleton">
      {lead && <div class="kit-skeleton__lead" />}
      <div class="kit-skeleton__body">
        {Array.from({ length: lines }, (_, i) => (
          <div class="kit-skeleton__line" style={`width:${widths[i % widths.length]}`} key={i} />
        ))}
      </div>
    </div>
  )
}
