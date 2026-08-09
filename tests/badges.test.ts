import { describe, expect, it } from 'vitest'
import { BadgesHost, countIn, labelIn } from '../src/host/badges-host'

describe('unread counts on LinkedIn’s nav', () => {
  it('reads a count and the item it belongs to', () => {
    document.body.innerHTML = `
      <nav>
        <a href="/feed/">Home</a>
        <a href="/mynetwork/">My Network</a>
        <a href="/messaging/">3 new messages Messaging</a>
        <a href="/notifications/">12 new notifications Notifications</a>
      </nav>`
    expect(new BadgesHost().read()).toEqual({ Messages: 3, Notifications: 12 })
  })

  it('ignores an item with no count rather than storing a zero', () => {
    document.body.innerHTML = '<nav><a href="/messaging/">Messaging</a></nav>'
    expect(new BadgesHost().read()).toEqual({})
  })

  it.each([
    ['3 new messages', 3],
    ['99+ notifications', 99],
    ['Messaging', null],
    ['0 notifications', null],
  ])('reads the count in %s', (text, expected) => {
    expect(countIn(text)).toBe(expected)
  })

  it.each([
    ['3 new messages Messaging', 'Messages'],
    ['1 notification', 'Notifications'],
    ['My Network', 'Network'],
    ['Home', null],
  ])('names the item in %s', (text, expected) => {
    expect(labelIn(text)).toBe(expected)
  })
})
