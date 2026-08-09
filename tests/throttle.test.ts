import { describe, expect, it, vi } from 'vitest'
import { signatureOf, throttle } from '../src/lib/throttle'

describe('throttle', () => {
  it('runs the first call immediately', () => {
    const fn = vi.fn()
    throttle(fn, 100).call()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('collapses a storm into one trailing call', async () => {
    const fn = vi.fn()
    const t = throttle(fn, 50)

    t.call()
    for (let i = 0; i < 200; i++) t.call()

    expect(fn).toHaveBeenCalledTimes(1)
    await new Promise((r) => setTimeout(r, 80))
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('does not run after being cancelled', async () => {
    const fn = vi.fn()
    const t = throttle(fn, 30)
    t.call()
    t.call()
    t.cancel()

    await new Promise((r) => setTimeout(r, 60))
    expect(fn).toHaveBeenCalledTimes(1)
  })
})

describe('signatureOf', () => {
  const post = (over: Record<string, unknown> = {}) => ({
    id: 'a',
    reactions: 10,
    comments: 2,
    liked: false,
    text: 'hello',
    ...over,
  })

  it('is stable when nothing the UI shows has changed', () => {
    expect(signatureOf([post()])).toBe(signatureOf([post()]))
  })

  it.each([
    ['a reaction lands', { reactions: 11 }],
    ['a comment lands', { comments: 3 }],
    ['the viewer likes it', { liked: true }],
    ['the text is expanded', { text: 'hello and then some' }],
    ['it is a different post', { id: 'b' }],
  ])('changes when %s', (_, over) => {
    expect(signatureOf([post(over)])).not.toBe(signatureOf([post()]))
  })

  it('changes when a post arrives or leaves', () => {
    expect(signatureOf([post(), post({ id: 'b' })])).not.toBe(signatureOf([post()]))
  })
})
