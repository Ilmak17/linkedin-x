import { leafTexts } from './text'

/**
 * Reads the messaging inbox.
 *
 * Honest caveat, and it is the reason this shipped last: the account used to
 * build this extension has no conversations, so only the empty inbox has been
 * observed. The anchor is therefore structural rather than a class name —
 * a conversation is a list item holding a link to its thread, which has to be
 * true of any conversation in any markup generation. The same rule is already
 * proven on saved posts.
 *
 * What is NOT verified: the order of the fields inside a populated row. They
 * are read the way every other surface here reads them, and `doctor` reports
 * what was found so a first real inbox can correct it in one commit.
 */

export interface RawConversation {
  id: string
  name: string
  snippet: string
  timeLabel: string
  avatarUrl: string | null
  url: string
  unread: boolean
}

const THREAD_LINK = 'a[href*="/messaging/thread/"]'
const SHELL = '[class*="msg-conversations-container"], [class*="msg-cross-pillar"]'
const TIME = /^\d+\s*(s|m|h|d|w|mo|y|сек|мин|ч|д|нед|мес|г)\b|^(mon|tue|wed|thu|fri|sat|sun)/i
const NOISE = [/^conversation list$/i, /^attention screen reader/i, /^messaging$/i, /^search messages$/i]

export class MessagingHost {
  /** The inbox is present, whether or not it has anything in it. */
  isReady(): boolean {
    return Boolean(document.querySelector(SHELL))
  }

  harvest(): RawConversation[] {
    const seen = new Set<string>()
    const items: RawConversation[] = []

    for (const card of this.#cards()) {
      const item = readConversation(card)
      if (!item || seen.has(item.id)) continue
      seen.add(item.id)
      items.push(item)
    }
    return items
  }

  observe(onChange: (items: RawConversation[]) => void): () => void {
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

  /** What the reader actually found, so an empty inbox is distinguishable from a broken one. */
  doctor(): { shellFound: boolean; threadLinks: number; conversations: number } {
    return {
      shellFound: this.isReady(),
      threadLinks: document.querySelectorAll(THREAD_LINK).length,
      conversations: this.harvest().length,
    }
  }

  #cards(): Element[] {
    const cards: Element[] = []
    for (const link of document.querySelectorAll(THREAD_LINK)) {
      let el: Element | null = link
      for (let i = 0; i < 8 && el; i++) {
        if (el.tagName === 'LI' || el.getAttribute('role') === 'listitem') break
        el = el.parentElement
      }
      const card = el?.tagName === 'LI' || el?.getAttribute('role') === 'listitem' ? el : link.parentElement
      if (card && !cards.includes(card)) cards.push(card)
    }
    return cards
  }
}

export function conversationId(card: Element): string | null {
  const href = card.querySelector(THREAD_LINK)?.getAttribute('href') ?? ''
  return href.match(/\/messaging\/thread\/([^/?]+)/)?.[1] ?? null
}

export function readConversation(card: Element): RawConversation | null {
  const id = conversationId(card)
  if (!id) return null

  const leaves = leafTexts(card).filter((t) => !NOISE.some((re) => re.test(t)))
  const timeIndex = leaves.findIndex((t) => TIME.test(t))
  const timeLabel = timeIndex >= 0 ? leaves[timeIndex]! : ''

  // Same shape as every other list here: who, then when, then what.
  const name = leaves[0] ?? ''
  const snippet = (timeIndex >= 0 ? leaves.slice(timeIndex + 1) : leaves.slice(1)).join(' ')

  const link = card.querySelector(THREAD_LINK) as HTMLAnchorElement | null
  const avatar = card.querySelector('img') as HTMLImageElement | null
  const className = typeof card.className === 'string' ? card.className : ''

  return {
    id,
    name,
    snippet,
    timeLabel,
    avatarUrl: avatar?.src ?? null,
    url: link?.href.split('?')[0] ?? `https://www.linkedin.com/messaging/thread/${id}/`,
    unread: /unread/i.test(className) || Boolean(card.querySelector('[class*="unread"]')),
  }
}

