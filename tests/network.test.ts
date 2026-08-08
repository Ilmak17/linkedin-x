import { beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { NetworkHost } from '../src/host/network-host'

const fixture = readFileSync(resolve(__dirname, 'fixtures/network-sdui.html'), 'utf8')

describe('network suggestions', () => {
  let host: NetworkHost

  beforeEach(() => {
    document.body.innerHTML = fixture
    host = new NetworkHost()
  })

  it('finds the people and ignores a button with nobody attached', () => {
    expect(host.isReady()).toBe(true)
    expect(host.harvest()).toHaveLength(3)
  })

  it('identifies a person by their profile slug, without the tracking query', () => {
    expect(host.harvest()[0]!.id).toBe('example-marketer-04594')
  })

  it('reads the name and headline', () => {
    const [first] = host.harvest()
    expect(first!.name).toBe('Malik Example')
    expect(first!.headline).toContain('Digital Marketing Expert')
  })

  it('keeps the label LinkedIn put on its own button', () => {
    const labels = host.harvest().map((p) => p.actionLabel)
    expect(labels).toEqual(['Connect', 'Pending', 'Follow'])
  })

  it('knows an invitation is already out', () => {
    const pending = host.harvest().find((p) => p.id === 'example-designer')!
    expect(pending.invited).toBe(true)
    expect(host.harvest().find((p) => p.id === 'example-founder')!.invited).toBe(false)
  })

  it('acts by clicking the button LinkedIn put there, and says so when it cannot', () => {
    let clicked = ''
    for (const b of document.querySelectorAll('button')) {
      b.addEventListener('click', () => {
        clicked = b.textContent ?? ''
      })
    }
    expect(host.act('example-founder')).toBe(true)
    expect(clicked).toBe('Follow')
    expect(host.act('nobody')).toBe(false)
  })

  it('falls back to a canonical profile url', () => {
    expect(host.harvest()[0]!.profileUrl).toContain('/in/example-marketer-04594')
  })
})
