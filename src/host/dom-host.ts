import { fail, ok, type Result } from '../lib/result'
import { throttle } from '../lib/throttle'
import type { DoctorReport, HostFeed, PostAction, RawComment, RawPost } from './types'
import {
  cleanText,
  normalizeWhitespace,
  postId,
  queryAll,
  queryOne,
  resetSelectorHits,
  selectorHits,
  visibleTextOf,
} from './selectors'

/**
 * Reads LinkedIn's own feed and drives LinkedIn's own controls.
 *
 * Two decisions worth knowing about:
 *
 * 1. We never modify LinkedIn's DOM or CSS. Our timeline is a fixed, opaque
 *    overlay drawn on top. The native feed keeps its normal layout, so its
 *    virtualisation, lazy image loading and pagination all behave exactly as
 *    they do without the extension.
 *
 * 2. We never call LinkedIn's API. Every action is a click on the button a
 *    person would have clicked, so there is no CSRF token handling and no
 *    reverse-engineered endpoint.
 *
 * The server-driven markup gives us almost nothing to match on: class names
 * are content hashes, and the only stable handles are a few `data-testid`
 * values, `componentkey`, and `aria-label` prefixes. So reading a post is
 * mostly structural: walk the leaf text nodes in document order and work out
 * what each one is. That is uglier than a selector per field, but it survives
 * a deploy, which a hashed class name does not.
 */
/** How often a mutation storm is allowed to trigger a re-parse. */
const HARVEST_EVERY_MS = 250

export class DomHost implements HostFeed {
  #observer: MutationObserver | null = null
  #lastMissing: string[] = []
  /** Parsed posts, keyed by id and a cheap signature of the source element. */
  #cache = new Map<string, { signature: string; post: RawPost }>()

  isReady(): boolean {
    return this.#postElements().length > 0
  }

  stage(_hidden: boolean): void {
    // Intentionally a no-op: the overlay covers the page, so there is nothing
    // to hide. Kept on the interface because a JSON-intercepting host would
    // need to genuinely suppress the native render.
  }

  harvest(): RawPost[] {
    resetSelectorHits()
    const seen = new Set<string>()
    const posts: RawPost[] = []
    const missing = new Set<string>()

    for (const el of this.#postElements()) {
      const id = postId(el)
      if (!id || seen.has(id)) continue
      seen.add(id)

      // Re-parsing an unchanged post is the bulk of a harvest, and most posts
      // are unchanged in any given mutation burst.
      const signature = signatureOfElement(el)
      const cached = this.#cache.get(id)
      const post =
        cached?.signature === signature
          ? cached.post
          : isLegacy(el)
            ? readLegacyPost(el, id)
            : readSduiPost(el, id)
      this.#cache.set(id, { signature, post })

      if (!post.authorName) missing.add('authorName')
      if (!post.text && !post.imageUrl && !post.hasVideo) missing.add('body')
      posts.push(post)
    }

    this.#lastMissing = [...missing]
    // Anything no longer on the page cannot come back with the same id.
    if (this.#cache.size > seen.size * 2) {
      for (const key of this.#cache.keys()) if (!seen.has(key)) this.#cache.delete(key)
    }
    return posts
  }

  observe(onChange: (posts: RawPost[]) => void): () => void {
    // Deliberately the document element, not the feed container. LinkedIn
    // hydrates the feed after document_idle and swaps whole subtrees while it
    // does, so an observer bound to the container found at start-up ends up
    // watching a node that is no longer in the document and never fires again.
    //
    // This does not loop on our own renders: the timeline lives in a shadow
    // root, and a MutationObserver on the host document does not see inside
    // shadow trees.
    //
    // Throttled rather than per-frame. LinkedIn mutates constantly, and one
    // full re-parse per animation frame on a real feed is most of the cost
    // this extension adds to the page.
    const pump = throttle(() => onChange(this.harvest()), HARVEST_EVERY_MS)

    this.#observer = new MutationObserver(pump.call)
    this.#observer.observe(document.documentElement, { childList: true, subtree: true })

    return () => {
      pump.cancel()
      this.#observer?.disconnect()
      this.#observer = null
    }
  }

  async loadMore(): Promise<Result<number>> {
    const before = this.#postElements().length

    // LinkedIn paginates when its sentinel enters its scroll port. Our overlay
    // scrolls independently, so nothing moves underneath us unless we move it.
    //
    // It is not the window: LinkedIn sets `overflow: hidden` on body and does
    // its own scrolling inside `main`, so `window.scrollTo` is a silent no-op
    // and the feed never asks for another page.
    const scroller = this.#scroller()
    if (scroller instanceof Element) scroller.scrollTop = scroller.scrollHeight
    else window.scrollTo({ top: document.documentElement.scrollHeight })

    const showMore = findClickableByText(document, ['show more feed updates', 'показать больше', 'daha fazla'])
    showMore?.click()

    const grew = await waitFor(() => this.#postElements().length > before, 6000)
    if (!grew) return fail('ACTION_TIMEOUT', 'no new posts appeared within 6s')
    return ok(this.#postElements().length - before)
  }

  async act(id: string, action: PostAction): Promise<Result<void>> {
    const el = this.#postElement(id)
    if (!el) return fail('POST_GONE', `post ${id} is no longer in the native feed`)

    switch (action.kind) {
      case 'like':
        return this.#like(el, action.on)
      case 'react':
        return this.#react(el, action.reaction)
      case 'comment':
        return this.#comment(el, action.text)
      case 'repost':
        return this.#repost(el)
      case 'save':
        return this.#save(el)
    }
  }

  async comments(id: string): Promise<Result<RawComment[]>> {
    const el = this.#postElement(id)
    if (!el) return fail('POST_GONE', `post ${id} is no longer in the native feed`)

    if (queryAll(el, 'commentItem').length === 0) {
      const button = findClickableByText(el, COMMENT_WORDS)
      if (!button) return fail('SELECTOR_MISS', 'comment button not found')
      button.click()
      const appeared = await waitFor(() => queryAll(el, 'commentItem').length > 0, 5000)
      if (!appeared) return fail('ACTION_TIMEOUT', 'comment thread did not load')
    }

    return ok(queryAll(el, 'commentItem').map(readComment))
  }

  doctor(): DoctorReport {
    const root = queryOne(document, 'feedRoot')
    const posts = this.#postElements()
    return {
      feedRootFound: Boolean(root),
      postsFound: posts.length,
      scrollerFound: this.#scroller() !== window,
      generation: posts[0] ? (isLegacy(posts[0]) ? 'legacy' : 'sdui') : 'unknown',
      listItemsInFeed: root ? root.querySelectorAll('[role="listitem"]').length : 0,
      hits: selectorHits(),
      missingFields: this.#lastMissing,
      userAgent: navigator.userAgent,
      extensionVersion:
        typeof chrome !== 'undefined' ? (chrome.runtime?.getManifest?.().version ?? 'unknown') : 'unknown',
    }
  }

  // --- internals ---------------------------------------------------------

  /**
   * The element that actually scrolls the feed. Found by walking up from the
   * feed root rather than hard-coded, so it survives LinkedIn moving it.
   */
  #scroller(): Element | Window {
    let el = queryOne(document, 'feedRoot')
    while (el && el !== document.documentElement) {
      const style = getComputedStyle(el)
      if (/auto|scroll/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 20) return el
      el = el.parentElement
    }
    return window
  }

  #postElements(): Element[] {
    const root = queryOne(document, 'feedRoot') ?? document
    // The server-driven feed puts person suggestions and module cards in the
    // same list as posts. A control menu is what tells them apart, in every
    // locale, without matching on any word.
    const sdui = queryAll(root, 'post').filter((el) => queryOne(el, 'controlMenu'))
    if (sdui.length > 0) return sdui
    return queryAll(root, 'postLegacy')
  }

  #postElement(id: string): Element | null {
    return this.#postElements().find((el) => postId(el) === id) ?? null
  }

  async #like(el: Element, on: boolean): Promise<Result<void>> {
    const button = queryOne(el, 'likeButton') as HTMLElement | null
    if (!button) return fail('SELECTOR_MISS', 'like button not found')

    if (isLiked(button) === on) return ok(undefined)
    button.click()

    const flipped = await waitFor(() => isLiked(button) === on, 4000)
    return flipped ? ok(undefined) : fail('ACTION_TIMEOUT', 'LinkedIn did not confirm the reaction')
  }

  /**
   * Leaves a named reaction rather than a plain Like.
   *
   * The six options live in a menu LinkedIn opens next to the post, rendered
   * in a portal outside it, each an unlabelled button whose aria-label is the
   * reaction's name. So: open the menu, find the name, click it.
   */
  async #react(el: Element, reaction: string): Promise<Result<void>> {
    const opener = queryOne(el, 'reactionsMenu') as HTMLElement | null
    if (!opener) return fail('NOT_SUPPORTED', 'this post has no reactions menu')
    opener.click()

    const option = await waitForElement(
      () =>
        [...document.querySelectorAll('button, [role="menuitem"]')].find(
          (b) => (b.getAttribute('aria-label') ?? '').toLowerCase() === reaction.toLowerCase(),
        ) as HTMLElement | null,
      3000,
    )
    if (!option) {
      document.body.click()
      return fail('SELECTOR_MISS', `no "${reaction}" in the reactions menu`)
    }

    option.click()
    const button = queryOne(el, 'likeButton')
    const confirmed = await waitFor(() => Boolean(button && reactionOf(button)), 4000)
    return confirmed ? ok(undefined) : fail('ACTION_TIMEOUT', 'LinkedIn did not confirm the reaction')
  }

  async #comment(el: Element, text: string): Promise<Result<void>> {
    if (!text.trim()) return fail('NOT_SUPPORTED', 'empty comment')

    let editor = queryOne(el, 'commentEditor') as HTMLElement | null
    if (!editor) {
      const button = findClickableByText(el, COMMENT_WORDS)
      if (!button) return fail('SELECTOR_MISS', 'comment button not found')
      button.click()
      const appeared = await waitFor(() => Boolean(queryOne(el, 'commentEditor')), 5000)
      if (!appeared) return fail('ACTION_TIMEOUT', 'comment editor did not open')
      editor = queryOne(el, 'commentEditor') as HTMLElement
    }

    // LinkedIn's editor is a Quill contenteditable that listens for input
    // events, so assigning textContent alone is not enough.
    editor.focus()
    editor.textContent = ''
    document.execCommand('insertText', false, text)
    if (normalizeWhitespace(editor.textContent ?? '') !== normalizeWhitespace(text)) {
      editor.textContent = text
      editor.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }))
    }

    // The send control only appears once the editor has content, and in the
    // server-driven markup it is an unlabelled button reading "Comment" —
    // same word as the post's own action. Scoping to the comment box is what
    // keeps us from clicking the wrong one and reopening the thread.
    const box = queryOne(el, 'commentBox') ?? el
    const submit = await waitForElement(
      () => (queryOne(box, 'commentSubmit') ?? findClickableByText(box, SUBMIT_WORDS)) as HTMLButtonElement | null,
      3000,
    )
    if (!submit) return fail('SELECTOR_MISS', 'comment submit button not found')

    const enabled = await waitFor(() => !submit.disabled, 2000)
    if (!enabled) return fail('ACTION_TIMEOUT', 'LinkedIn kept the submit button disabled')

    submit.click()
    const sent = await waitFor(() => normalizeWhitespace(editor!.textContent ?? '') === '', 6000)
    return sent ? ok(undefined) : fail('ACTION_TIMEOUT', 'comment was not sent')
  }

  async #repost(el: Element): Promise<Result<void>> {
    const trigger = findClickableByText(el, REPOST_WORDS)
    if (!trigger) return fail('SELECTOR_MISS', 'repost button not found')
    trigger.click()

    // LinkedIn opens a menu with "Repost" and "Repost with your thoughts". We
    // want the plain one, and it renders in a portal outside the post.
    const item = await waitForElement(
      () => findClickableByText(document, REPOST_WORDS, ['thoughts', 'мысл']),
      3000,
    )
    if (!item) {
      document.body.click() // close the menu we opened
      return fail('NOT_SUPPORTED', 'plain repost item not found in the menu')
    }
    item.click()
    return ok(undefined)
  }

  async #save(el: Element): Promise<Result<void>> {
    const trigger = queryOne(el, 'controlMenu') as HTMLElement | null
    if (!trigger) return fail('SELECTOR_MISS', 'control menu button not found')
    trigger.click()

    const item = await waitForElement(() => findClickableByText(document, SAVE_WORDS), 3000)
    if (!item) {
      document.body.click()
      return fail('NOT_SUPPORTED', 'save item not found in the control menu')
    }
    item.click()
    return ok(undefined)
  }
}

// --- reading the server-driven markup -----------------------------------

const DEGREE = /^[•·]?\s*(1st|2nd|3rd|1-я|2-я|3-я|•)\+?\s*$/i
const TIME = /^\d+\s*(s|m|h|d|w|mo|y|сек|мин|ч|д|нед|мес|г)\b|^\d+\s*(second|minute|hour|day|week|month|year)/i

/**
 * Reads a post by walking its leaf text nodes in document order.
 *
 * The author block always emits, in this order: name, connection degree,
 * headline, age. Body text carries its own testid, so it is easy to exclude.
 * Everything left over after removing the knowns is the headline.
 */
function readSduiPost(el: Element, id: string): RawPost {
  const bodyEl = queryOne(el, 'body')
  const avatar = queryOne(el, 'authorAvatar') as HTMLImageElement | null
  const image = queryOne(el, 'image') as HTMLImageElement | null
  const likeButton = queryOne(el, 'likeButton') as HTMLElement | null
  const control = queryOne(el, 'controlMenu')

  const links = queryAll(el, 'authorLink') as HTMLAnchorElement[]

  // Picking the first link with text gets the wrong person whenever LinkedIn
  // prefixes a post with social proof ("Dimitris and 5 others follow this
  // Page") — those connections are linked before the actual author. The link
  // that shares the avatar's href is the author's, in every locale.
  const avatarHref = avatar?.closest('a')?.getAttribute('href') ?? ''
  const namedLink =
    (avatarHref ? links.find((a) => a.getAttribute('href') === avatarHref && cleanText(a)) : undefined) ??
    links.find((a) => cleanText(a).length > 0) ??
    null

  const leaves = leafTexts(el, bodyEl)
  const nameFromLink = namedLink ? (leafTexts(namedLink, null)[0] ?? '') : ''
  const nameFromControl = afterPrefix(control?.getAttribute('aria-label') ?? '', ['post by ', 'пост от '])
  const nameFromAvatar = betweenPrefixSuffix(avatar?.alt ?? '', 'View ', ['’s profile', "'s profile"])
  const authorName = nameFromLink || nameFromControl || nameFromAvatar

  const timeLabel = leaves.find((t) => TIME.test(t)) ?? ''

  // On a repost the reposter's name sits between the original author and the
  // headline, so any text that is itself a profile link has to be skipped.
  const linkNames = new Set(links.map((a) => leafTexts(a, null)[0] ?? '').filter(Boolean))
  const headline = headlineAfterName(leaves, authorName, timeLabel, linkNames)

  return {
    id,
    authorName,
    authorHeadline: headline,
    authorUrl: namedLink?.href ?? links[0]?.href ?? '',
    avatarUrl: avatar?.src ?? '',
    timeLabel: firstTimeToken(timeLabel),
    text: bodyEl ? cleanBodyText(bodyEl) : '',
    imageUrl: image?.src ?? null,
    hasVideo: Boolean(queryOne(el, 'video')),
    linkTitle: queryOne(el, 'document') ? 'document' : null,
    reactions: countFrom(leaves, REACTION_WORDS, true),
    comments: countFrom(leaves, COMMENT_COUNT_WORDS, false),
    reposts: countFrom(leaves, REPOST_COUNT_WORDS, false),
    liked: likeButton ? isLiked(likeButton) : false,
    reaction: likeButton ? reactionOf(likeButton) : '',
    markers: {
      hasSponsoredBadge: Boolean(queryOne(el, 'sponsoredBadge')),
      // "Promoted" sits as a plain leaf in the actor block, so the first few
      // leaves are where every noise marker shows up.
      descriptionText: leaves.slice(0, 12).join(' · '),
      headerText: leaves.slice(0, 3).join(' · '),
      hasActionBar: Boolean(likeButton),
    },
  }
}

function readLegacyPost(el: Element, id: string): RawPost {
  const bodyEl = queryOne(el, 'body')
  const avatar = queryOne(el, 'authorAvatar') as HTMLImageElement | null
  const image = queryOne(el, 'image') as HTMLImageElement | null
  const authorLink = queryOne(el, 'authorLink') as HTMLAnchorElement | null
  const likeButton = queryOne(el, 'likeButton') as HTMLElement | null
  const description = visibleTextOf(el, 'authorHeadlineLegacy')
  const header = visibleTextOf(el, 'socialProofHeader')

  return {
    id,
    authorName: visibleTextOf(el, 'authorNameLegacy'),
    authorHeadline: description,
    authorUrl: authorLink?.href ?? '',
    avatarUrl: avatar?.src ?? '',
    timeLabel: firstTimeToken(visibleTextOf(el, 'timestampLegacy')),
    text: bodyEl ? cleanBodyText(bodyEl) : '',
    imageUrl: image?.src ?? null,
    hasVideo: Boolean(queryOne(el, 'video')),
    linkTitle: null,
    reactions: parseCount(visibleTextOf(el, 'reactionCountLegacy')),
    comments: parseCount(visibleTextOf(el, 'commentCountLegacy')),
    reposts: 0,
    liked: likeButton ? isLiked(likeButton) : false,
    reaction: likeButton ? reactionOf(likeButton) : '',
    markers: {
      hasSponsoredBadge: Boolean(queryOne(el, 'sponsoredBadge')),
      descriptionText: description,
      headerText: header,
      hasActionBar: Boolean(likeButton),
    },
  }
}

function readComment(el: Element): RawComment {
  const avatar = queryOne(el, 'authorAvatar') as HTMLImageElement | null
  const links = queryAll(el, 'authorLink') as HTMLAnchorElement[]
  const avatarHref = avatar?.closest('a')?.getAttribute('href') ?? ''
  const named =
    (avatarHref ? links.find((a) => a.getAttribute('href') === avatarHref && cleanText(a)) : undefined) ??
    links.find((a) => cleanText(a).length > 0) ??
    null

  const leaves = leafTexts(el, null)
  const authorName = named ? (leafTexts(named, null)[0] ?? '') : ''
  const timeLabel = leaves.find((t) => TIME.test(t)) ?? ''

  // The comment body is the one long piece of prose; everything else in a
  // comment is a name, a badge, a follower count or a reaction tally.
  const text =
    leaves
      .filter(
        (t) =>
          t !== authorName &&
          t !== timeLabel &&
          !isCounter(t) &&
          !ACTION_WORDS.has(t.toLowerCase()) &&
          t.length > 2,
      )
      .sort((a, b) => b.length - a.length)[0] ?? ''

  return {
    id:
      el.getAttribute('componentkey')?.replace('replaceableComment_', '') ??
      el.getAttribute('data-id') ??
      el.getAttribute('id') ??
      `${authorName}:${text.slice(0, 24)}`,
    authorName,
    authorHeadline: headlineAfterName(leaves, authorName, timeLabel),
    avatarUrl: avatar?.src ?? '',
    text,
    timeLabel: firstTimeToken(timeLabel),
  }
}

/**
 * Changes cheaply enough to test on every burst, and covers everything the UI
 * shows: the post's own length, and the state of its reaction control.
 */
function signatureOfElement(el: Element): string {
  const like = queryOne(el, 'likeButton')?.getAttribute('aria-label') ?? ''
  const body = queryOne(el, 'body')?.textContent?.length ?? 0
  return `${el.childElementCount}:${body}:${like}`
}

const isLegacy = (el: Element): boolean => el.hasAttribute('data-urn') || el.hasAttribute('data-id')

/**
 * Every element's own text, in document order, minus the post body.
 *
 * Deliberately reads each element's direct child text nodes rather than its
 * childless descendants: LinkedIn writes the post age as `9h •` alongside a
 * visibility icon in the same span, so that span has an element child and a
 * "childless elements only" walk would miss the timestamp entirely.
 */
export function leafTexts(root: Element, exclude: Element | null): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const el of [root, ...root.querySelectorAll('*')]) {
    if (exclude && (exclude === el || exclude.contains(el))) continue
    const own = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent ?? '')
      .join(' ')
    const text = normalizeWhitespace(own)
    if (!text || seen.has(text)) continue // LinkedIn duplicates strings for screen readers
    seen.add(text)
    out.push(text)
  }
  return out
}

// Word lists. LinkedIn serves the UI in the member's locale, so anything
// matched by text needs an entry per language. Add yours and send a PR.
const REACTION_WORDS = ['reacted', 'others', 'reactions', 'реакц', 'отреагировал', 'ұнатты']
const COMMENT_COUNT_WORDS = ['comment', 'комментар', 'пікір']
const REPOST_COUNT_WORDS = ['repost', 'repub', 'репост', 'поделил']
const COMMENT_WORDS = ['comment', 'комментировать', 'пікір']
const REPOST_WORDS = ['repost', 'репост', 'поделиться']
const SUBMIT_WORDS = ['comment', 'reply', 'post', 'отправить', 'ответить']
const SAVE_WORDS = ['save', 'unsave', 'сохранить', 'сақтау']
// Chrome strings that appear as leaves in the actor block and must never be
// mistaken for a headline.
const ACTION_WORDS = new Set([
  'like', 'comment', 'repost', 'send', 'follow', 'following', 'feed post',
  'show translation', 'see translation', 'нравится', 'комментировать', 'подписаться',
])

/**
 * The headline is whatever LinkedIn prints right after the author's name,
 * once the connection badge is skipped: a job title for a person, a follower
 * count for a company Page.
 *
 * Taking the longest leaf instead looks tempting and is wrong: a post with a
 * document attachment carries strings like "Want to view more? Unlock the
 * full document below." that beat any real headline on length.
 */
export function headlineAfterName(
  leaves: string[],
  name: string,
  time: string,
  linkNames: ReadonlySet<string> = new Set(),
): string {
  const skip = (t: string): boolean =>
    DEGREE.test(t) || isCounter(t) || ACTION_WORDS.has(t.toLowerCase()) || linkNames.has(t) || t.length <= 2

  const start = leaves.indexOf(name)
  if (start >= 0) {
    for (const t of leaves.slice(start + 1)) {
      if (t === time || TIME.test(t)) break // past the actor block
      if (skip(t)) continue
      return t
    }
    return ''
  }

  // The name came from an aria-label rather than a leaf. Degrade to the
  // longest plausible leaf rather than showing nothing.
  return leaves.filter((t) => t !== time && !skip(t)).sort((a, b) => b.length - a.length)[0] ?? ''
}

const isCounter = (t: string): boolean =>
  /\d/.test(t) && [...REACTION_WORDS, ...COMMENT_COUNT_WORDS, ...REPOST_COUNT_WORDS].some((w) => t.toLowerCase().includes(w))

/**
 * Counters read as sentences now: "Ada and 82 others reacted", "25 comments",
 * "1 repost". The `plusOne` flag covers the reaction phrasing, where the
 * named person is not included in the number.
 */
export function countFrom(leaves: string[], words: string[], plusOne: boolean): number {
  const line = leaves.find((t) => /\d/.test(t) && words.some((w) => t.toLowerCase().includes(w)))
  if (!line) return 0
  const n = parseCount(line)
  if (n === 0) return 0
  return plusOne && /\band\b|\bи\b|others?|другие/i.test(line) ? n + 1 : n
}

/** "1,234", "1.2K", "1 234", "and 82 others" -> a number. Unparseable -> 0. */
export function parseCount(raw: string): number {
  if (!raw) return 0
  const match = raw.match(/([\d]+(?:[.,\s ]\d+)*)\s*([KMkmтыстысмлн]*)/u)
  if (!match) return 0
  const digits = (match[1] ?? '').replace(/[\s ]/g, '')
  const suffix = (match[2] ?? '').toLowerCase()

  // "1,234" is a thousands separator; "1.2K" is a decimal point.
  const numeric = suffix ? Number(digits.replace(',', '.')) : Number(digits.replace(/[.,]/g, ''))
  if (!Number.isFinite(numeric)) return 0

  if (suffix.startsWith('k') || suffix.startsWith('тыс')) return Math.round(numeric * 1_000)
  if (suffix.startsWith('m') || suffix.startsWith('млн')) return Math.round(numeric * 1_000_000)
  return Math.round(numeric)
}

/** "9h •" and "3h • Edited • Visible to anyone" both become "9h" / "3h". */
export function firstTimeToken(raw: string): string {
  return normalizeWhitespace((raw.split(/[•·]/)[0] ?? '').trim())
}

/**
 * The post's text, with its paragraphs intact.
 *
 * LinkedIn separates paragraphs with `<br>` rather than block elements, and
 * `textContent` drops those, which runs every paragraph of a long post into
 * one wall of prose. So the breaks are turned into real newlines first.
 */
export function cleanBodyText(bodyEl: Element): string {
  const clone = bodyEl.cloneNode(true) as Element
  clone
    .querySelectorAll('button, [data-testid="expandable-text-button"], .visually-hidden, [class*="see-more-less"]')
    .forEach((n) => n.remove())

  // Mark the breaks, collapse everything else, then restore them. Turning
  // <br> straight into "\n" is not enough: newlines in the HTML source are
  // just formatting and would become paragraph breaks that were never there.
  const MARK = '\u0000br\u0000'
  clone.querySelectorAll('br').forEach((br) => br.replaceWith(MARK))

  return (clone.textContent ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .split(MARK)
    .map((part) => part.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * The reaction state lives in the button's label, not in aria-pressed:
 * "Reaction button state: no reaction" when untouched, the reaction's name
 * when set.
 */
/**
 * The reaction's name, read out of the button's own label:
 * "Reaction button state: Celebrate". Empty when the viewer left none.
 */
export function reactionOf(button: Element): string {
  const label = button.getAttribute('aria-label') ?? ''
  const match = label.match(/reaction button state:\s*(.+)$/i)
  const value = normalizeWhitespace(match?.[1] ?? '')
  return /^(no reaction|none|нет реакции)$/i.test(value) ? '' : value
}

export function isLiked(button: Element): boolean {
  const label = (button.getAttribute('aria-label') ?? '').toLowerCase()
  if (label.includes('reaction button state')) {
    return !/no reaction|none|нет реакции/.test(label)
  }
  if (button.getAttribute('aria-pressed') === 'true') return true
  return /--active|is-active|active\b/.test(button.className || '')
}

function afterPrefix(text: string, prefixes: string[]): string {
  for (const p of prefixes) {
    const i = text.indexOf(p)
    if (i >= 0) return text.slice(i + p.length).trim()
  }
  return ''
}

function betweenPrefixSuffix(text: string, prefix: string, suffixes: string[]): string {
  if (!text.startsWith(prefix)) return ''
  let rest = text.slice(prefix.length)
  for (const s of suffixes) if (rest.endsWith(s)) rest = rest.slice(0, -s.length)
  return rest.trim()
}

// --- clicking and waiting ------------------------------------------------

function findClickableByText(root: ParentNode, include: string[], exclude: string[] = []): HTMLElement | null {
  const candidates = root.querySelectorAll<HTMLElement>('button, a, [role="menuitem"], [role="button"]')
  for (const el of candidates) {
    const text = normalizeWhitespace(
      `${el.textContent ?? ''} ${el.getAttribute('aria-label') ?? ''}`,
    ).toLowerCase()
    if (!text) continue
    if (exclude.some((x) => text.includes(x))) continue
    if (include.some((x) => text.includes(x))) return el
  }
  return null
}

export function waitFor(predicate: () => boolean, timeoutMs: number): Promise<boolean> {
  if (predicate()) return Promise.resolve(true)
  return new Promise((resolve) => {
    const started = performance.now()
    const tick = () => {
      if (predicate()) return resolve(true)
      if (performance.now() - started > timeoutMs) return resolve(false)
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}

async function waitForElement<T>(get: () => T | null, timeoutMs: number): Promise<T | null> {
  let found: T | null = get()
  if (found) return found
  await waitFor(() => {
    found = get()
    return Boolean(found)
  }, timeoutMs)
  return found
}
