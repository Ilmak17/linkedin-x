import { beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { JobsHost } from '../src/host/jobs-host'

const fixture = readFileSync(resolve(__dirname, 'fixtures/jobs-sdui.html'), 'utf8')

describe('job search results', () => {
  let host: JobsHost

  beforeEach(() => {
    document.body.innerHTML = fixture
    host = new JobsHost()
  })

  it('finds every card', () => {
    expect(host.isReady()).toBe(true)
    expect(host.harvest()).toHaveLength(4)
  })

  it('takes the job id from the componentkey', () => {
    expect(host.harvest()[0]!.id).toBe('4443260391')
  })

  it('separates title, company and location from the posting age', () => {
    const [first, second] = host.harvest()

    expect(first!.title).toBe('Python Developer')
    expect(first!.company).toBe('Example Travel')
    expect(first!.location).toBe('Astana')
    expect(first!.postedLabel).toBe('1 week ago')

    expect(second!.title).toBe('Full-stack Developer')
    expect(second!.location).toBe('Almaty (Remote)')
    expect(second!.postedLabel).toBe('3 days ago')
  })

  it('does not leave "Posted" in any of the fields', () => {
    for (const job of host.harvest()) {
      expect(job.title).not.toMatch(/^Posted/)
      expect(job.company).not.toMatch(/^Posted/)
      expect(job.postedLabel).not.toMatch(/^Posted/)
    }
  })

  it('does not let a badged duplicate of the title shift the other fields', () => {
    const job = host.harvest().find((j) => j.id === '4313725078')!
    expect(job.title).toBe('Senior Backend Engineer (Verified job)')
    expect(job.company).toBe('Example Delivery')
    expect(job.location).toBe('Doha, Qatar')
  })

  it('notices a card the user already dismissed', () => {
    const jobs = host.harvest()
    expect(jobs.find((j) => j.id === '4443111111')!.dismissed).toBe(true)
    expect(jobs.filter((j) => !j.dismissed)).toHaveLength(3)
  })

  it('falls back to a canonical url when the card has no link', () => {
    expect(host.harvest().find((j) => j.id === '4443111111')!.url).toBe(
      'https://www.linkedin.com/jobs/view/4443111111/',
    )
  })

  it('reports an empty page instead of pretending', () => {
    document.body.innerHTML = '<div></div>'
    expect(new JobsHost().isReady()).toBe(false)
    expect(new JobsHost().harvest()).toHaveLength(0)
  })
})
