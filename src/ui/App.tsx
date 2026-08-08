import { useEffect, useRef } from 'preact/hooks'
import { saveSettings } from '../lib/settings'
import {
  brokenReason,
  hiddenCount,
  loadMore,
  loadingMore,
  settings,
  toasts,
  visiblePosts,
} from '../state/store'
import { GearIcon } from './icons'
import { PostCard } from './PostCard'

export function App() {
  const sentinel = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)

  // Infinite scroll. The native feed is laid out normally underneath us, so
  // asking it for another page is just a matter of scrolling the window;
  // `loadMore` in the host does that part.
  useEffect(() => {
    const target = sentinel.current
    const root = scroller.current
    if (!target || !root) return

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMore()
      },
      { root, rootMargin: '800px 0px' },
    )
    io.observe(target)
    return () => io.disconnect()
  }, [])

  if (brokenReason.value) {
    return (
      <div class="root" ref={scroller} data-broken="true">
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
    )
  }

  const posts = visiblePosts.value

  return (
    <div class="root" ref={scroller}>
      <header class="topbar">
        <div class="inner">
          <span class="wordmark">
            linkedin<b>-x</b>
          </span>
          <span class="meta">
            {posts.length} shown{hiddenCount.value > 0 ? ` · ${hiddenCount.value} filtered` : ''}
          </span>
          <button
            class="action"
            aria-label="Settings"
            title="Toggle theme"
            onClick={() => void saveSettings({ theme: settings.value.theme === 'dark' ? 'light' : 'dark' })}
          >
            <GearIcon />
          </button>
        </div>
      </header>

      <main class="column">
        {posts.length === 0 && (
          <div class="state">
            <h2>Nothing to read yet</h2>
            <p>
              Waiting for LinkedIn to send posts.
              {hiddenCount.value > 0 && (
                <>
                  <br />
                  {hiddenCount.value} item{hiddenCount.value === 1 ? '' : 's'} filtered out as noise.
                </>
              )}
            </p>
          </div>
        )}

        {posts.map((p) => (
          <PostCard post={p} key={p.id} />
        ))}

        <div ref={sentinel} />

        <div class="footer">
          <button class="btn" disabled={loadingMore.value} onClick={() => void loadMore()}>
            {loadingMore.value ? 'loading' : 'load more'}
          </button>
        </div>
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
