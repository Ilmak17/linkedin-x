/**
 * Trailing throttle on an animation frame.
 *
 * LinkedIn mutates its DOM continuously, and the readers were wired to a
 * MutationObserver that scheduled work on every burst. On a real feed that is
 * a full re-parse many times a second. This collapses a storm of bursts into
 * one call every `waitMs`, keeping the last one.
 */
export function throttle(fn: () => void, waitMs: number): { call: () => void; cancel: () => void } {
  let last = 0
  let timer: number | null = null

  const run = () => {
    timer = null
    last = performance.now()
    fn()
  }

  return {
    call() {
      if (timer !== null) return
      const since = performance.now() - last
      if (since >= waitMs) run()
      else timer = window.setTimeout(run, waitMs - since)
    },
    cancel() {
      if (timer !== null) clearTimeout(timer)
      timer = null
    },
  }
}

/**
 * A cheap fingerprint of what a harvest produced.
 *
 * Ingesting unconditionally replaced the posts array on every mutation, which
 * re-rendered the whole timeline whether or not anything had changed. Posts
 * are compared on the fields that can actually change under the user.
 */
export function signatureOf(
  items: Array<{ id: string; reactions?: number; comments?: number; liked?: boolean; text?: string }>,
): string {
  return items
    .map((i) => `${i.id}:${i.reactions ?? ''}:${i.comments ?? ''}:${i.liked ? 1 : 0}:${i.text?.length ?? ''}`)
    .join('|')
}
