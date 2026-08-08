import { beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DomHost } from '../src/host/dom-host'
import { classify } from '../src/filter/classify'
import { normalize } from '../src/model/post'

const fixture = readFileSync(resolve(__dirname, 'fixtures/feed-legacy.html'), 'utf8')

describe('DomHost.harvest on legacy markup', () => {
  let posts: ReturnType<DomHost['harvest']>

  beforeEach(() => {
    document.body.innerHTML = fixture
    posts = new DomHost().harvest()
  })

  it('finds every post exactly once', () => {
    expect(posts).toHaveLength(4)
    expect(new Set(posts.map((p) => p.urn)).size).toBe(4)
  })

  it('reads the author without the screen-reader duplicate', () => {
    expect(posts[0]!.authorName).toBe('Ada Example')
    expect(posts[0]!.authorHeadline).toBe('Staff Engineer, Distributed Systems')
  })

  it('keeps only the time token from the sub-description', () => {
    expect(posts[0]!.timeLabel).toBe('3h')
  })

  it('strips the "see more" toggle out of the body text', () => {
    expect(posts[0]!.text).toBe('We deleted our retry layer and p99 dropped 40%.')
    expect(posts[0]!.text).not.toContain('see more')
  })

  it('parses thousands separators and K suffixes', () => {
    expect(posts[0]!.reactions).toBe(1248)
    expect(posts[0]!.comments).toBe(31)
    expect(posts[2]!.reactions).toBe(2400)
  })

  it('reads the viewer reaction state', () => {
    expect(posts[0]!.liked).toBe(false)
    expect(posts[2]!.liked).toBe(true)
  })

  it('reads media', () => {
    expect(posts[0]!.imageUrl).toContain('post-one.jpg')
    expect(posts[1]!.imageUrl).toBeNull()
  })

  it('classifies each post', () => {
    expect(posts.map(classify)).toEqual(['organic', 'promoted', 'social-proof', 'module'])
  })

  it('produces a permalink from the urn', () => {
    expect(normalize(posts[0]!).permalink).toBe(
      'https://www.linkedin.com/feed/update/urn:li:activity:1000000000000000001/',
    )
  })
})

describe('DomHost.doctor', () => {
  it('reports what matched so a broken selector can be diagnosed', () => {
    document.body.innerHTML = fixture
    const host = new DomHost()
    host.harvest()
    const report = host.doctor()

    expect(report.feedRootFound).toBe(true)
    expect(report.postsFound).toBe(4)
    expect(report.hits.find((h) => h.key === 'authorName')?.selector).toContain('update-components-actor__title')
  })

  it('reports an empty feed rather than pretending it worked', () => {
    document.body.innerHTML = '<div class="scaffold-finite-scroll__content"></div>'
    const host = new DomHost()
    expect(host.harvest()).toHaveLength(0)
    expect(host.isReady()).toBe(false)
  })
})
