import { classify, type PostKind } from '../filter/classify'
import type { RawPost } from '../host/types'
import { permalinkFrom } from '../host/selectors'

/** What the UI renders. Nothing in here knows LinkedIn exists. */
export interface Post {
  id: string
  kind: PostKind
  author: {
    name: string
    headline: string
    url: string
    avatar: string
    initials: string
  }
  timeLabel: string
  text: string
  imageUrl: string | null
  hasVideo: boolean
  linkTitle: string | null
  stats: { reactions: number; comments: number; reposts: number }
  viewer: { liked: boolean; saved: boolean }
  /**
   * LinkedIn's permalink for the post, when one can be derived. The
   * server-driven markup carries no activity urn, so this is usually null and
   * the UI falls back to plain text where it would otherwise link out.
   */
  permalink: string | null
}

export function normalize(raw: RawPost): Post {
  return {
    id: raw.id,
    kind: classify(raw),
    author: {
      name: raw.authorName || 'LinkedIn member',
      headline: raw.authorHeadline,
      url: raw.authorUrl,
      avatar: raw.avatarUrl,
      initials: initialsOf(raw.authorName),
    },
    timeLabel: raw.timeLabel,
    text: raw.text,
    imageUrl: raw.imageUrl,
    hasVideo: raw.hasVideo,
    linkTitle: raw.linkTitle,
    stats: { reactions: raw.reactions, comments: raw.comments, reposts: raw.reposts },
    viewer: { liked: raw.liked, saved: false },
    permalink: permalinkFrom(raw.id),
  }
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '·'
  const first = parts[0]![0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]![0] ?? '') : ''
  return (first + last).toUpperCase()
}

/** 1234 -> "1.2k". Keeps counters one token wide so the column never jumps. */
export function formatCount(n: number): string {
  if (n <= 0) return ''
  if (n < 1000) return String(n)
  if (n < 1_000_000) {
    const k = n / 1000
    return `${k < 10 ? k.toFixed(1).replace(/\.0$/, '') : Math.round(k)}k`
  }
  const m = n / 1_000_000
  return `${m < 10 ? m.toFixed(1).replace(/\.0$/, '') : Math.round(m)}m`
}
