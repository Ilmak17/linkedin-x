import { beforeEach, describe, expect, it } from 'vitest'
import type { RawJob } from '../src/host/jobs-host'
import { isRecent, jobFilter, jobs, visibleJobs } from '../src/state/jobs'

const job = (over: Partial<RawJob>): RawJob => ({
  id: Math.random().toString(36).slice(2),
  title: 'Engineer',
  company: 'Example',
  location: 'Astana',
  postedLabel: '2 weeks ago',
  badges: [],
  logoUrl: null,
  url: 'https://www.linkedin.com/jobs/view/1/',
  dismissed: false,
  ...over,
})

describe('job filters', () => {
  beforeEach(() => {
    jobFilter.value = 'all'
    jobs.value = [
      job({ id: 'remote-easy', location: 'Almaty (Remote)', badges: ['Easy Apply'], postedLabel: '3 days ago' }),
      job({ id: 'onsite-ad', location: 'Astana (On-site)', badges: ['Promoted'], postedLabel: '1 month ago' }),
      job({ id: 'plain', location: 'Astana', postedLabel: '5 hours ago' }),
    ]
  })

  it('shows everything by default', () => {
    expect(visibleJobs.value).toHaveLength(3)
  })

  it('reads remote off the location, which is where LinkedIn puts it', () => {
    jobFilter.value = 'remote'
    expect(visibleJobs.value.map((j) => j.id)).toEqual(['remote-easy'])
  })

  it('filters by the Easy Apply badge', () => {
    jobFilter.value = 'easy'
    expect(visibleJobs.value.map((j) => j.id)).toEqual(['remote-easy'])
  })

  it('drops promoted listings without dropping the rest', () => {
    jobFilter.value = 'organic'
    expect(visibleJobs.value.map((j) => j.id)).toEqual(['remote-easy', 'plain'])
  })

  it('counts hours and a few days as this week, but not a month', () => {
    jobFilter.value = 'recent'
    expect(visibleJobs.value.map((j) => j.id)).toEqual(['remote-easy', 'plain'])
  })

  it('leaves the underlying list alone, so clearing a filter restores it', () => {
    jobFilter.value = 'remote'
    expect(visibleJobs.value).toHaveLength(1)
    jobFilter.value = 'all'
    expect(visibleJobs.value).toHaveLength(3)
  })
})

describe('isRecent', () => {
  it.each([
    ['5 hours ago', true],
    ['1 hour ago', true],
    ['30 minutes ago', true],
    ['3 days ago', true],
    ['7 days ago', true],
    ['2 weeks ago', false],
    ['1 month ago', false],
    ['8 months ago', false],
    ['1 year ago', false],
    ['', false],
    ['just now', false],
  ])('reads %s as recent=%s', (label, expected) => {
    expect(isRecent(label)).toBe(expected)
  })

  it('counts a single week as within seven days', () => {
    expect(isRecent('1 week ago')).toBe(true)
  })

  it('does not read a month as minutes, which a bare "m" pattern does', () => {
    expect(isRecent('1 month ago')).toBe(false)
    expect(isRecent('1 minute ago')).toBe(true)
  })

  it('reads the same labels in Russian', () => {
    expect(isRecent('5 часов назад')).toBe(true)
    expect(isRecent('3 дня назад')).toBe(true)
    expect(isRecent('2 месяца назад')).toBe(false)
  })
})
