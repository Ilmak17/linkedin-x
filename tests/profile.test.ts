import { beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ProfileHost } from '../src/host/profile-host'

const fixture = readFileSync(resolve(__dirname, 'fixtures/profile-sdui.html'), 'utf8')

describe('member profile', () => {
  let host: ProfileHost

  beforeEach(() => {
    document.body.innerHTML = fixture
    host = new ProfileHost()
  })

  it('reads the top card in the order LinkedIn prints it', () => {
    const p = host.harvest()!
    expect(p.name).toBe('Ada Example')
    expect(p.headline).toBe('Chair, Example Foundation and Founder, Example Energy')
    expect(p.company).toBe('Example Foundation')
    expect(p.location).toBe('Seattle, Washington, United States')
  })

  it('pulls the follower count and the website out of the same block', () => {
    const p = host.harvest()!
    expect(p.followers).toBe('40,557,416 followers')
    expect(p.website).toBe('https://example.com/ada')
  })

  it('drops the chrome LinkedIn mixes into the top card', () => {
    const p = host.harvest()!
    for (const field of [p.name, p.headline, p.company, p.location]) {
      expect(field).not.toMatch(/Contact info|Verify in|^·$/)
    }
  })

  it('reads About without repeating its own heading', () => {
    const p = host.harvest()!
    expect(p.about).toContain('Voracious reader')
    expect(p.about).not.toContain('About\n')
  })

  it('ignores the empty duplicate of a card', () => {
    // LinkedIn renders the top card twice; only one copy has content.
    expect(document.querySelectorAll('[componentkey$="Topcard"]')).toHaveLength(2)
    expect(host.harvest()!.name).toBe('Ada Example')
  })

  it('takes the labels off LinkedIn’s own buttons', () => {
    expect(host.harvest()!.actions).toEqual(['Follow', 'Connect'])
  })

  it('acts by clicking the button with that label', () => {
    let clicked = ''
    for (const b of document.querySelectorAll('button')) {
      b.addEventListener('click', () => {
        clicked = b.textContent ?? ''
      })
    }
    expect(host.act('Connect')).toBe(true)
    expect(clicked).toBe('Connect')
    expect(host.act('Endorse')).toBe(false)
  })

  it('reports nothing rather than an empty profile when there is no card', () => {
    document.body.innerHTML = '<div><p>Not a profile</p></div>'
    const empty = new ProfileHost()
    expect(empty.isReady()).toBe(false)
    expect(empty.harvest()).toBeNull()
  })
})
