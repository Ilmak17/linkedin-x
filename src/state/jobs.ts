import { computed, signal } from '@preact/signals'
import type { JobsHost, RawJob, RawJobDetail } from '../host/jobs-host'

export const jobs = signal<RawJob[]>([])
export const jobsWarmingUp = signal(true)
export const selectedJob = signal<string | null>(null)
export const jobFilter = signal('all')
export const jobDetail = signal<RawJobDetail | null>(null)
export const jobDetailLoading = signal(false)

/**
 * Filtering happens over what we already read, so it costs nothing and
 * needs no round trip to LinkedIn. Remote is decided by the location string,
 * which is where LinkedIn puts it.
 */
/**
 * Days per unit, most specific first. Order is the whole trick: a pattern for
 * minutes that allows a bare "m" also matches "month", which read a month-old
 * listing as posted minutes ago.
 */
const UNITS: Array<[RegExp, number]> = [
  [/^(month|mo|мес)/i, 30],
  [/^(minute|min|мин)/i, 0],
  [/^(week|wk|недел|нед)/i, 7],
  [/^(hour|hr|час)/i, 0],
  [/^(day|дн|день|дня|дней)/i, 1],
  [/^(year|yr|год|года|лет)/i, 365],
  [/^m$/i, 0],
  [/^h$/i, 0],
  [/^d$/i, 1],
  [/^w$/i, 7],
  [/^y$/i, 365],
]

/**
 * "3 days ago", "5 hours ago", "1 month ago" — LinkedIn's own phrasing, in
 * whichever language the member reads it in.
 */
export function isRecent(label: string, withinDays = 7): boolean {
  const match = label.match(/(\d+)\s*([a-zа-яё]+)/i)
  if (!match) return false

  const amount = Number(match[1])
  const unit = match[2] ?? ''
  const perUnit = UNITS.find(([re]) => re.test(unit))?.[1]
  if (perUnit === undefined) return false

  return amount * perUnit <= withinDays
}

export const visibleJobs = computed(() => {
  const all = jobs.value
  switch (jobFilter.value) {
    case 'remote':
      return all.filter((j) => /remote|удал/i.test(j.location))
    case 'easy':
      return all.filter((j) => j.badges.some((b) => /easy apply/i.test(b)))
    case 'recent':
      return all.filter((j) => isRecent(j.postedLabel))
    case 'organic':
      return all.filter((j) => !j.badges.some((b) => /promoted|продвиг/i.test(b)))
    default:
      return all
  }
})

let host: JobsHost

export function attachJobsHost(h: JobsHost): void {
  host = h
}

export function ingestJobs(next: RawJob[]): void {
  // LinkedIn renders the same card twice while the detail pane is open, so the
  // harvest is deduplicated by id before it reaches the view.
  jobs.value = next.filter((j) => !j.dismissed)
  if (next.length > 0) jobsWarmingUp.value = false
}

export function openJob(id: string): void {
  selectedJob.value = id
  jobDetail.value = null
  jobDetailLoading.value = true
  host?.open(id)

  // LinkedIn renders the detail into its own pane after the click; poll for it
  // rather than guessing a delay, and give up rather than spin forever.
  let tries = 0
  const timer = setInterval(() => {
    tries++
    const detail = host?.detail() ?? null
    if (detail || tries > 24) {
      jobDetail.value = detail
      jobDetailLoading.value = false
      clearInterval(timer)
    }
  }, 250)
}

export function closeJob(): void {
  selectedJob.value = null
  jobDetail.value = null
}

export function dismissJob(id: string): void {
  if (host?.dismiss(id)) jobs.value = jobs.value.filter((j) => j.id !== id)
}
