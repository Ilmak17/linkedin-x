import { beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DomHost } from '../src/host/dom-host'

const fixture = readFileSync(resolve(__dirname, 'fixtures/comments-sdui.html'), 'utf8')

describe('comment threads', () => {
  let host: DomHost

  beforeEach(() => {
    document.body.innerHTML = `<div data-testid="mainFeed" role="list">${fixture}</div>`
    host = new DomHost()
  })

  const idOf = () => host.harvest()[0]!.id

  it('reads every comment in the thread', async () => {
    const result = await host.comments(idOf())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toHaveLength(2)
  })

  it('identifies a comment by its own urn', async () => {
    const result = await host.comments(idOf())
    if (!result.ok) throw new Error('expected comments')
    expect(result.value[0]!.id).toBe('urn:li:comment:(urn:li:activity:100,200)')
  })

  it('separates the author, the headline and the body', async () => {
    const result = await host.comments(idOf())
    if (!result.ok) throw new Error('expected comments')

    const [first, second] = result.value
    expect(first!.authorName).toBe('Example Corp')
    expect(first!.authorHeadline).toBe('Premium')
    expect(first!.text).toBe('Great work here. Everyone deserves a seat at the table.')
    expect(first!.timeLabel).toBe('2d')

    // A follower count is not a comment, however long the number is.
    expect(first!.text).not.toContain('followers')

    expect(second!.authorName).toBe('Kai Example')
    expect(second!.text).toBe('Second the point about training beyond software roles.')
  })

  it('reports a post that is no longer there instead of throwing', async () => {
    const result = await host.comments('nope')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('POST_GONE')
  })
})
