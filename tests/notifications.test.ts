import { beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { NotificationsHost } from '../src/host/notifications-host'

const fixture = readFileSync(resolve(__dirname, 'fixtures/notifications-legacy.html'), 'utf8')

describe('notifications', () => {
  let host: NotificationsHost

  beforeEach(() => {
    document.body.innerHTML = fixture
    host = new NotificationsHost()
  })

  it('reads every card', () => {
    expect(host.isReady()).toBe(true)
    expect(host.harvest()).toHaveLength(2)
  })

  it('keeps the bolded entity inside the sentence', () => {
    // Reading the parent's own text nodes drops it: "Play ! Most solve it".
    const [first] = host.harvest()
    expect(first!.text).toContain('Play Zip!')
    expect(first!.subject).toBe('Zip')
  })

  it('takes unread state off the class rather than inferring it', () => {
    const [first, second] = host.harvest()
    expect(first!.unread).toBe(true)
    expect(second!.unread).toBe(false)
  })

  it('keeps the menu items out of the notification', () => {
    for (const n of host.harvest()) {
      expect(n.text).not.toMatch(/Delete notification|Change notification preferences|Unread notification/)
      expect(n.actionLabel).not.toMatch(/Delete|Settings/)
    }
  })

  it('reads the call to action and the age', () => {
    const [first] = host.harvest()
    expect(first!.actionLabel).toBe('Solve now')
    expect(first!.timeLabel).toBe('4h')
  })

  it('has no call to action when LinkedIn printed none', () => {
    expect(host.harvest()[1]!.actionLabel).toBe('')
    expect(host.harvest()[1]!.timeLabel).toBe('2d')
  })

  it('dismisses through the control LinkedIn put there', () => {
    let clicked = ''
    for (const b of document.querySelectorAll('button')) {
      b.addEventListener('click', () => {
        clicked = b.getAttribute('aria-label') ?? ''
      })
    }
    expect(host.dismiss('nt-0')).toBe(true)
    expect(clicked).toBe('Delete notification')
    expect(host.dismiss('nt-99')).toBe(false)
  })

  it('reports an empty inbox rather than pretending', () => {
    document.body.innerHTML = '<div><p>No notifications yet</p></div>'
    const empty = new NotificationsHost()
    expect(empty.isReady()).toBe(false)
    expect(empty.harvest()).toHaveLength(0)
  })
})
