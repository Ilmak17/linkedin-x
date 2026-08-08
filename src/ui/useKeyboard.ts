import { useEffect } from 'preact/hooks'
import { signal } from '@preact/signals'
import type { Post } from '../model/post'
import { toggleLike, toggleSave, visiblePosts, openThread } from '../state/store'

/** Index of the post the keyboard is pointing at, or -1 for none. */
export const cursor = signal(-1)

const isTyping = (): boolean => {
  const el = document.activeElement
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || (el as HTMLElement).isContentEditable
}

/**
 * x's reading shortcuts, on a surface that has no keyboard support of its own.
 *
 * The cursor is an index rather than a post id so that j and k stay
 * predictable while the feed grows underneath: new posts arrive at the end,
 * so the row under the cursor does not move.
 */
export function useKeyboard(scroller: { current: HTMLElement | null }): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return

      // The shadow root swallows focus, so typing has to be checked in both
      // the page and our own tree.
      if (isTyping()) return
      const shadow = (scroller.current?.getRootNode() as ShadowRoot | null) ?? null
      const inShadow = shadow?.activeElement
      if (inShadow && (inShadow.tagName === 'INPUT' || inShadow.tagName === 'TEXTAREA')) return

      const posts = visiblePosts.value
      if (posts.length === 0) return

      const move = (delta: number) => {
        e.preventDefault()
        const next = Math.min(posts.length - 1, Math.max(0, cursor.value + delta))
        cursor.value = next
        shadow?.querySelectorAll('.kit-row')[next]?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }

      const current = (): Post | undefined => posts[cursor.value]

      switch (e.key) {
        case 'j':
          return move(cursor.value < 0 ? 0 : 1)
        case 'k':
          return move(-1)
        case 'l': {
          const post = current()
          if (post) {
            e.preventDefault()
            toggleLike(post)
          }
          return
        }
        case 's': {
          const post = current()
          if (post) {
            e.preventDefault()
            toggleSave(post)
          }
          return
        }
        case 'Enter': {
          const post = current()
          if (post) {
            e.preventDefault()
            openThread.value = openThread.value === post.id ? null : post.id
          }
          return
        }
        case '/': {
          e.preventDefault()
          const input = shadow?.querySelector('.kit-search input') as HTMLInputElement | null
          input?.focus()
          return
        }
        case 'Escape':
          cursor.value = -1
          openThread.value = null
          return
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
