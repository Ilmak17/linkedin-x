import { useRef, useState } from 'preact/hooks'

/**
 * Search that actually searches, instead of handing the user to LinkedIn's
 * own page. Submitting navigates to LinkedIn's results URL, which is a
 * surface we cover, so the results come back rendered by us.
 */
export function SearchBox({ autoFocusKey = '/' }: { autoFocusKey?: string }) {
  const input = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState('')

  const submit = (e: Event) => {
    e.preventDefault()
    const q = value.trim()
    if (!q) return
    location.href = `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(q)}`
  }

  return (
    <form class="kit-search" role="search" onSubmit={submit}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="M15.5 15.5 21 21" />
      </svg>
      <input
        ref={input}
        type="search"
        placeholder="Search LinkedIn"
        aria-label="Search LinkedIn"
        value={value}
        data-search-input={autoFocusKey}
        onInput={(e) => setValue((e.target as HTMLInputElement).value)}
      />
    </form>
  )
}
