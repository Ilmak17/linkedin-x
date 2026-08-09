import type { Result } from '../lib/result'

/**
 * The seam between us and LinkedIn.
 *
 * Everything above this interface (filter, store, UI) is ordinary application
 * code that could be pointed at any feed. Everything below it is LinkedIn's
 * problem. There is exactly one implementation today (`DomHost`, which reads
 * the native DOM and clicks native buttons); a second one that intercepts
 * LinkedIn's own JSON responses can be dropped in without touching the UI.
 */

/** Raw, un-classified data scraped straight off the page. */
export interface RawPost {
  /** Stable identity: a componentkey token, or an activity urn on legacy markup. */
  id: string
  authorName: string
  authorHeadline: string
  authorUrl: string
  avatarUrl: string
  /** LinkedIn's own relative string, e.g. "3h" or "1 неделя". Not parsed. */
  timeLabel: string
  text: string
  imageUrl: string | null
  hasVideo: boolean
  linkTitle: string | null
  reactions: number
  comments: number
  reposts: number
  liked: boolean
  /** Which reaction the viewer left, empty when none. LinkedIn offers six. */
  reaction: string
  /** Raw markers the classifier uses; see filter/classify.ts. */
  markers: {
    hasSponsoredBadge: boolean
    descriptionText: string
    headerText: string
    hasActionBar: boolean
  }
}

export interface RawComment {
  id: string
  authorName: string
  authorHeadline: string
  avatarUrl: string
  text: string
  timeLabel: string
}

export type PostAction =
  | { kind: 'like'; on: boolean }
  | { kind: 'react'; reaction: string }
  | { kind: 'comment'; text: string }
  | { kind: 'repost' }
  | { kind: 'save'; on: boolean }

export interface HostFeed {
  /** True when the native feed is present and we found posts in it. */
  isReady(): boolean

  /** Read every post currently in the native feed. */
  harvest(): RawPost[]

  /** Subscribe to native feed mutations. Returns an unsubscribe function. */
  observe(onChange: (posts: RawPost[]) => void): () => void

  /** Ask the native feed for more posts. Resolves once new posts appear, or times out. */
  loadMore(): Promise<Result<number>>

  /** Perform an action by driving LinkedIn's own controls. */
  act(id: string, action: PostAction): Promise<Result<void>>

  /** Expand and read a post's comment thread. */
  comments(id: string): Promise<Result<RawComment[]>>

  /** Move the native feed offscreen (or back). */
  stage(hidden: boolean): void

  /** Which selectors matched, for the "LinkedIn changed" bug report. */
  doctor(): DoctorReport
}

export interface DoctorReport {
  feedRootFound: boolean
  postsFound: number
  /** Which markup generation we matched. */
  generation: 'sdui' | 'legacy' | 'unknown'
  /** Total listitems in the feed, including modules we deliberately skip. */
  listItemsInFeed: number
  /** Whether we located LinkedIn's own scroll container; pagination needs it. */
  scrollerFound: boolean
  /** Selector variants that matched, and at which position in the candidate list. */
  hits: Array<{ key: string; index: number; selector: string }>
  /** Fields we failed to read on a majority of posts. */
  missingFields: string[]
  userAgent: string
  extensionVersion: string
}
