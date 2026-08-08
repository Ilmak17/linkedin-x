import { useEffect, useRef } from 'preact/hooks'
import { saveSettings } from '../lib/settings'
import { brokenReason, loadMore, loadingMore, toasts, visiblePosts, warmingUp } from '../state/store'
import { PostCard } from './PostCard'
import { TopBar } from './TopBar'

function Skeleton() {
  return (
    <div class="skeleton">
      <div class="sk-avatar" />
      <div class="sk-body">
        <div class="sk-line" style="width:34%" />
        <div class="sk-line" style="width:22%;height:9px" />
        <div class="sk-line" style="width:96%;margin-top:14px" />
        <div class="sk-line" style="width:88%" />
        <div class="sk-line" style="width:64%" />
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

  if (brokenReason.value) {
    return (
      <div class="root" ref={scroller} data-broken="true">
        <TopBar />
        <div class="column">
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
        </div>
      </div>
    )
  }

  const posts = visiblePosts.value

  return (
    <div class="root" ref={scroller}>
      <TopBar />

      <main class="column">
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
              <br />
              Scroll down to ask for more, or turn a filter back on in the toolbar popup.
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
              {loadingMore.value ? 'loading' : 'load more'}
            </button>
          </div>
        )}
      </main>

      <div class="toasts">
        {toasts.value.map((t) => (
          <div class="toast" key={t.id}>
            {t.text}
          </div>
        ))}
      </div>
    </div>
  )
}
