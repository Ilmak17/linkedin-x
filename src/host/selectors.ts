/**
 * Every LinkedIn selector in the project lives here. Nothing else in the
 * codebase is allowed to know what LinkedIn's markup looks like.
 *
 * When LinkedIn ships a redesign, this file is the only one that changes.
 *
 * ## Two generations
 *
 * LinkedIn has migrated the feed to a server-driven UI. Verified against the
 * live site on 2026-08-09, the current generation looks like this:
 *
 *   div[data-testid="mainFeed"][data-component-type="LazyColumn"]
 *     div[data-lazy-mount-id]                      one per feed slot
 *       …
 *         div[role="listitem"][componentkey="expanded<TOKEN>FeedType_…"]
 *
 * All class names are content hashes (`_6ebd00b4`, `e3ec3fcb`) and change
 * every deploy, so nothing here may match on class. What is stable:
 *
 *   - `data-testid` on the feed root, the post body and the "…more" button
 *   - `componentkey`, which carries the post's identity token
 *   - `role="listitem"` on the post root
 *   - `aria-label` prefixes on the action buttons
 *
 * The legacy Ember markup (`.feed-shared-update-v2`, `data-urn`) is kept as a
 * fallback because members on older buckets still get it.
 *
 * ## What we lost in the migration
 *
 * The old markup carried `data-urn="urn:li:activity:<id>"` on every post,
 * which gave both a stable identity and a permalink. The new markup has no
 * activity urn anywhere in the DOM. Identity now comes from `componentkey`
 * (see `postId`), and permalinks are simply not derivable, so the UI degrades
 * to plain text where it used to link out.
 */

export type SelectorKey =
  | 'feedRoot'
  | 'post'
  | 'postLegacy'
  | 'controlMenu'
  | 'hideButton'
  | 'authorLink'
  | 'authorAvatar'
  | 'body'
  | 'bodyExpand'
  | 'image'
  | 'video'
  | 'document'
  | 'likeButton'
  | 'reactionsMenu'
  | 'commentBox'
  | 'commentEditor'
  | 'commentSubmit'
  | 'commentItem'
  | 'commentAuthor'
  | 'commentBody'
  // legacy-only keys, kept so old buckets still parse
  | 'authorNameLegacy'
  | 'authorHeadlineLegacy'
  | 'timestampLegacy'
  | 'reactionCountLegacy'
  | 'commentCountLegacy'
  | 'sponsoredBadge'
  | 'socialProofHeader'

export const SELECTORS: Record<SelectorKey, readonly string[]> = {
  // The last entry catches search results, which render the same post markup
  // as the feed but under no feed container of their own.
  feedRoot: [
    '[data-testid="mainFeed"]',
    '.scaffold-finite-scroll__content',
    'main .core-rail',
    'main[aria-label]',
    'main',
  ],

  // A post in the server-driven feed. The `expanded` prefix on componentkey is
  // what separates real posts from the other listitems LinkedIn puts in the
  // same list (person suggestions, module cards).
  post: [
    '[role="listitem"][componentkey^="expanded"]',
    '[componentkey^="expanded"][componentkey*="FeedType"]',
  ],

  postLegacy: [
    'div.feed-shared-update-v2[data-urn]',
    'div.feed-shared-update-v2[data-id]',
    'div[data-urn^="urn:li:activity"]',
  ],

  // Doubles as the "is this actually a post" test: modules never have one.
  // The author's name is in the label, which is also our fallback for it.
  controlMenu: [
    'button[aria-label^="Open control menu"]',
    'button[data-testid="control-menu"]',
    'button.feed-shared-control-menu__trigger',
  ],
  hideButton: ['button[aria-label^="Hide post"]'],

  // One combined selector on purpose: `queryAll` returns the first candidate
  // that matches anything, so listing these separately would hide every
  // company link behind the first member link on the same post.
  authorLink: [
    'a[href*="/in/"], a[href*="/company/"], a[href*="/school/"], a[href*="/newsletters/"]',
    '.update-components-actor__meta-link',
  ],
  // `:not` keeps this from falling through to the post's own image when a
  // member has no avatar set.
  authorAvatar: [
    'img[alt^="View "]:not([alt="View image"])',
    '.update-components-actor__avatar img',
    '.update-components-actor img',
  ],

  body: ['[data-testid="expandable-text-box"]', '.update-components-text .break-words', '.update-components-text'],
  bodyExpand: [
    '[data-testid="expandable-text-button"]',
    '.feed-shared-inline-show-more-text__see-more-less-toggle',
  ],

  image: ['img[alt="View image"]', '.update-components-image img', '.feed-shared-image img'],
  video: ['video'],
  document: ['button[aria-label="Full screen"]'],

  // The reaction state is in the label text, not aria-pressed. See `isLiked`.
  likeButton: [
    'button[aria-label^="Reaction button state"]',
    'button.react-button__trigger',
    'button[aria-label^="React Like"]',
  ],
  reactionsMenu: ['button[aria-label^="Open reactions menu"]'],

  // Scope for the submit control. Without it, "the button that says Comment"
  // matches the post's own action bar instead of the one that sends.
  commentBox: ['[componentkey^="commentBox-"]', '.comments-comment-box'],
  // TipTap, not Quill, in the server-driven markup. It accepts execCommand
  // insertText, which is what `act` relies on.
  commentEditor: [
    '[data-testid="ui-core-tiptap-text-editor-wrapper"] [contenteditable="true"]',
    'div[role="textbox"][contenteditable="true"]',
    'div.ql-editor[contenteditable="true"]',
  ],
  commentSubmit: [
    'button.comments-comment-box__submit-button--cr',
    'button.comments-comment-box__submit-button',
  ],
  // Carries the comment's own urn, which is a better id than anything else
  // on the element.
  commentItem: [
    '[componentkey^="replaceableComment_urn:li:comment"]',
    'article.comments-comment-entity',
    'article.comments-comment-item',
  ],
  commentAuthor: ['.comments-comment-meta__description-title', '.comments-post-meta__name-text'],
  commentBody: ['.comments-comment-item__main-content', '.update-components-text'],

  authorNameLegacy: ['.update-components-actor__title span[aria-hidden="true"]', '.update-components-actor__title'],
  authorHeadlineLegacy: [
    '.update-components-actor__description span[aria-hidden="true"]',
    '.update-components-actor__description',
  ],
  timestampLegacy: [
    '.update-components-actor__sub-description span[aria-hidden="true"]',
    '.update-components-actor__sub-description',
  ],
  reactionCountLegacy: ['.social-details-social-counts__reactions-count'],
  commentCountLegacy: ['.social-details-social-counts__comments button'],
  sponsoredBadge: ['[data-testid="sponsored-label"]', '.update-components-actor__sponsored-label'],
  socialProofHeader: ['.update-components-header', '.feed-shared-header'],
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
 * once hidden. Naive textContent yields "Ada LovelaceAda Lovelace".
 */
export function visibleTextOf(root: ParentNode, key: SelectorKey): string {
  const el = queryOne(root, key)
  return el ? cleanText(el) : ''
}

export function cleanText(el: Element): string {
  const aria = el.querySelector(':scope > [aria-hidden="true"]')
  const clone = (aria ?? el).cloneNode(true) as Element
  clone.querySelectorAll('.visually-hidden, [class*="visually-hidden"]').forEach((n) => n.remove())
  return normalizeWhitespace(clone.textContent ?? '')
}

export function normalizeWhitespace(s: string): string {
  return s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * A post's stable identity.
 *
 * Server-driven markup puts a token in componentkey:
 *   "expanded<TOKEN>FeedType_MAIN_FEED_RELEVANCE"
 * Legacy markup has the activity urn. Either way the value is stable for as
 * long as the post is in the DOM, which is all the store needs to merge
 * re-harvests and to find the post again when an action fires.
 */
export function postId(el: Element): string | null {
  const urn = el.getAttribute('data-urn') ?? el.getAttribute('data-id')
  if (urn?.includes('urn:li:')) return urn

  const key = el.getAttribute('componentkey')
  if (key?.startsWith('expanded')) {
    return key.replace(/^expanded/, '').replace(/FeedType_.*$/, '') || key
  }

  const nested = el.querySelector('[data-urn^="urn:li:"], [data-id^="urn:li:"]')
  return nested?.getAttribute('data-urn') ?? nested?.getAttribute('data-id') ?? null
}

/**
 * The new markup has no activity urn, so a permalink cannot be built. Legacy
 * posts still can. Callers must handle null.
 */
export function permalinkFrom(id: string): string | null {
  if (!id.includes('urn:li:')) return null
  const activity = id.split(':').pop() ?? ''
  return `https://www.linkedin.com/feed/update/urn:li:activity:${activity}/`
}
