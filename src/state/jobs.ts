import { signal } from '@preact/signals'
import type { JobsHost, RawJob } from '../host/jobs-host'

export const jobs = signal<RawJob[]>([])
export const jobsWarmingUp = signal(true)
export const selectedJob = signal<string | null>(null)

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
  host?.open(id)
}

export function dismissJob(id: string): void {
  if (host?.dismiss(id)) jobs.value = jobs.value.filter((j) => j.id !== id)
}
