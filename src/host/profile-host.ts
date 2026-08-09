import { leafTexts, normalizeWhitespace } from './text'

/**
 * Reads a member profile.
 *
 * Verified against the live site on 2026-08-09. Profiles are the
 * server-driven markup and every section is a card keyed
 * `com.linkedin.sdui.profile.card.ref<memberId><SectionName>` — the suffix is
 * the section, which makes it the one anchor here that reads like an API
 * rather than a guess.
 */

export interface RawProfile {
  name: string
  headline: string
  company: string
  location: string
  followers: string
  website: string | null
  about: string
  avatarUrl: string | null
  coverUrl: string | null
  /** Labels on LinkedIn's own buttons: Follow, Connect, Message. */
  actions: string[]
}

const CARD = '[componentkey^="com.linkedin.sdui.profile.card.ref"]'
const ACTION_WORDS = ['follow', 'following', 'connect', 'message', 'pending', 'подписаться', 'связаться']
const NOISE = ['contact info', 'verify in 2 minutes', 'open to', 'add section', 'enhance profile', '·']

export class ProfileHost {
  isReady(): boolean {
    return Boolean(this.#card('Topcard'))
  }

  harvest(): RawProfile | null {
    const top = this.#card('Topcard')
    if (!top) return null

    const leaves = leafTexts(top).filter(
      (t) => !NOISE.includes(t.toLowerCase()) && !ACTION_WORDS.includes(t.toLowerCase()),
    )

    const followers = leaves.find((t) => /follower|подписчик/i.test(t)) ?? ''
    const website = leaves.find((t) => /^https?:\/\/|^www\./i.test(t)) ?? null
    const rest = leaves.filter((t) => t !== followers && t !== website)

    // The top card prints name, headline, current company, then location.
    const [name = '', headline = '', company = '', location = ''] = rest

    return {
      name,
      headline,
      company,
      location,
      followers,
      website,
      about: this.#sectionText('About'),
      avatarUrl: this.#avatar(),
      coverUrl: this.#cover(),
      actions: [...new Set(this.#actionLabels(top))],
    }
  }

  observe(onChange: (profile: RawProfile | null) => void): () => void {
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

  /** Clicks LinkedIn's own Follow, Connect or Message control. */
  act(label: string): boolean {
    const top = this.#card('Topcard')
    if (!top) return false

    for (const button of top.querySelectorAll('button, a')) {
      if (normalizeWhitespace(button.textContent ?? '').toLowerCase() === label.toLowerCase()) {
        ;(button as HTMLElement).click()
        return true
      }
    }
    return false
  }

  #card(section: string): Element | null {
    // A card can render twice; the populated one is the one with content.
    const cards = [...document.querySelectorAll(CARD)].filter((c) =>
      (c.getAttribute('componentkey') ?? '').endsWith(section),
    )
    return cards.sort((a, b) => b.querySelectorAll('*').length - a.querySelectorAll('*').length)[0] ?? null
  }

  #sectionText(section: string): string {
    const card = this.#card(section)
    if (!card) return ''
    const heading = normalizeWhitespace(card.querySelector('h2, h3')?.textContent ?? '')
    return leafTexts(card)
      .filter((t) => t !== heading && t.length > 20)
      .join('\n\n')
  }

  #actionLabels(top: Element): string[] {
    return [...top.querySelectorAll('button, a')]
      .map((b) => normalizeWhitespace(b.textContent ?? ''))
      .filter((t) => ACTION_WORDS.includes(t.toLowerCase()))
  }

  /** The largest square image on the page that is not the cover. */
  #avatar(): string | null {
    const images = [...document.querySelectorAll('img')].filter(
      (i) => i.alt !== 'Cover photo' && i.naturalWidth > 90 && Math.abs(i.naturalWidth - i.naturalHeight) < 4,
    )
    return images.sort((a, b) => b.naturalWidth - a.naturalWidth)[0]?.src ?? null
  }

  #cover(): string | null {
    const cover = document.querySelector('img[alt="Cover photo"], img[alt*="cover"]') as HTMLImageElement | null
    return cover?.src ?? null
  }
}

