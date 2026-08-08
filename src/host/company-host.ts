import { normalizeWhitespace } from './selectors'

/**
 * Reads a company page's top card.
 *
 * Verified on 2026-08-09. Company pages are still the legacy Ember markup —
 * no componentkey, no data-testid — but `org-top-card` survived into it and
 * is the anchor. The posts below the card are ordinary feed posts with real
 * activity urns, so the feed reader handles those and this only does the
 * header.
 */

export interface RawCompany {
  name: string
  industry: string
  location: string
  followers: string
  employees: string
  logoUrl: string | null
  /** The label on LinkedIn's own button: Follow or Following. */
  followLabel: string
}

const TOP_CARD = ['[class*="org-top-card"]', 'main section:first-of-type']
const FOLLOW = /^(\+ ?)?(follow|following|подписаться|вы подписаны)$/i

export class CompanyHost {
  isReady(): boolean {
    return Boolean(this.#topCard())
  }

  harvest(): RawCompany | null {
    const card = this.#topCard()
    if (!card) return null

    const leaves = leafTexts(card)
    const followers = leaves.find((t) => /follower|подписчик/i.test(t)) ?? ''
    const employees = leaves.find((t) => /employee|сотрудник/i.test(t)) ?? ''
    const rest = leaves.filter(
      (t) => t !== followers && t !== employees && !FOLLOW.test(t) && t.length > 1 && !/^learn more$/i.test(t),
    )

    const logo = document.querySelector('img[alt$="logo"], img[alt$=" logo"]') as HTMLImageElement | null
    const follow = [...card.querySelectorAll('button')].find((b) =>
      FOLLOW.test(normalizeWhitespace(b.textContent ?? '')),
    )

    // The card prints name, then industry, then location.
    const [name = '', industry = '', location = ''] = rest

    return {
      name,
      industry,
      location,
      followers,
      employees,
      logoUrl: logo?.src ?? null,
      followLabel: normalizeWhitespace(follow?.textContent ?? '') || 'Follow',
    }
  }

  observe(onChange: (company: RawCompany | null) => void): () => void {
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

  /** Clicks LinkedIn's own follow control. */
  toggleFollow(): boolean {
    const card = this.#topCard()
    const button = card
      ? [...card.querySelectorAll('button')].find((b) => FOLLOW.test(normalizeWhitespace(b.textContent ?? '')))
      : null
    if (!button) return false
    ;(button as HTMLElement).click()
    return true
  }

  #topCard(): Element | null {
    for (const selector of TOP_CARD) {
      const found = document.querySelector(selector)
      if (found && normalizeWhitespace(found.textContent ?? '').length > 20) return found
    }
    return null
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
