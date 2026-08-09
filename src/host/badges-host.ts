import { normalizeWhitespace } from './selectors'
import { throttle } from '../lib/throttle'

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
    // Scoped to the navigation, throttled to once a second, and without
    // characterData. The first version watched the whole document for every
    // text change, which on LinkedIn is a firehose, to read four numbers that
    // change a few times an hour.
    const nav = document.querySelector('nav, [data-testid="primary-nav"], .global-nav') ?? document.body
    const pump = throttle(() => onChange(this.read()), 1000)

    const observer = new MutationObserver(pump.call)
    observer.observe(nav, { childList: true, subtree: true })

    return () => {
      pump.cancel()
      observer.disconnect()
    }
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
