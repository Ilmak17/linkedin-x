import { beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { CompanyHost } from '../src/host/company-host'

const fixture = readFileSync(resolve(__dirname, 'fixtures/company-legacy.html'), 'utf8')

describe('company top card', () => {
  let host: CompanyHost

  beforeEach(() => {
    document.body.innerHTML = fixture
    host = new CompanyHost()
  })

  it('reads the card LinkedIn never migrated', () => {
    expect(host.isReady()).toBe(true)
    const c = host.harvest()!
    expect(c.name).toBe('Example Corp')
    expect(c.industry).toBe('Software Development')
    expect(c.location).toBe('Redmond, Washington')
  })

  it('separates followers from employees, which sit side by side', () => {
    const c = host.harvest()!
    expect(c.followers).toBe('29M followers')
    expect(c.employees).toBe('10K+ employees')
  })

  it('does not let the follow control or a call to action become a field', () => {
    const c = host.harvest()!
    for (const field of [c.name, c.industry, c.location]) {
      expect(field).not.toMatch(/Following|Learn more/i)
    }
  })

  it('reports the label already on the button, so a followed page is not re-followed', () => {
    expect(host.harvest()!.followLabel).toBe('Following')
  })

  it('follows by clicking the control LinkedIn put there', () => {
    let clicked = false
    document.querySelector('button')!.addEventListener('click', () => {
      clicked = true
    })
    expect(host.toggleFollow()).toBe(true)
    expect(clicked).toBe(true)
  })

  it('reports nothing rather than an empty company', () => {
    document.body.innerHTML = '<main><p>Not a company</p></main>'
    const empty = new CompanyHost()
    expect(empty.isReady()).toBe(false)
    expect(empty.harvest()).toBeNull()
  })
})
