import { normalizeWhitespace } from './selectors'

/**
 * Reads LinkedIn's job search results.
 *
 * A separate host from the feed on purpose: the surfaces share nothing but
 * the idea of "read the page, hand back plain data". Job cards are not posts,
 * carry a different identity, and live under a different anchor.
 *
 * Verified against the live site on 2026-08-09. The anchor is
 * `componentkey="job-card-component-ref-<jobId>"`, which is the only stable
 * handle on the card: every class name is a content hash, and the card has no
 * data-testid of its own.
 */

export interface RawJob {
  id: string
  title: string
  company: string
  location: string
  postedLabel: string
  logoUrl: string | null
  url: string
  dismissed: boolean
}

const CARD = '[componentkey^="job-card-component-ref-"]'
const DISMISS = 'button[aria-label^="Dismiss"]'

export class JobsHost {
  isReady(): boolean {
    return this.#cards().length > 0
  }

  harvest(): RawJob[] {
    const seen = new Set<string>()
    const jobs: RawJob[] = []

    for (const card of this.#cards()) {
      const id = jobId(card)
      if (!id || seen.has(id)) continue
      seen.add(id)
      jobs.push(readJob(card, id))
    }
    return jobs
  }

  observe(onChange: (jobs: RawJob[]) => void): () => void {
    let queued = false
    const observer = new MutationObserver(() => {
      if (queued) return
      queued = true
      requestAnimationFrame(() => {
        queued = false
        onChange(this.harvest())
      })
    })
    observer.observe(document.documentElement, { childList: true, subtree: true })
    return () => observer.disconnect()
  }

  /** Opens a job in LinkedIn's own detail pane by clicking its card. */
  open(id: string): boolean {
    const card = this.#cards().find((c) => jobId(c) === id)
    const link = card?.querySelector('a') ?? card
    if (!(link instanceof HTMLElement)) return false
    link.click()
    return true
  }

  /** LinkedIn's own "not interested" control. */
  dismiss(id: string): boolean {
    const card = this.#cards().find((c) => jobId(c) === id)
    const button = card?.querySelector(DISMISS)
    if (!(button instanceof HTMLElement)) return false
    button.click()
    return true
  }

  #cards(): Element[] {
    return [...document.querySelectorAll(CARD)]
  }
}

export function jobId(card: Element): string | null {
  const key = card.getAttribute('componentkey') ?? ''
  const id = key.replace('job-card-component-ref-', '')
  return id && id !== key ? id : null
}

/**
 * A job card prints, in order: title, company, location, then how long ago it
 * was posted. There is nothing to match on individually, so the leaves are
 * read positionally and the posting age is recognised by shape.
 */
export function readJob(card: Element, id: string): RawJob {
  const leaves = leafTexts(card)
  const logo = card.querySelector('img')
  const link = card.querySelector('a')

  const postedIndex = leaves.findIndex((t) => /\bago\b|назад|^\d+\s*(h|d|w|mo)\b/i.test(t))
  const posted = postedIndex >= 0 ? leaves[postedIndex]! : ''
  const rest = leaves.filter((_, i) => i !== postedIndex && !/^Posted /i.test(leaves[i] ?? ''))

  return {
    id,
    title: rest[0] ?? '',
    company: rest[1] ?? '',
    location: rest[2] ?? '',
    postedLabel: posted.replace(/^Posted\s+/i, ''),
    logoUrl: logo?.src ?? null,
    url: link?.href ?? `https://www.linkedin.com/jobs/view/${id}/`,
    dismissed: Boolean(card.querySelector('button[aria-label^="Undo"]')),
  }
}

function leafTexts(root: Element): string[] {
  const out: string[] = []
  const seen = new Set<string>()

  for (const el of [root, ...root.querySelectorAll('*')]) {
    const own = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent ?? '')
      .join(' ')
    const text = normalizeWhitespace(own)
    if (!text || seen.has(text)) continue

    // LinkedIn repeats the title for screen readers with a badge appended,
    // e.g. "Senior Backend Engineer (Verified job)" then "Senior Backend
    // Engineer". An exact-match check misses that, and the near-duplicate
    // shifts company and location down a slot each.
    const previous = out[out.length - 1]
    if (previous && (previous.startsWith(text) || text.startsWith(previous))) continue

    seen.add(text)
    out.push(text)
  }
  return out
}
