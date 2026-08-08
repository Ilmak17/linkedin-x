import { useEffect, useRef } from 'preact/hooks'
import { saveSettings } from '../lib/settings'
import { brokenReason, hiddenCount, loadMore, loadingMore, toasts, visiblePosts, warmingUp } from '../state/store'
import { Aside } from './Aside'
import { PostCard } from './PostCard'
import { Rail } from './Rail'

function Skeleton() {
  return (
    <div class="skeleton">
      <div class="sk-avatar" />
      <div class="sk-body">
        <div class="sk-line" style="width:36%" />
        <div class="sk-line" style="width:92%;margin-top:12px" />
        <div class="sk-line" style="width:84%" />
        <div class="sk-line" style="width:58%" />
      </div>
    </div>
  )
}

export function App() {
  const sentinel = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)

  // Infinite scroll. Reaching the end of our column asks the host for another
  // page, which it gets by scrolling LinkedIn's own scroll container.
  useEffect(() => {
    const target = sentinel.current
    const root = scroller.current
    if (!target || !root) return

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMore()
      },
      { root, rootMargin: '1200px 0px' },
    )
    io.observe(target)
    return () => io.disconnect()
  }, [])

  const posts = visiblePosts.value

  return (
    <div class="root" ref={scroller}>
      <div class="shell">
        <Rail />

        <main class="feed">
          <div class="feed-head">
            <div class="tabs" role="tablist">
              <button class="tab" role="tab" aria-selected="true">
                For you
              </button>
              <a
                class="tab"
                role="tab"
                aria-selected="false"
                href="https://www.linkedin.com/feed/?filterType=following"
              >
                Following
              </a>
            </div>
          </div>

          {brokenReason.value ? (
            <div class="state">
              <h2>LinkedIn changed something</h2>
              <p>
                We can see the feed but cannot read it, so we are staying out of the way.
                <br />
                {brokenReason.value}
              </p>
              <button class="btn" onClick={() => void saveSettings({ enabled: false })}>
                Show the original LinkedIn
              </button>
            </div>
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
                <div class="state">
                  <h2>Nothing left to read</h2>
                  <p>
                    LinkedIn is not sending anything we would call a post right now.
                    {hiddenCount.value > 0 && (
                      <>
                        <br />
                        {hiddenCount.value} item{hiddenCount.value === 1 ? ' was' : 's were'} filtered out as noise.
                      </>
                    )}
                  </p>
                </div>
              )}

              {posts.map((p) => (
                <PostCard post={p} key={p.id} />
              ))}

              <div ref={sentinel} />

              {posts.length > 0 && (
                <div class="footer">
                  <button class="btn" disabled={loadingMore.value} onClick={() => void loadMore()}>
                    {loadingMore.value ? 'Loading' : 'Show more posts'}
                  </button>
                </div>
              )}
            </>
          )}
        </main>

        <Aside />
      </div>

      <div class="toasts">
        {toasts.value.map((t) => (
          <div class={`toast${t.bad ? ' bad' : ''}`} key={t.id}>
            {t.text}
          </div>
        ))}
      </div>
    </div>
  )
}
