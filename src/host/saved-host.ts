import { normalizeWhitespace } from './selectors'

/**
 * Reads the saved posts list.
 *
 * Verified on 2026-08-09, against a list this extension populated with its
 * own save action. Legacy Ember markup, no componentkey and no data-testid,
 * but every item holds a permalink to the post — which is both the anchor and
 * the identity, and is the only place in the product where a feed post still
 * has a URL.
 */

export interface RawSaved {
  id: string
  author: string
  headline: string
  timeLabel: string
  text: string
  avatarUrl: string | null
  permalink: string
}

const PERMALINK = 'a[href*="/feed/update/"]'
const TIME = /^\d+\s*(s|m|h|d|w|mo|y|сек|мин|ч|д|нед|мес|г)\b/i

/** Chrome LinkedIn mixes into the same block as the facts. */
const NOISE = [
  /^view .*profile$/i,
  /^[•·]?\s*(1st|2nd|3rd)\+?$/i,
  /see more$/i,
  /visible to/i,
  /^saved posts?$/i,
  /^all$/i,
  /^follow$/i,
]

export class SavedHost {
  isReady(): boolean {
    return this.harvest().length > 0
  }

  harvest(): RawSaved[] {
    const seen = new Set<string>()
    const items: RawSaved[] = []

    for (const card of this.#cards()) {
      const item = readSaved(card)
      if (!item || seen.has(item.id)) continue
      seen.add(item.id)
      items.push(item)
    }
    return items
  }

  observe(onChange: (items: RawSaved[]) => void): () => void {
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

  /**
   * The smallest element holding a permalink. Taking the outer container
   * instead would swallow the page heading and the filter row into the first
   * item's fields.
   */
  #cards(): Element[] {
    const cards: Element[] = []
    for (const link of document.querySelectorAll(PERMALINK)) {
      let el: Element | null = link
      for (let i = 0; i < 8 && el; i++) {
        if (el.tagName === 'LI' || el.getAttribute('role') === 'listitem') break
        el = el.parentElement
      }
      if (el && (el.tagName === 'LI' || el.getAttribute('role') === 'listitem') && !cards.includes(el)) {
        cards.push(el)
      }
    }
    return cards
  }
}

export function savedId(card: Element): string | null {
  const href = card.querySelector(PERMALINK)?.getAttribute('href') ?? ''
  return href.match(/urn:li:activity:\d+/)?.[0] ?? null
}

export function readSaved(card: Element): RawSaved | null {
  const id = savedId(card)
  if (!id) return null

  const leaves = leafTexts(card).filter((t) => !NOISE.some((re) => re.test(t)))

  // Order, not length. The item prints author, headline, age, body, so the age
  // is the divider. Taking "the longest leaf" as the body inverts a short post
  // whose author has a long job title, which is most of LinkedIn.
  const timeIndex = leaves.findIndex((t) => TIME.test(t))
  const timeLabel = timeIndex >= 0 ? leaves[timeIndex]! : ''

  const author = leaves[0] ?? ''
  const headline = (timeIndex > 1 ? leaves.slice(1, timeIndex) : leaves.slice(1, 2)).join(' ')
  const text = (timeIndex >= 0 ? leaves.slice(timeIndex + 1) : leaves.slice(2)).join('\n\n')

  const avatar = card.querySelector('img') as HTMLImageElement | null
  const href = card.querySelector(PERMALINK) as HTMLAnchorElement | null

  return {
    id,
    author,
    headline,
    timeLabel: normalizeWhitespace((timeLabel.split(/[•·]/)[0] ?? '').trim()),
    text,
    avatarUrl: avatar?.src ?? null,
    permalink: href?.href.split('?')[0] ?? `https://www.linkedin.com/feed/update/${id}/`,
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
    const previous = out[out.length - 1]
    if (previous && (previous.startsWith(text) || text.startsWith(previous))) continue
    seen.add(text)
    out.push(text)
  }
  return out
}
