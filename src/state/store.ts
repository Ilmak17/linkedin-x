import { computed, signal } from '@preact/signals'
import { shouldShow } from '../filter/classify'
import type { HostFeed, PostAction } from '../host/types'
import { normalize, type Post } from '../model/post'
import { DEFAULTS, type AppSettings } from '../lib/settings'
import { signatureOf } from '../lib/throttle'

/**
 * All application state. Owns optimistic updates and the kill switch; knows
 * nothing about LinkedIn beyond the HostFeed interface it is handed.
 */

export type Toast = { id: number; text: string; bad: boolean }

export const settings = signal<AppSettings>(DEFAULTS)
export const allPosts = signal<Post[]>([])
export const loadingMore = signal(false)
/** True while the feed is still hydrating, so the UI shows skeletons not an empty state. */
export const warmingUp = signal(true)
/** Set once LinkedIn has stopped sending pages, so we stop asking. */
export const exhausted = signal(false)
export const toasts = signal<Toast[]>([])
export const openThread = signal<string | null>(null)

/**
 * Set when the host can see a native feed but we failed to read anything out
 * of it. The UI steps aside and shows LinkedIn instead of a blank screen.
 */
export const brokenReason = signal<string | null>(null)

export const visiblePosts = computed(() =>
  allPosts.value.filter((p) => shouldShow(p.kind, settings.value)),
)

export const hiddenCount = computed(() => allPosts.value.length - visiblePosts.value.length)

let host: HostFeed
let toastId = 0

export function attachHost(h: HostFeed): void {
  host = h
}

let lastSignature = ''

export function ingest(raws: Parameters<typeof normalize>[0][]): void {
  // The observer fires on every LinkedIn mutation, and assigning a new array
  // each time re-rendered the whole timeline whether or not anything had
  // changed. Most bursts change nothing we display.
  const signature = signatureOf(raws)
  if (signature === lastSignature) return
  lastSignature = signature

  const incoming = raws.map(normalize)
  const byId = new Map(allPosts.value.map((p) => [p.id, p]))

  for (const post of incoming) {
    const existing = byId.get(post.id)
    // Keep our optimistic viewer state: a re-harvest mid-flight would
    // otherwise flip a like back the moment the user pressed it.
    byId.set(post.id, existing ? { ...post, viewer: existing.viewer } : post)
  }

  // Preserve LinkedIn's ordering, which is the ordering it just rendered.
  const order = new Map(incoming.map((p, i) => [p.id, i]))
  allPosts.value = [...byId.values()].sort(
    (a, b) => (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER),
  )

  if (allPosts.value.length > 0) brokenReason.value = null
}

export function markBroken(reason: string): void {
  brokenReason.value = reason
}

function patch(id: string, fn: (p: Post) => Post): void {
  allPosts.value = allPosts.value.map((p) => (p.id === id ? fn(p) : p))
}

export function toast(text: string, bad = true): void {
  const t = { id: ++toastId, text, bad }
  toasts.value = [...toasts.value, t]
  setTimeout(() => {
    toasts.value = toasts.value.filter((x) => x.id !== t.id)
  }, 4000)
}

/**
 * Applies the change immediately, then asks the host to make it real. If the
 * host cannot confirm, the change is rolled back and the user is told why.
 */
async function optimistic(
  id: string,
  apply: (p: Post) => Post,
  revert: (p: Post) => Post,
  action: PostAction,
  failureText: string,
): Promise<void> {
  patch(id, apply)
  const result = await host.act(id, action)
  if (!result.ok) {
    patch(id, revert)
    toast(`${failureText} (${result.error.code})`)
  }
}

export function toggleLike(post: Post): void {
  const next = !post.viewer.liked
  const delta = next ? 1 : -1
  void optimistic(
    post.id,
    (p) => ({
      ...p,
      viewer: { ...p.viewer, liked: next, reaction: next ? p.viewer.reaction || 'Like' : '' },
      stats: { ...p.stats, reactions: Math.max(0, p.stats.reactions + delta) },
    }),
    (p) => ({
      ...p,
      viewer: { ...p.viewer, liked: !next, reaction: !next ? 'Like' : '' },
      stats: { ...p.stats, reactions: Math.max(0, p.stats.reactions - delta) },
    }),
    { kind: 'like', on: next },
    next ? 'Could not like this post' : 'Could not remove the reaction',
  )
}

/** Leaves one of LinkedIn's six named reactions. */
export function react(post: Post, reaction: string): void {
  const had = post.viewer.liked
  void optimistic(
    post.id,
    (p) => ({
      ...p,
      viewer: { ...p.viewer, liked: true, reaction },
      stats: { ...p.stats, reactions: p.stats.reactions + (had ? 0 : 1) },
    }),
    (p) => ({
      ...p,
      viewer: { ...p.viewer, liked: had, reaction: had ? p.viewer.reaction : '' },
      stats: { ...p.stats, reactions: Math.max(0, p.stats.reactions - (had ? 0 : 1)) },
    }),
    { kind: 'react', reaction },
    `Could not react with ${reaction}`,
  )
}

export function toggleSave(post: Post): void {
  const next = !post.viewer.saved
  void optimistic(
    post.id,
    (p) => ({ ...p, viewer: { ...p.viewer, saved: next } }),
    (p) => ({ ...p, viewer: { ...p.viewer, saved: !next } }),
    { kind: 'save', on: next },
    'Could not save this post',
  )
}

export async function repost(post: Post): Promise<void> {
  const result = await host.act(post.id, { kind: 'repost' })
  if (result.ok) {
    patch(post.id, (p) => ({ ...p, stats: { ...p.stats, reposts: p.stats.reposts + 1 } }))
    toast('Reposted', false)
  } else {
    toast(`Could not repost (${result.error.code})`)
  }
}

export async function submitComment(post: Post, text: string): Promise<boolean> {
  const result = await host.act(post.id, { kind: 'comment', text })
  if (result.ok) {
    patch(post.id, (p) => ({ ...p, stats: { ...p.stats, comments: p.stats.comments + 1 } }))
    return true
  }
  toast(`Could not post the comment (${result.error.code})`)
  return false
}

export async function loadComments(id: string) {
  const result = await host.comments(id)
  if (result.ok) return result.value
  toast(`Could not load comments (${result.error.code})`)
  return []
}

let emptyPages = 0

/**
 * Asks the feed for another page.
 *
 * The give-up counter matters more than it looks: the sentinel that triggers
 * this sits at the end of a short column, so it stays on screen, so a feed
 * with nothing left to send would otherwise be asked again every time the
 * previous attempt timed out, forever.
 */
export async function loadMore(): Promise<void> {
  if (loadingMore.value || exhausted.value) return

  loadingMore.value = true
  const result = await host.loadMore()
  loadingMore.value = false

  if (result.ok) {
    emptyPages = 0
    return
  }

  emptyPages += 1
  if (emptyPages >= 2) exhausted.value = true
}

/** Lets the user ask again after we gave up. */
export function retryLoadMore(): void {
  emptyPages = 0
  exhausted.value = false
  void loadMore()
}
