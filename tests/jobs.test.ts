import { beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { dedupeBadges, JobsHost } from '../src/host/jobs-host'

const fixture = readFileSync(resolve(__dirname, 'fixtures/jobs-sdui.html'), 'utf8')
const legacy = readFileSync(resolve(__dirname, 'fixtures/jobs-legacy.html'), 'utf8')

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

describe('the legacy /jobs/collections list', () => {
  let host: JobsHost

  beforeEach(() => {
    document.body.innerHTML = legacy
    host = new JobsHost()
  })

  it('reads a generation with no componentkey at all', () => {
    expect(host.isReady()).toBe(true)
    expect(host.harvest()).toHaveLength(3)
    expect(host.harvest()[0]!.id).toBe('4441442094')
  })

  it('keeps badges out of the title, company and location', () => {
    const [first] = host.harvest()
    expect(first!.title).toBe('Senior Field Development Specialist')
    expect(first!.company).toBe('Example Medical')
    expect(first!.location).toBe('Almaty, Kazakhstan (Remote)')
    expect(first!.postedLabel).toBe('')
  })

  it('collects the badges instead of dropping them', () => {
    const promoted = host.harvest().find((j) => j.id === '4448154059')!
    expect(promoted.badges).toContain('Promoted')
    expect(promoted.badges).toContain('Easy Apply')
    expect(promoted.location).toBe('Kazakhstan (Remote)')
  })

  it('does not mistake "1 day ago" for a badge, or a badge for the age', () => {
    const job = host.harvest().find((j) => j.id === '4450059387')!
    expect(job.postedLabel).toBe('1 day ago')
    expect(job.badges).toEqual(['Easy Apply'])
    expect(job.company).toBe('Example Genome')
  })

  it('takes the canonical job url, not the tracking one', () => {
    expect(host.harvest()[0]!.url).toContain('/jobs/view/4441442094/')
  })
})

describe('occlusion and duplicate badges', () => {
  it('skips virtualised cards that carry an id but render nothing', () => {
    // The collections list keeps offscreen <li>s in the DOM as empty shells.
    document.body.innerHTML = `
      <ul>
        <li data-occludable-job-id="1"><a href="/jobs/view/1/"><span>Real Job</span></a><div><span>Example</span></div></li>
        <li data-occludable-job-id="2"></li>
        <li data-occludable-job-id="3"></li>
      </ul>`
    const jobs = new JobsHost().harvest()
    expect(jobs).toHaveLength(1)
    expect(jobs[0]!.title).toBe('Real Job')
  })

  it('collapses a badge LinkedIn prints twice', () => {
    expect(dedupeBadges(['168 company alumni work here', '168 Microsoft company alumni work here'])).toEqual([
      'company alumni work here',
    ])
  })

  it('keeps genuinely different badges', () => {
    expect(dedupeBadges(['Promoted', 'Easy Apply', 'Viewed'])).toEqual(['Promoted', 'Easy Apply', 'Viewed'])
  })
})
