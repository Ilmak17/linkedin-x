export interface Tab {
  label: string
  active?: boolean
  href?: string
  onSelect?: () => void
}

/** The sticky heading every surface wears, with x's underline indicator. */
export function Tabs({ tabs }: { tabs: Tab[] }) {
  return (
    <div class="kit-head">
      <div class="kit-tabs" role="tablist">
        {tabs.map((tab) =>
          tab.href ? (
            <a class="kit-tab" role="tab" aria-selected={Boolean(tab.active)} href={tab.href} key={tab.label}>
              <span>{tab.label}</span>
            </a>
          ) : (
            <button
              class="kit-tab"
              role="tab"
              aria-selected={Boolean(tab.active)}
              onClick={tab.onSelect}
              key={tab.label}
            >
              <span>{tab.label}</span>
            </button>
          ),
        )}
      </div>
    </div>
  )
}
