import { classify, type PostKind } from '../filter/classify'
import type { RawPost } from '../host/types'

/** What the UI renders. Nothing in here knows LinkedIn exists. */
export interface Post {
  urn: string
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
  /** LinkedIn's own permalink, for "open the original". */
  permalink: string
}

export function normalize(raw: RawPost): Post {
  return {
    urn: raw.urn,
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
    permalink: permalinkFor(raw.urn),
  }
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '·'
  const first = parts[0]![0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]![0] ?? '') : ''
  return (first + last).toUpperCase()
}

export function permalinkFor(urn: string): string {
  const id = urn.split(':').pop() ?? ''
  return `https://www.linkedin.com/feed/update/urn:li:activity:${id}/`
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
