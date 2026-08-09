import { describe, expect, it } from 'vitest'
import { MessagingHost, readConversation } from '../src/host/messaging-host'

/**
 * The empty inbox is the only state that has been observed on a live account,
 * so that is the case verified against reality. The populated cases below are
 * written against the structural rule — a list item holding a link to its
 * thread — which is the same rule already proven on saved posts.
 */
const shell = `
  <div class="msg-conversations-container__title-row"><h2>Messaging</h2></div>
  <div class="msg-cross-pillar-inbox-top-bar-wrapper__container">
    <span>Focused</span><span>Unread</span>
  </div>`

const conversation = (id: string, name: string, time: string, snippet: string, unread = false) => `
  <li class="msg-conversation-listitem${unread ? ' msg-conversation-listitem--unread' : ''}">
    <a href="https://www.linkedin.com/messaging/thread/${id}/?trk=x">
      <img src="https://media.example.com/${id}.jpg" alt="" />
      <div><span>${name}</span></div>
      <div><span>${time}</span></div>
      <div><span>${snippet}</span></div>
    </a>
  </li>`

describe('messaging inbox', () => {
  it('knows an empty inbox from a broken one', () => {
    document.body.innerHTML = `<main>${shell}<p>Conversation List</p></main>`
    const host = new MessagingHost()

    expect(host.isReady()).toBe(true)
    expect(host.harvest()).toHaveLength(0)
    expect(host.doctor()).toEqual({ shellFound: true, threadLinks: 0, conversations: 0 })
  })

  it('reports the shell missing when the page is not messaging at all', () => {
    document.body.innerHTML = '<main><p>Something else</p></main>'
    expect(new MessagingHost().isReady()).toBe(false)
  })

  it('finds one conversation per thread link', () => {
    document.body.innerHTML = `<main>${shell}<ul>
      ${conversation('2-abc', 'Ada Example', '3h', 'Sounds good, let us talk Monday.')}
      ${conversation('2-def', 'Kai Example', 'Mon', 'Sent the deck over.', true)}
    </ul></main>`
    const host = new MessagingHost()

    expect(host.harvest()).toHaveLength(2)
    expect(host.doctor().threadLinks).toBe(2)
  })

  it('takes the thread id out of the link and drops the tracking', () => {
    document.body.innerHTML = `<main>${shell}<ul>${conversation('2-abc', 'Ada', '3h', 'Hi')}</ul></main>`
    const [first] = new MessagingHost().harvest()

    expect(first!.id).toBe('2-abc')
    expect(first!.url).not.toContain('trk=')
  })

  it('reads who, when and what, in that order', () => {
    document.body.innerHTML = `<main>${shell}<ul>
      ${conversation('2-abc', 'Ada Example', '3h', 'Sounds good, let us talk Monday.')}
    </ul></main>`
    const [first] = new MessagingHost().harvest()

    expect(first!.name).toBe('Ada Example')
    expect(first!.timeLabel).toBe('3h')
    expect(first!.snippet).toBe('Sounds good, let us talk Monday.')
  })

  it('reads a weekday as a time, which LinkedIn uses past a few days', () => {
    document.body.innerHTML = `<main>${shell}<ul>${conversation('2-x', 'Kai', 'Mon', 'Sent it.')}</ul></main>`
    expect(new MessagingHost().harvest()[0]!.timeLabel).toBe('Mon')
  })

  it('carries unread state through', () => {
    document.body.innerHTML = `<main>${shell}<ul>
      ${conversation('2-a', 'Ada', '1h', 'Read')}
      ${conversation('2-b', 'Kai', '2h', 'Unread', true)}
    </ul></main>`
    const items = new MessagingHost().harvest()

    expect(items.find((c) => c.id === '2-a')!.unread).toBe(false)
    expect(items.find((c) => c.id === '2-b')!.unread).toBe(true)
  })

  it('returns nothing for a row with no thread link', () => {
    document.body.innerHTML = '<ul><li><span>Not a conversation</span></li></ul>'
    expect(readConversation(document.querySelector('li')!)).toBeNull()
  })
})
