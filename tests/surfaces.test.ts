import { describe, expect, it } from 'vitest'
import { surfaceFor } from '../src/content/surfaces'

describe('which path maps to which screen', () => {
  it.each([
    ['/feed/', 'feed'],
    ['/feed', 'feed'],
    ['/feed/update/urn:li:activity:123/', 'feed'],
    ['/search/results/all/', 'feed'],
    ['/search/results/people/', 'feed'],
    ['/jobs/search-results/', 'jobs'],
    ['/jobs/collections/recommended/', 'jobs'],
    ['/mynetwork/grow/', 'network'],
    ['/in/ada-example/', 'profile'],
    ['/company/example-corp/', 'company'],
    ['/my-items/saved-posts/', 'saved'],
    ['/notifications/', 'notifications'],
  ])('routes %s to the %s surface', (path, surface) => {
    expect(surfaceFor(path)).toBe(surface)
  })

  it.each([
    ['/messaging/', 'the inbox root'],
    ['/messaging', 'the root without a slash'],
    ['/messaging/thread/new/', 'the composer an empty inbox redirects to'],
    ['/messaging/?filter=unread', 'a filtered inbox'],
  ])('covers %s (%s)', (path) => {
    // The first version matched only "/messaging", so the overlay never
    // mounted on any of these — including the page LinkedIn sends you to
    // when the inbox is empty.
    expect(surfaceFor(path.split('?')[0]!)).toBe('messaging')
  })

  it.each(['/messaging/thread/2-abc123/', '/messaging/thread/2-xyz/'])(
    'leaves an open conversation to LinkedIn: %s',
    (path) => {
      // We can render the list but not a thread. Covering a working
      // conversation with something we cannot draw would be worse than not
      // covering it at all.
      expect(surfaceFor(path)).toBeNull()
    },
  )

  it.each([
    '/jobs/',
    '/jobs/preferences/',
    '/learning/',
    '/groups/12345/',
    '/events/',
    '/',
    '/checkpoint/lg/login',
  ])('leaves %s to LinkedIn', (path) => {
    expect(surfaceFor(path)).toBeNull()
  })

  it('does not let /in/ without a member match the profile surface', () => {
    expect(surfaceFor('/in/')).toBeNull()
  })

  it('does not let a company sub-path escape the company surface', () => {
    expect(surfaceFor('/company/example-corp/jobs/')).toBe('company')
  })
})
