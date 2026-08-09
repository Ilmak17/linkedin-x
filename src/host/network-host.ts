import { leafTexts, normalizeWhitespace } from './text'

/**
 * Reads the "grow your network" suggestions.
 *
 * Verified against the live page on 2026-08-09. There is no componentkey and
 * no data-testid on a person card, so identity comes from the profile URL,
 * which is the one thing on the card that is both stable and unique.
 */

export interface RawPerson {
  id: string
  name: string
  headline: string
  avatarUrl: string | null
  profileUrl: string
  /** What LinkedIn's own button on this card says: Connect, Follow, Pending. */
  actionLabel: string
  invited: boolean
}

const ACTION_WORDS = ['connect', 'follow', 'pending', 'подписаться', 'связаться']

export class NetworkHost {
  isReady(): boolean {
    return this.harvest().length > 0
  }

  harvest(): RawPerson[] {
    const seen = new Set<string>()
    const people: RawPerson[] = []

    for (const card of this.#cards()) {
      const person = readPerson(card)
      if (!person || seen.has(person.id)) continue
      seen.add(person.id)
      people.push(person)
    }
    return people
  }

  observe(onChange: (people: RawPerson[]) => void): () => void {
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

  /** Clicks LinkedIn's own Connect or Follow control on that card. */
  act(id: string): boolean {
    const card = this.#cards().find((c) => personId(c) === id)
    const button = card ? actionButton(card) : null
    if (!button) return false
    button.click()
    return true
  }

  /**
   * A person card is the smallest element that holds both a profile link and
   * the button acting on it. Walking up from the button rather than matching a
   * container class is what makes this survive LinkedIn's hashed classes.
   */
  #cards(): Element[] {
    const cards: Element[] = []
    for (const button of document.querySelectorAll('button')) {
      const label = buttonLabel(button)
      if (!ACTION_WORDS.some((w) => label.includes(w))) continue

      let el: Element | null = button
      for (let i = 0; i < 6 && el; i++) {
        if (el.querySelector('a[href*="/in/"]')) break
        el = el.parentElement
      }
      if (el?.querySelector('a[href*="/in/"]') && !cards.includes(el)) cards.push(el)
    }
    return cards
  }
}

const buttonLabel = (b: Element): string =>
  normalizeWhitespace(`${b.textContent ?? ''} ${b.getAttribute('aria-label') ?? ''}`).toLowerCase()

function actionButton(card: Element): HTMLElement | null {
  for (const button of card.querySelectorAll('button')) {
    if (ACTION_WORDS.some((w) => buttonLabel(button).includes(w))) return button as HTMLElement
  }
  return null
}

export function personId(card: Element): string | null {
  const href = card.querySelector('a[href*="/in/"]')?.getAttribute('href') ?? ''
  const slug = href.split('?')[0]?.split('/in/')[1]?.replace(/\/$/, '')
  return slug || null
}

export function readPerson(card: Element): RawPerson | null {
  const id = personId(card)
  if (!id) return null

  const link = card.querySelector('a[href*="/in/"]') as HTMLAnchorElement | null
  const avatar = card.querySelector('img')
  const button = actionButton(card)
  const label = button ? normalizeWhitespace(button.textContent ?? '') : ''

  const leaves = leafTexts(card).filter((t) => !ACTION_WORDS.some((w) => t.toLowerCase() === w))
  const name = leaves[0] ?? ''
  const headline = leaves.find((t) => t !== name && t.length > 2) ?? ''

  return {
    id,
    name,
    headline,
    avatarUrl: avatar?.src ?? null,
    profileUrl: link?.href ?? `https://www.linkedin.com/in/${id}/`,
    actionLabel: label || 'Connect',
    invited: /pending|отправлено/i.test(label),
  }
}

