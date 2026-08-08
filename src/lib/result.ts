/**
 * A tiny Result type. The host layer never throws into the UI: LinkedIn's DOM
 * is not ours, so "the thing I expected isn't there" is an ordinary outcome,
 * not an exception.
 */

export type ErrorCode =
  | 'SELECTOR_MISS' // we could not find the element we needed
  | 'POST_GONE' // the post was removed from the native DOM while we worked
  | 'ACTION_TIMEOUT' // we clicked, but LinkedIn never confirmed
  | 'NOT_SUPPORTED' // this action is not available on this post
  | 'DISABLED' // the extension is switched off

export interface Failure {
  code: ErrorCode
  detail: string
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: Failure }

export const ok = <T>(value: T): Result<T> => ({ ok: true, value })

export const fail = <T = never>(code: ErrorCode, detail: string): Result<T> => ({
  ok: false,
  error: { code, detail },
})
