export interface Filter {
  key: string
  label: string
}

/** A row of exclusive filter pills, x's shape for a segmented control. */
export function FilterBar({
  filters,
  active,
  onSelect,
}: {
  filters: Filter[]
  active: string
  onSelect: (key: string) => void
}) {
  return (
    <div class="kit-filters" role="tablist" aria-label="Filter">
      {filters.map((f) => (
        <button
          key={f.key}
          class="kit-filter"
          role="tab"
          aria-selected={f.key === active}
          onClick={() => onSelect(f.key)}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
