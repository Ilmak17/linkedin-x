import { beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { JobsHost } from '../src/host/jobs-host'

const fixture = readFileSync(resolve(__dirname, 'fixtures/job-detail.html'), 'utf8')

describe('job detail pane', () => {
  let host: JobsHost

  beforeEach(() => {
    document.body.innerHTML = fixture
    host = new JobsHost()
  })

  it('reads the description without the heading that located it', () => {
    const detail = host.detail()!
    expect(detail.description).toContain('experienced Python developer')
    expect(detail.description.startsWith('About the job')).toBe(false)
  })

  it('reads the conditions as chips', () => {
    expect(host.detail()!.conditions).toEqual(['Remote', 'Full-time'])
  })

  it('does not turn a sentence in the description into a chip', () => {
    // "Remote work is possible..." lives in the body and is not a condition.
    for (const chip of host.detail()!.conditions) {
      expect(chip.length).toBeLessThan(30)
      expect(chip).not.toContain('possible')
    }
  })

  it('takes the apply link and its label', () => {
    const detail = host.detail()!
    expect(detail.applyLabel).toBe('Apply')
    expect(detail.applyUrl).toContain('linkedin.com/safety/go/')
  })

  it('returns null when there is no pane rather than an empty shell', () => {
    document.body.innerHTML = '<div><p>Nothing here</p></div>'
    expect(new JobsHost().detail()).toBeNull()
  })
})
