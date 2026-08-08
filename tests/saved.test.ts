import { beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { SavedHost } from '../src/host/saved-host'

const fixture = readFileSync(resolve(__dirname, 'fixtures/saved-legacy.html'), 'utf8')

describe('saved posts', () => {
  let host: SavedHost

  beforeEach(() => {
    document.body.innerHTML = fixture
    host = new SavedHost()
  })

  it('finds one item per permalink', () => {
    expect(host.isReady()).toBe(true)
    expect(host.harvest()).toHaveLength(2)
  })

  it('takes the activity urn out of the permalink as the id', () => {
    expect(host.harvest()[0]!.id).toBe('urn:li:activity:7490827341397422080')
  })

  it('drops the chrome mixed in with the facts', () => {
    const [first] = host.harvest()
    expect(first!.author).toBe('Ada Example')
    expect(first!.headline).toContain('Chief Sustainability Officer')
    expect(first!.text).toContain('questions about AI and water')

    for (const field of [first!.author, first!.headline, first!.text]) {
      expect(field).not.toMatch(/View .*profile|3rd\+|see more|Visible to/)
    }
  })

  it('keeps only the age from the duplicated time', () => {
    expect(host.harvest()[0]!.timeLabel).toBe('3d')
    expect(host.harvest()[1]!.timeLabel).toBe('1w')
  })

  it('strips tracking off the permalink', () => {
    expect(host.harvest()[0]!.permalink).not.toContain('utm=')
    expect(host.harvest()[0]!.permalink).toContain('urn:li:activity:7490827341397422080')
  })

  it('does not swallow the page heading into the first item', () => {
    // Walking out to the container instead of the <li> would put "Saved Posts"
    // and the filter row into the first item's fields.
    expect(host.harvest()[0]!.author).not.toBe('Saved Posts')
  })

  it('reads a short post whose body is shorter than the headline', () => {
    const second = host.harvest()[1]!
    expect(second.author).toBe('Kai Example')
    expect(second.headline).toBe('Founder at Example Labs')
    expect(second.text).toBe('Short one.')
  })

  it('reports an empty list rather than pretending', () => {
    document.body.innerHTML = '<div><p>Start saving posts</p></div>'
    const empty = new SavedHost()
    expect(empty.isReady()).toBe(false)
    expect(empty.harvest()).toHaveLength(0)
  })
})
