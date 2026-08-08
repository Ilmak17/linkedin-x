import { beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DomHost } from '../src/host/dom-host'
import { classify } from '../src/filter/classify'
import { normalize } from '../src/model/post'

const load = (name: string) => readFileSync(resolve(__dirname, 'fixtures', name), 'utf8')
const sdui = load('feed-sdui.html')
const legacy = load('feed-legacy.html')

describe('server-driven markup', () => {
  let posts: ReturnType<DomHost['harvest']>

  beforeEach(() => {
    document.body.innerHTML = sdui
    posts = new DomHost().harvest()
  })

  it('skips the listitems that are not posts', () => {
    // Four listitems in the fixture; the person-suggestion module has no
    // control menu and must not reach the timeline.
    expect(document.querySelectorAll('[role="listitem"]')).toHaveLength(4)
    expect(posts).toHaveLength(3)
  })

  it('takes identity from the componentkey token', () => {
    expect(posts[0]!.id).toBe('TOKEN0000000000000000000000000000001')
    expect(new Set(posts.map((p) => p.id)).size).toBe(3)
  })

  it('reads the author out of the actor block', () => {
    expect(posts[0]!.authorName).toBe('Ada Example')
    expect(posts[0]!.authorHeadline).toBe('Staff Engineer, Distributed Systems')
    expect(posts[0]!.authorUrl).toContain('/in/example-one/')
  })

  it('does not mistake the connection degree or chrome strings for a headline', () => {
    expect(posts[0]!.authorHeadline).not.toContain('1st')
    expect(posts[0]!.authorHeadline).not.toBe('Feed post')
  })

  it('takes the author from the avatar link, not from social proof above it', () => {
    // The ad is prefixed by "Grace Example, and 5 other connections follow
    // this Page", whose link comes first in the DOM.
    expect(posts[1]!.authorName).toBe('Example Corp')
    expect(posts[1]!.authorUrl).toContain('/company/example-corp/')
  })

  it('takes the headline from the leaf after the name, not the longest one', () => {
    // "Want to view more? Unlock the full document below." is longer than any
    // real headline and must not win.
    expect(posts[1]!.authorHeadline).toBe('14,204 followers')
  })

  it('keeps only the age from the timestamp', () => {
    expect(posts[0]!.timeLabel).toBe('9h')
  })

  it('strips the "…more" toggle out of the body', () => {
    expect(posts[0]!.text).toBe('We deleted our retry layer and p99 dropped 40%.')
    expect(posts[0]!.text).not.toContain('more')
  })

  it('reads counters written as sentences', () => {
    // "Grace and 82 others reacted" means 83 people, not 82.
    expect(posts[0]!.reactions).toBe(83)
    expect(posts[0]!.comments).toBe(25)
    expect(posts[0]!.reposts).toBe(1)
  })

  it('reads the reaction state from the button label, not aria-pressed', () => {
    expect(posts[0]!.liked).toBe(false)
  })

  it('tells the avatar apart from the post image', () => {
    expect(posts[0]!.avatarUrl).toContain('avatar-one.jpg')
    expect(posts[0]!.imageUrl).toContain('post-one.jpg')
  })

  it('catches an ad whose only marker is a word in the actor block', () => {
    expect(classify(posts[1]!)).toBe('promoted')
    expect(classify(posts[0]!)).toBe('organic')
  })

  it('reads a repost as the original author, and does not take the reposter as the headline', () => {
    const repost = posts[2]!
    expect(repost.authorName).toBe('Kai Example')
    expect(repost.authorHeadline).toBe('CEO at Example Labs')
    expect(classify(repost)).toBe('social-proof')
  })

  it('reports no permalink, because the markup carries no activity urn', () => {
    expect(normalize(posts[0]!).permalink).toBeNull()
  })
})

describe('legacy markup', () => {
  let posts: ReturnType<DomHost['harvest']>

  beforeEach(() => {
    document.body.innerHTML = legacy
    posts = new DomHost().harvest()
  })

  it('still parses the Ember bucket', () => {
    expect(posts).toHaveLength(4)
    expect(posts[0]!.authorName).toBe('Ada Example')
    expect(posts[0]!.text).toBe('We deleted our retry layer and p99 dropped 40%.')
    expect(posts[0]!.timeLabel).toBe('3h')
  })

  it('reads legacy counters and reaction state', () => {
    expect(posts[0]!.reactions).toBe(1248)
    expect(posts[2]!.reactions).toBe(2400)
    expect(posts[0]!.liked).toBe(false)
    expect(posts[2]!.liked).toBe(true)
  })

  it('classifies the legacy post types', () => {
    expect(posts.map(classify)).toEqual(['organic', 'promoted', 'social-proof', 'module'])
  })

  it('builds a permalink from the activity urn', () => {
    expect(normalize(posts[0]!).permalink).toBe(
      'https://www.linkedin.com/feed/update/urn:li:activity:1000000000000000001/',
    )
  })
})

describe('doctor', () => {
  it('names the generation it matched and what it skipped', () => {
    document.body.innerHTML = sdui
    const host = new DomHost()
    host.harvest()
    const report = host.doctor()

    expect(report.feedRootFound).toBe(true)
    expect(report.generation).toBe('sdui')
    expect(report.postsFound).toBe(3)
    expect(report.listItemsInFeed).toBe(4)
    expect(report.hits.find((h) => h.key === 'body')?.selector).toBe('[data-testid="expandable-text-box"]')
  })

  it('reports an empty feed rather than pretending it worked', () => {
    document.body.innerHTML = '<div data-testid="mainFeed" role="list"></div>'
    const host = new DomHost()
    expect(host.harvest()).toHaveLength(0)
    expect(host.isReady()).toBe(false)
    expect(host.doctor().generation).toBe('unknown')
  })
})
