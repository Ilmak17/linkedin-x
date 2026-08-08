/**
 * Every LinkedIn selector in the project lives here. Nothing else in the
 * codebase is allowed to know what LinkedIn's markup looks like.
 *
 * When LinkedIn ships a redesign, this file is the only one that changes.
 *
 * LinkedIn is midway through migrating the feed from its legacy Ember markup
 * (`.feed-shared-update-v2`, obfuscated class names) to a server-driven UI
 * that emits `data-testid` and `data-view-name` attributes. So every entry is
 * a list of candidates tried in order: SDUI first, legacy second, and a
 * structural fallback last. Structural fallbacks are deliberately loose; they
 * keep the extension alive with degraded data instead of blank.
 */

export type SelectorKey =
  | 'feedRoot'
  | 'post'
  | 'authorLink'
  | 'authorName'
  | 'authorHeadline'
  | 'authorAvatar'
  | 'timestamp'
  | 'body'
  | 'bodyExpand'
  | 'image'
  | 'video'
  | 'articleCard'
  | 'reactionCount'
  | 'commentCount'
  | 'repostCount'
  | 'likeButton'
  | 'commentButton'
  | 'repostButton'
  | 'saveMenuButton'
  | 'commentEditor'
  | 'commentSubmit'
  | 'commentItem'
  | 'commentAuthor'
  | 'commentBody'
  | 'promotedLabel'
  | 'socialProofHeader'
  | 'sponsoredBadge'

export const SELECTORS: Record<SelectorKey, readonly string[]> = {
  // The scrolling container that holds the posts.
  feedRoot: [
    '[data-testid="mainFeed"]',
    '.scaffold-finite-scroll__content',
    'main .core-rail',
    'main[aria-label]',
  ],

  // A single post. Must carry a stable identity attribute; see postUrn().
  post: [
    '[data-testid="mainFeed"] [data-urn^="urn:li:activity"]',
    'div.feed-shared-update-v2[data-urn]',
    'div.feed-shared-update-v2[data-id]',
    '[data-view-name="feed-full-update"]',
    'div[data-urn^="urn:li:activity"]',
  ],

  authorLink: [
    'a[data-testid="actor-link"]',
    '.update-components-actor__meta-link',
    '.update-components-actor__container a[href*="/in/"]',
    'a[href*="/in/"]',
  ],
  authorName: [
    '[data-testid="actor-name"]',
    '.update-components-actor__title span[aria-hidden="true"]',
    '.update-components-actor__title',
  ],
  authorHeadline: [
    '[data-testid="actor-description"]',
    '.update-components-actor__description span[aria-hidden="true"]',
    '.update-components-actor__description',
  ],
  authorAvatar: [
    '[data-testid="actor-image"] img',
    '.update-components-actor__avatar img',
    '.update-components-actor img',
  ],
  timestamp: [
    '[data-testid="actor-sub-description"]',
    '.update-components-actor__sub-description span[aria-hidden="true"]',
    '.update-components-actor__sub-description',
  ],

  body: [
    '[data-testid="post-text"]',
    '.update-components-text .break-words',
    '.feed-shared-inline-show-more-text',
    '.update-components-text',
  ],
  bodyExpand: ['.feed-shared-inline-show-more-text__see-more-less-toggle', 'button.see-more'],

  image: [
    '[data-testid="post-image"] img',
    '.update-components-image img',
    '.feed-shared-image img',
  ],
  video: ['.update-components-linkedin-video video', 'video'],
  articleCard: ['.update-components-article', '.feed-shared-article'],

  reactionCount: [
    '[data-testid="social-actions-reactions"]',
    '.social-details-social-counts__reactions-count',
    'button[aria-label*="reaction"]',
  ],
  commentCount: [
    '[data-testid="social-actions-comments"]',
    '.social-details-social-counts__comments button',
    'button[aria-label*="comment"]',
  ],
  repostCount: ['.social-details-social-counts__item--right-aligned button'],

  // Action controls. We click these; we never call LinkedIn's API ourselves.
  likeButton: [
    'button[data-testid="like-button"]',
    'button.react-button__trigger',
    'button[aria-label^="React Like"]',
    'button[aria-label*="Like"]',
  ],
  commentButton: [
    'button[data-testid="comment-button"]',
    'button.comment-button',
    'button[aria-label*="Comment"]',
  ],
  repostButton: [
    'button[data-testid="reshare-button"]',
    'button.social-reshare-button',
    'button[aria-label*="Repost"]',
    'button[aria-label*="Share"]',
  ],
  saveMenuButton: [
    'button[data-testid="control-menu"]',
    'button.feed-shared-control-menu__trigger',
    'button[aria-label*="control menu"]',
  ],

  commentEditor: ['div.ql-editor[contenteditable="true"]', 'div[role="textbox"][contenteditable="true"]'],
  commentSubmit: ['button.comments-comment-box__submit-button--cr', 'button.comments-comment-box__submit-button'],
  commentItem: ['article.comments-comment-entity', 'article.comments-comment-item'],
  commentAuthor: ['.comments-comment-meta__description-title', '.comments-post-meta__name-text'],
  commentBody: ['.comments-comment-item__main-content', '.update-components-text'],

  // Noise markers. See filter/classify.ts for how these are used.
  promotedLabel: ['.update-components-actor__description'],
  socialProofHeader: ['.update-components-header', '.feed-shared-header'],
  sponsoredBadge: ['[data-testid="sponsored-label"]', '.update-components-actor__sponsored-label'],
} as const

/** Which selector variant actually matched, per key. Powers `doctor()`. */
const hits = new Map<SelectorKey, { index: number; selector: string }>()

export function selectorHits(): Array<{ key: SelectorKey; index: number; selector: string }> {
  return [...hits.entries()].map(([key, v]) => ({ key, ...v }))
}

export function resetSelectorHits(): void {
  hits.clear()
}

export function queryOne(root: ParentNode, key: SelectorKey): Element | null {
  const candidates = SELECTORS[key]
  for (let i = 0; i < candidates.length; i++) {
    const sel = candidates[i]!
    const el = root.querySelector(sel)
    if (el) {
      hits.set(key, { index: i, selector: sel })
      return el
    }
  }
  return null
}

export function queryAll(root: ParentNode, key: SelectorKey): Element[] {
  const candidates = SELECTORS[key]
  for (let i = 0; i < candidates.length; i++) {
    const sel = candidates[i]!
    const els = root.querySelectorAll(sel)
    if (els.length > 0) {
      hits.set(key, { index: i, selector: sel })
      return [...els]
    }
  }
  return []
}

export function textOf(root: ParentNode, key: SelectorKey): string {
  const el = queryOne(root, key)
  return el ? normalizeWhitespace(el.textContent ?? '') : ''
}

/**
 * LinkedIn renders the same string twice for screen readers: once visible and
 * once in a `.visually-hidden` sibling. Naive textContent yields "Ada LovelaceAda Lovelace".
 */
export function visibleTextOf(root: ParentNode, key: SelectorKey): string {
  const el = queryOne(root, key)
  if (!el) return ''
  const aria = el.querySelector('[aria-hidden="true"]')
  const source = aria ?? el
  const clone = source.cloneNode(true) as Element
  clone.querySelectorAll('.visually-hidden, [class*="visually-hidden"]').forEach((n) => n.remove())
  return normalizeWhitespace(clone.textContent ?? '')
}

export function normalizeWhitespace(s: string): string {
  return s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * The stable identity of a post. LinkedIn has kept `urn:li:activity:<id>` across
 * every redesign of the last several years, in `data-urn` or `data-id`.
 */
export function postUrn(el: Element): string | null {
  const direct = el.getAttribute('data-urn') ?? el.getAttribute('data-id')
  if (direct?.includes('urn:li:')) return direct
  const nested = el.querySelector('[data-urn^="urn:li:"], [data-id^="urn:li:"]')
  return nested?.getAttribute('data-urn') ?? nested?.getAttribute('data-id') ?? null
}
