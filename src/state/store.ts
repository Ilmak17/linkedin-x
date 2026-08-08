import { computed, signal } from '@preact/signals'
import { shouldShow } from '../filter/classify'
import type { HostFeed, PostAction } from '../host/types'
import { normalize, type Post } from '../model/post'
import { DEFAULTS, type AppSettings } from '../lib/settings'

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

export function ingest(raws: Parameters<typeof normalize>[0][]): void {
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
      viewer: { ...p.viewer, liked: next },
      stats: { ...p.stats, reactions: Math.max(0, p.stats.reactions + delta) },
    }),
    (p) => ({
      ...p,
      viewer: { ...p.viewer, liked: !next },
      stats: { ...p.stats, reactions: Math.max(0, p.stats.reactions - delta) },
    }),
    { kind: 'like', on: next },
    next ? 'Could not like this post' : 'Could not remove the reaction',
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

export async function loadMore(): Promise<void> {
  if (loadingMore.value) return
  loadingMore.value = true
  const result = await host.loadMore()
  loadingMore.value = false
  if (!result.ok) toast('LinkedIn stopped sending new posts')
}
