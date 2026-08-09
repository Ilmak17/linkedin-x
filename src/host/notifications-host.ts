import { normalizeWhitespace } from './selectors'

/**
 * Reads the notifications list.
 *
 * Verified on 2026-08-09, once the test account finally had one to read.
 * Legacy Ember markup, but unusually well anchored: every card is an
 * `article.nt-card` carrying `data-view-name="notification-card-container"`
 * and an index, and unread state is a class modifier rather than something
 * that has to be inferred.
 */

export interface RawNotification {
  id: string
  text: string
  /** The bolded entity inside the line: a person, a page, a product. */
  subject: string
  timeLabel: string
  actionLabel: string
  url: string | null
  imageUrl: string | null
  unread: boolean
}

const CARD = 'article.nt-card, .nt-card'
/** Menu items and screen-reader labels that are not part of the notification. */
const NOISE = [
  /^unread notification\.?$/i,
  /^change notification preferences$/i,
  /^delete notification$/i,
  /^show less like this$/i,
  /^settings menu$/i,
]

export class NotificationsHost {
  isReady(): boolean {
    return document.querySelectorAll(CARD).length > 0
  }

  harvest(): RawNotification[] {
    const seen = new Set<string>()
    const items: RawNotification[] = []

    for (const card of document.querySelectorAll(CARD)) {
      const item = readNotification(card)
      if (!item || seen.has(item.id)) continue
      seen.add(item.id)
      items.push(item)
    }
    return items
  }

  observe(onChange: (items: RawNotification[]) => void): () => void {
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

  /** Dismisses a notification through LinkedIn's own control. */
  dismiss(id: string): boolean {
    const card = [...document.querySelectorAll(CARD)].find((c) => notificationId(c) === id)
    const button = card
      ? [...card.querySelectorAll('button')].find((b) =>
          /delete notification|удалить/i.test(normalizeWhitespace(b.getAttribute('aria-label') ?? b.textContent ?? '')),
        )
      : null
    if (!button) return false
    ;(button as HTMLElement).click()
    return true
  }
}

export function notificationId(card: Element): string | null {
  const index = card.getAttribute('data-nt-card-index')
  if (index !== null) return `nt-${index}`
  const text = normalizeWhitespace(card.textContent ?? '')
  return text ? `nt-${text.slice(0, 48)}` : null
}

export function readNotification(card: Element): RawNotification | null {
  const id = notificationId(card)
  if (!id) return null

  const leaves = leafTexts(card).filter((t) => !NOISE.some((re) => re.test(t)))
  const timeLabel = leaves.find((t) => /^\d+\s*(s|m|h|d|w|mo|y|сек|мин|ч|д|нед|мес|г)\b/i.test(t)) ?? ''

  // The bolded entity is a child element, so reading the parent's own text
  // nodes leaves a hole where it was: "Play ! Most solve it". The sentence is
  // taken whole from the block that contains the bold instead.
  const bold = card.querySelector('strong, b')
  const subject = normalizeWhitespace(bold?.textContent ?? '')
  const text = sentenceAround(bold) || longest(leaves.filter((t) => t !== timeLabel && t !== subject))

  const rest = leaves.filter((t) => t !== timeLabel && t !== subject && t !== text)
  const actionLabel = rest.find((t) => t.length < 24 && !text.includes(t)) ?? ''

  const link = card.querySelector('a') as HTMLAnchorElement | null
  const image = card.querySelector('img') as HTMLImageElement | null

  return {
    id,
    text,
    subject,
    timeLabel,
    actionLabel,
    url: link?.href ?? null,
    imageUrl: image?.src ?? null,
    unread: (card.className || '').includes('unread'),
  }
}

/** The smallest block around the bolded entity that reads as a sentence. */
function sentenceAround(bold: Element | null): string {
  let el: Element | null = bold?.parentElement ?? null
  for (let i = 0; i < 4 && el; i++) {
    const text = normalizeWhitespace(el.textContent ?? '')
    if (text.length > 30) return text
    el = el.parentElement
  }
  return ''
}

const longest = (values: string[]): string => values.slice().sort((a, b) => b.length - a.length)[0] ?? ''

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
