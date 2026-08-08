import { fail, ok, type Result } from '../lib/result'
import type { DoctorReport, HostFeed, PostAction, RawComment, RawPost } from './types'
import {
  normalizeWhitespace,
  postUrn,
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
 *    virtualisation, lazy image loading and IntersectionObserver-driven
 *    pagination all behave exactly as they do without the extension. Hiding
 *    the feed with `display: none` would have broken all three.
 *
 * 2. We never call LinkedIn's API. Every action is a click on the button a
 *    person would have clicked, which means no CSRF token handling, no
 *    reverse-engineered endpoints, and nothing that looks unlike a human.
 */
export class DomHost implements HostFeed {
  #observer: MutationObserver | null = null
  #lastMissing: string[] = []

  isReady(): boolean {
    return this.#postElements().length > 0
  }

  stage(_hidden: boolean): void {
    // Intentionally a no-op: the overlay covers the page, so there is nothing
    // to hide. Kept on the interface because a future JSON-intercepting host
    // will need to genuinely suppress the native render.
  }

  harvest(): RawPost[] {
    resetSelectorHits()
    const seen = new Set<string>()
    const posts: RawPost[] = []
    const missing = new Set<string>()

    for (const el of this.#postElements()) {
      const urn = postUrn(el)
      if (!urn || seen.has(urn)) continue
      seen.add(urn)
      const post = readPost(el, urn)
      if (!post.authorName) missing.add('authorName')
      if (!post.text && !post.imageUrl && !post.hasVideo) missing.add('body')
      posts.push(post)
    }

    this.#lastMissing = [...missing]
    return posts
  }

  observe(onChange: (posts: RawPost[]) => void): () => void {
    const root = queryOne(document, 'feedRoot') ?? document.body
    let queued = false

    this.#observer = new MutationObserver(() => {
      if (queued) return
      queued = true
      // The feed mutates in bursts while LinkedIn hydrates a page of results.
      // One harvest per animation frame is plenty.
      requestAnimationFrame(() => {
        queued = false
        onChange(this.harvest())
      })
    })

    this.#observer.observe(root, { childList: true, subtree: true })
    return () => {
      this.#observer?.disconnect()
      this.#observer = null
    }
  }

  async loadMore(): Promise<Result<number>> {
    const before = this.#postElements().length

    // LinkedIn paginates when its sentinel enters the viewport. Our overlay
    // scrolls independently, so the window never moves on its own; move it.
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' as ScrollBehavior })

    // Some locales and some A/B buckets show an explicit button instead.
    const showMore = findButtonByText(document, ['show more feed updates', 'показать больше', 'daha fazla'])
    showMore?.click()

    const grew = await waitFor(() => this.#postElements().length > before, 6000)
    if (!grew) return fail('ACTION_TIMEOUT', 'no new posts appeared within 6s')
    return ok(this.#postElements().length - before)
  }

  async act(urn: string, action: PostAction): Promise<Result<void>> {
    const el = this.#postElement(urn)
    if (!el) return fail('POST_GONE', `post ${urn} is no longer in the native feed`)

    switch (action.kind) {
      case 'like':
        return this.#like(el, action.on)
      case 'comment':
        return this.#comment(el, action.text)
      case 'repost':
        return this.#repost(el)
      case 'save':
        return this.#save(el)
    }
  }

  async comments(urn: string): Promise<Result<RawComment[]>> {
    const el = this.#postElement(urn)
    if (!el) return fail('POST_GONE', `post ${urn} is no longer in the native feed`)

    if (queryAll(el, 'commentItem').length === 0) {
      const button = queryOne(el, 'commentButton') as HTMLElement | null
      if (!button) return fail('SELECTOR_MISS', 'comment button not found')
      button.click()
      const appeared = await waitFor(() => queryAll(el, 'commentItem').length > 0, 5000)
      if (!appeared) return fail('ACTION_TIMEOUT', 'comment thread did not load')
    }

    return ok(queryAll(el, 'commentItem').map(readComment))
  }

  doctor(): DoctorReport {
    const root = queryOne(document, 'feedRoot')
    return {
      feedRootFound: Boolean(root),
      postsFound: this.#postElements().length,
      hits: selectorHits(),
      missingFields: this.#lastMissing,
      userAgent: navigator.userAgent,
      extensionVersion:
        typeof chrome !== 'undefined' ? (chrome.runtime?.getManifest?.().version ?? 'unknown') : 'unknown',
    }
  }

  // --- internals ---------------------------------------------------------

  #postElements(): Element[] {
    return queryAll(document, 'post')
  }

  #postElement(urn: string): Element | null {
    return this.#postElements().find((el) => postUrn(el) === urn) ?? null
  }

  async #like(el: Element, on: boolean): Promise<Result<void>> {
    const button = queryOne(el, 'likeButton') as HTMLElement | null
    if (!button) return fail('SELECTOR_MISS', 'like button not found')

    if (isPressed(button) === on) return ok(undefined)
    button.click()

    const flipped = await waitFor(() => isPressed(button) === on, 4000)
    return flipped ? ok(undefined) : fail('ACTION_TIMEOUT', 'LinkedIn did not confirm the reaction')
  }

  async #comment(el: Element, text: string): Promise<Result<void>> {
    if (!text.trim()) return fail('NOT_SUPPORTED', 'empty comment')

    let editor = queryOne(el, 'commentEditor') as HTMLElement | null
    if (!editor) {
      const button = queryOne(el, 'commentButton') as HTMLElement | null
      if (!button) return fail('SELECTOR_MISS', 'comment button not found')
      button.click()
      const appeared = await waitFor(() => Boolean(queryOne(el, 'commentEditor')), 5000)
      if (!appeared) return fail('ACTION_TIMEOUT', 'comment editor did not open')
      editor = queryOne(el, 'commentEditor') as HTMLElement
    }

    // LinkedIn's editor is a Quill contenteditable. It listens for input
    // events, so setting textContent alone is not enough.
    editor.focus()
    editor.textContent = ''
    document.execCommand('insertText', false, text)
    if (normalizeWhitespace(editor.textContent ?? '') !== normalizeWhitespace(text)) {
      editor.textContent = text
      editor.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }))
    }

    const submit = (await waitForElement(() => queryOne(el, 'commentSubmit') as HTMLButtonElement | null, 3000))
    if (!submit) return fail('SELECTOR_MISS', 'comment submit button not found')

    const enabled = await waitFor(() => !submit.disabled, 2000)
    if (!enabled) return fail('ACTION_TIMEOUT', 'LinkedIn kept the submit button disabled')

    submit.click()
    const sent = await waitFor(() => normalizeWhitespace(editor!.textContent ?? '') === '', 6000)
    return sent ? ok(undefined) : fail('ACTION_TIMEOUT', 'comment was not sent')
  }

  async #repost(el: Element): Promise<Result<void>> {
    const trigger = queryOne(el, 'repostButton') as HTMLElement | null
    if (!trigger) return fail('SELECTOR_MISS', 'repost button not found')
    trigger.click()

    // LinkedIn opens a dropdown: "Repost" and "Repost with your thoughts".
    // We want the plain one. It renders in a portal outside the post element.
    const item = await waitForElement(
      () => findButtonByText(document, ['repost', 'поделиться', 'republicar'], ['thoughts', 'мысл']),
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
    const trigger = queryOne(el, 'saveMenuButton') as HTMLElement | null
    if (!trigger) return fail('SELECTOR_MISS', 'control menu button not found')
    trigger.click()

    const item = await waitForElement(() => findButtonByText(document, ['save', 'unsave', 'сохранить']), 3000)
    if (!item) {
      document.body.click()
      return fail('NOT_SUPPORTED', 'save item not found in the control menu')
    }
    item.click()
    return ok(undefined)
  }
}

// --- reading -------------------------------------------------------------

function readPost(el: Element, urn: string): RawPost {
  const bodyEl = queryOne(el, 'body')
  const avatar = queryOne(el, 'authorAvatar') as HTMLImageElement | null
  const image = queryOne(el, 'image') as HTMLImageElement | null
  const authorLink = queryOne(el, 'authorLink') as HTMLAnchorElement | null
  const likeButton = queryOne(el, 'likeButton') as HTMLElement | null
  const description = visibleTextOf(el, 'authorHeadline')
  const header = visibleTextOf(el, 'socialProofHeader')

  return {
    urn,
    authorName: visibleTextOf(el, 'authorName'),
    authorHeadline: description,
    authorUrl: authorLink?.href ?? '',
    avatarUrl: avatar?.src ?? '',
    timeLabel: firstTimeToken(visibleTextOf(el, 'timestamp')),
    text: bodyEl ? cleanBodyText(bodyEl) : '',
    imageUrl: image?.src ?? null,
    hasVideo: Boolean(queryOne(el, 'video')),
    linkTitle: queryOne(el, 'articleCard') ? visibleTextOf(el, 'articleCard') || null : null,
    reactions: parseCount(visibleTextOf(el, 'reactionCount')),
    comments: parseCount(visibleTextOf(el, 'commentCount')),
    reposts: parseCount(visibleTextOf(el, 'repostCount')),
    liked: likeButton ? isPressed(likeButton) : false,
    markers: {
      hasSponsoredBadge: Boolean(queryOne(el, 'sponsoredBadge')),
      descriptionText: description,
      headerText: header,
      hasActionBar: Boolean(likeButton),
    },
  }
}

function readComment(el: Element): RawComment {
  const avatar = el.querySelector('img') as HTMLImageElement | null
  return {
    id: el.getAttribute('data-id') ?? el.getAttribute('id') ?? Math.random().toString(36).slice(2),
    authorName: visibleTextOf(el, 'commentAuthor'),
    authorHeadline: '',
    avatarUrl: avatar?.src ?? '',
    text: visibleTextOf(el, 'commentBody'),
    timeLabel: '',
  }
}

/** Strips LinkedIn's "…see more" toggle, which is inside the text node. */
export function cleanBodyText(bodyEl: Element): string {
  const clone = bodyEl.cloneNode(true) as Element
  clone.querySelectorAll('button, .visually-hidden, [class*="see-more-less"]').forEach((n) => n.remove())
  return (clone.textContent ?? '')
    .replace(/ /g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** "1,234", "1.2K", "1 234", "12 тыс." -> a number. Unparseable -> 0. */
export function parseCount(raw: string): number {
  if (!raw) return 0
  const match = raw.match(/([\d.,\s ]+)\s*([KMkmтыстысмлн]*)/u)
  if (!match) return 0
  const digits = (match[1] ?? '').replace(/[\s ]/g, '')
  const suffix = (match[2] ?? '').toLowerCase()

  // "1,234" is a thousands separator; "1.2K" is a decimal point.
  const numeric = suffix ? Number(digits.replace(',', '.')) : Number(digits.replace(/[.,]/g, ''))
  if (!Number.isFinite(numeric)) return 0

  if (suffix.startsWith('k') || suffix.startsWith('тыс')) return Math.round(numeric * 1_000)
  if (suffix.startsWith('m') || suffix.startsWith('млн')) return Math.round(numeric * 1_000_000)
  return Math.round(numeric)
}

/** LinkedIn's sub-description is "3h • Edited • Visible to anyone". Keep "3h". */
export function firstTimeToken(raw: string): string {
  return normalizeWhitespace((raw.split(/[•·]/)[0] ?? '').trim())
}

function isPressed(button: Element): boolean {
  if (button.getAttribute('aria-pressed') === 'true') return true
  return /--active|is-active|active\b/.test(button.className || '')
}

// --- waiting -------------------------------------------------------------

function findButtonByText(
  root: ParentNode,
  include: string[],
  exclude: string[] = [],
): HTMLElement | null {
  const candidates = root.querySelectorAll<HTMLElement>('button, [role="menuitem"], [role="button"]')
  for (const el of candidates) {
    if (!isVisible(el)) continue
    const text = normalizeWhitespace(`${el.textContent ?? ''} ${el.getAttribute('aria-label') ?? ''}`).toLowerCase()
    if (!text) continue
    if (exclude.some((x) => text.includes(x))) continue
    if (include.some((x) => text.includes(x))) return el
  }
  return null
}

function isVisible(el: HTMLElement): boolean {
  return el.offsetParent !== null || el.getClientRects().length > 0
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
