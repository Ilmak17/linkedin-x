import { useEffect, useRef } from 'preact/hooks'
import { saveSettings } from '../lib/settings'
import {
  brokenReason,
  exhausted,
  hiddenCount,
  loadMore,
  loadingMore,
  retryLoadMore,
  toasts,
  openThread,
  visiblePosts,
  warmingUp,
} from '../state/store'
import { Aside } from './Aside'
import { ThreadView } from './ThreadView'
import { cursor, useKeyboard } from './useKeyboard'
import { Button, EmptyState, Skeleton, Tabs } from './kit'
import { PostCard } from './PostCard'
import { Rail } from './Rail'

export function App() {
  const sentinel = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  useKeyboard(scroller)

  // Infinite scroll. Reaching the end of our column asks the host for another
  // page, which it gets by scrolling LinkedIn's own scroll container.
  useEffect(() => {
    const target = sentinel.current
    const root = scroller.current
    if (!target || !root) return

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !exhausted.value) void loadMore()
      },
      { root, rootMargin: '1200px 0px' },
    )
    io.observe(target)
    return () => io.disconnect()
  }, [])

  const posts = visiblePosts.value
  const thread = posts.find((p) => p.id === openThread.value)

  return (
    <div class="root" ref={scroller}>
      <a class="skip-link" href="#lx-timeline">Skip to the timeline</a>

      <div class="shell">
        <Rail />

        <main class="feed" id="lx-timeline" tabIndex={-1}>
          {thread ? (
            <ThreadView post={thread} />
          ) : (
            <>
          <Tabs
            tabs={[
              { label: 'For you', active: true },
              { label: 'Following', href: 'https://www.linkedin.com/feed/?filterType=following' },
            ]}
          />

          <a
            class="composer-cta"
            href="https://www.linkedin.com/feed/?shareActive=true"
            title="Write a post on LinkedIn"
          >
            <span class="prompt">What's happening?</span>
            <span class="btn primary">Post</span>
          </a>

          {brokenReason.value ? (
            <EmptyState
              title="LinkedIn changed something"
              action={
                <Button variant="outline" onClick={() => void saveSettings({ enabled: false })}>
                  Show the original LinkedIn
                </Button>
              }
            >
              We can see the feed but cannot read it, so we are staying out of the way. {brokenReason.value}
            </EmptyState>
          ) : (
            <>
              {posts.length === 0 && warmingUp.value && (
                <>
                  <Skeleton />
                  <Skeleton />
                  <Skeleton />
                </>
              )}

              {posts.length === 0 && !warmingUp.value && (
                <EmptyState title="Nothing left to read">
                  LinkedIn is not sending anything we would call a post right now.
                  {hiddenCount.value > 0 &&
                    ` ${hiddenCount.value} item${hiddenCount.value === 1 ? ' was' : 's were'} filtered out as noise.`}
                </EmptyState>
              )}

              {posts.map((p, i) => (
                <PostCard post={p} key={p.id} cursored={cursor.value === i} />
              ))}

              <div ref={sentinel} />

              {posts.length > 0 && exhausted.value && (
                <EmptyState
                  title="You're all caught up"
                  action={
                    <Button variant="outline" onClick={retryLoadMore}>
                      Check again
                    </Button>
                  }
                >
                  LinkedIn has stopped sending new posts for now.
                </EmptyState>
              )}

              {posts.length > 0 && !exhausted.value && (
                <div class="footer">
                  <Button variant="outline" disabled={loadingMore.value} onClick={() => void loadMore()}>
                    {loadingMore.value ? 'Loading' : 'Show more posts'}
                  </Button>
                </div>
              )}
            </>
          )}
            </>
          )}
        </main>

        <Aside />
      </div>

      <div class="toasts" role="status" aria-live="polite" aria-atomic="true">
        {toasts.value.map((t) => (
          <div class={`toast${t.bad ? ' bad' : ''}`} key={t.id}>
            {t.text}
          </div>
        ))}
      </div>
    </div>
  )
}
