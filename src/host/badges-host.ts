import { normalizeWhitespace } from './selectors'

/**
 * Reads the unread counts off LinkedIn's own navigation.
 *
 * Our overlay covers that navigation, so without this the only way to notice
 * a new message is to leave the extension. LinkedIn prints the count as text
 * inside the nav item, and the item is identified by its label.
 */

export type Badges = Record<string, number>

const ITEMS = 'nav a, .global-nav__primary-item, [data-testid="primary-nav"] a'

export class BadgesHost {
  read(): Badges {
    const badges: Badges = {}

    for (const item of document.querySelectorAll(ITEMS)) {
      const text = normalizeWhitespace(item.textContent ?? '')
      if (!text) continue

      const count = countIn(text)
      if (count === null) continue

      const label = labelIn(text)
      if (label) badges[label] = count
    }
    return badges
  }

  observe(onChange: (badges: Badges) => void): () => void {
    let queued = false
    const observer = new MutationObserver(() => {
      if (queued) return
      queued = true
      requestAnimationFrame(() => {
        queued = false
        onChange(this.read())
      })
    })
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }
}

/** LinkedIn writes "3 new notifications" or a bare "3" next to the label. */
export function countIn(text: string): number | null {
  const match = text.match(/(\d+)\s*(\+)?/)
  if (!match) return null
  const n = Number(match[1])
  return Number.isFinite(n) && n > 0 ? n : null
}

const LABELS: Array<[RegExp, string]> = [
  [/messag|сообщен/i, 'Messages'],
  [/notification|уведомлен/i, 'Notifications'],
  [/my network|network|сет/i, 'Network'],
  [/job|вакан/i, 'Jobs'],
]

export function labelIn(text: string): string | null {
  return LABELS.find(([re]) => re.test(text))?.[1] ?? null
}
