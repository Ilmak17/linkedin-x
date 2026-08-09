import { leafTexts, normalizeWhitespace } from './text'

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
  badges: string[]
  logoUrl: string | null
  url: string
  dismissed: boolean
}

/**
 * Two anchors, because LinkedIn serves two different jobs pages.
 * `/jobs/search-results` is the server-driven markup and keys off
 * `componentkey`; `/jobs/collections/*` is still the legacy Ember list and
 * keys off `data-occludable-job-id`. Both were verified on 2026-08-09.
 */
const CARDS = ['[componentkey^="job-card-component-ref-"]', 'li[data-occludable-job-id]']
const DISMISS = 'button[aria-label^="Dismiss"]'

/**
 * Chips LinkedIn prints inline with the title, company and location. They
 * have to be pulled out before the remaining leaves are read positionally,
 * or "Easy Apply" ends up as somebody's location.
 */
const BADGES = [
  'easy apply',
  'promoted',
  'viewed',
  'applied',
  'be an early applicant',
  'actively reviewing applicants',
  'alumni work here',
  'response managed off linkedin',
  'легко откликнуться',
  'продвигается',
]

export interface RawJobDetail {
  description: string
  /** Remote / Hybrid / On-site, Full-time / Contract, and similar chips. */
  conditions: string[]
  applyUrl: string | null
  applyLabel: string
}

/**
 * The heading LinkedIn puts above the job description. Matching it is how the
 * pane is found; add your locale here if the description comes back empty.
 */
const ABOUT_HEADINGS = ['about the job', 'о вакансии', 'über den job', "à propos de l'offre", 'sobre el empleo']
const APPLY_WORDS = ['easy apply', 'apply', 'откликнуться', 'подать заявку']
const CONDITION_WORDS = [
  'remote',
  'hybrid',
  'on-site',
  'onsite',
  'full-time',
  'part-time',
  'contract',
  'internship',
  'temporary',
  'удал',
  'гибрид',
  'полная занятость',
]

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

      const job = readJob(card, id)
      // The collections list is occlusion-virtualised: cards outside the
      // viewport keep their id but render nothing. Listing those would put a
      // row of blank entries in the middle of the results; they fill in when
      // scrolled to, and the observer re-harvests then.
      if (!job.title) continue

      jobs.push(job)
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

  /**
   * Reads the detail pane for whichever job is selected.
   *
   * Title, company and location deliberately are not read here: the card
   * already gave us those and they are far easier to get right there. This
   * only takes what the pane adds — the description and the conditions.
   */
  detail(): RawJobDetail | null {
    const heading = [...document.querySelectorAll('h1, h2, h3')].find((h) =>
      ABOUT_HEADINGS.some((w) => normalizeWhitespace(h.textContent ?? '').toLowerCase().includes(w)),
    )
    if (!heading) return null

    // Walk out of the heading until the block also contains the description.
    let block: Element | null = heading.parentElement
    let description = ''
    for (let i = 0; i < 5 && block; i++) {
      const text = normalizeWhitespace(block.textContent ?? '')
      if (text.length > 300) {
        description = stripHeading(text, heading)
        break
      }
      block = block.parentElement
    }
    if (!description) return null

    const apply = [...document.querySelectorAll('a, button')].find((el) => {
      const text = normalizeWhitespace(el.textContent ?? '').toLowerCase()
      return APPLY_WORDS.some((w) => text === w || text === `${w} now`)
    })

    // The pane prints its chips as plain leaves alongside everything else. The
    // description has to be excluded explicitly: a job that says "удалённый
    // формат работы" in its body would otherwise contribute a fake chip.
    const pane = apply?.closest('[data-testid="lazy-column"]') ?? block
    const conditions = pane
      ? leafTexts(pane, block).filter(
          (t) => t.length < 30 && CONDITION_WORDS.some((w) => t.toLowerCase().includes(w)),
        )
      : []

    return {
      description,
      conditions: [...new Set(conditions)].slice(0, 4),
      applyUrl: apply instanceof HTMLAnchorElement ? apply.href : null,
      applyLabel: normalizeWhitespace(apply?.textContent ?? '') || 'Apply on LinkedIn',
    }
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
    for (const selector of CARDS) {
      const found = [...document.querySelectorAll(selector)]
      if (found.length > 0) return found
    }
    return []
  }
}

export function jobId(card: Element): string | null {
  const occludable = card.getAttribute('data-occludable-job-id')
  if (occludable) return occludable

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
  const link = (card.querySelector('a[href*="/jobs/view/"]') ?? card.querySelector('a')) as HTMLAnchorElement | null

  const isBadge = (t: string): boolean => BADGES.some((b) => t.toLowerCase().includes(b))
  const isPosted = (t: string): boolean => /\bago\b|назад|^\d+\s*(h|d|w|mo)\b/i.test(t)

  const posted = leaves.find((t) => isPosted(t) && !isBadge(t)) ?? ''
  const badges = leaves.filter(isBadge)
  const rest = leaves.filter((t) => t !== posted && !isBadge(t) && !/^Posted /i.test(t))

  return {
    id,
    title: rest[0] ?? '',
    company: rest[1] ?? '',
    location: rest[2] ?? '',
    postedLabel: posted.replace(/^Posted\s+/i, ''),
    badges: dedupeBadges(badges).slice(0, 3),
    logoUrl: logo?.src ?? null,
    url: link?.href ?? `https://www.linkedin.com/jobs/view/${id}/`,
    dismissed: Boolean(card.querySelector('button[aria-label^="Undo"]')),
  }
}

/**
 * "168 company alumni work here" and "168 Microsoft company alumni work here"
 * are the same badge printed twice, so the count prefix is stripped and the
 * shorter of any two overlapping variants wins.
 */
function stripHeading(text: string, heading: Element): string {
  const label = normalizeWhitespace(heading.textContent ?? '')
  return normalizeWhitespace(text.startsWith(label) ? text.slice(label.length) : text)
}

export function dedupeBadges(badges: string[]): string[] {
  const cleaned = badges.map((b) => b.replace(/^\d+\s+/, '').trim()).filter(Boolean)
  const kept: string[] = []

  for (const badge of cleaned) {
    const overlapping = kept.findIndex((k) => k.includes(badge) || badge.includes(k))
    if (overlapping === -1) {
      kept.push(badge)
    } else if (badge.length < kept[overlapping]!.length) {
      kept[overlapping] = badge
    }
  }
  return kept
}

