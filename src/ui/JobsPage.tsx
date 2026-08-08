import { jobs, jobsWarmingUp, dismissJob, openJob, selectedJob } from '../state/jobs'
import { Rail } from './Rail'
import { JobsIcon } from './icons'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '·'
}

export function JobsPage() {
  const list = jobs.value

  return (
    <div class="root">
      <div class="shell shell--jobs">
        <Rail current="Jobs" />

        <main class="feed">
          <div class="feed-head">
            <div class="tabs" role="tablist">
              <button class="tab" role="tab" aria-selected="true">
                Jobs
              </button>
              <a class="tab" role="tab" aria-selected="false" href="https://www.linkedin.com/jobs/">
                Recommended
              </a>
            </div>
          </div>

          {list.length === 0 && jobsWarmingUp.value && (
            <>
              <div class="skeleton">
                <div class="sk-avatar" />
                <div class="sk-body">
                  <div class="sk-line" style="width:52%" />
                  <div class="sk-line" style="width:34%" />
                  <div class="sk-line" style="width:24%" />
                </div>
              </div>
              <div class="skeleton">
                <div class="sk-avatar" />
                <div class="sk-body">
                  <div class="sk-line" style="width:44%" />
                  <div class="sk-line" style="width:38%" />
                  <div class="sk-line" style="width:20%" />
                </div>
              </div>
            </>
          )}

          {list.length === 0 && !jobsWarmingUp.value && (
            <div class="state">
              <h2>No jobs here</h2>
              <p>LinkedIn returned no results for this search.</p>
            </div>
          )}

          {list.map((job) => (
            <article
              class={`post job${selectedJob.value === job.id ? ' selected' : ''}`}
              key={job.id}
              onClick={() => openJob(job.id)}
            >
              <div class="avatar avatar--square">
                {job.logoUrl ? <img src={job.logoUrl} alt="" loading="lazy" /> : <span>{initials(job.company)}</span>}
              </div>

              <div class="body">
                <div class="job-title">{job.title}</div>
                <div class="job-meta">
                  {job.company}
                  {job.location && <span class="sep"> · </span>}
                  {job.location}
                </div>
                {job.postedLabel && <div class="job-posted">{job.postedLabel}</div>}
              </div>

              <button
                class="job-dismiss"
                aria-label={`Dismiss ${job.title}`}
                title="Not interested"
                onClick={(e) => {
                  e.stopPropagation()
                  dismissJob(job.id)
                }}
              >
                ×
              </button>
            </article>
          ))}
        </main>

        <aside class="aside">
          <div class="card">
            <h2>This search</h2>
            <div class="stat">
              <b>{list.length}</b>
              <span>jobs listed</span>
            </div>
          </div>
          <div class="card">
            <div class="row">
              <label>
                Clicking a job opens it in LinkedIn's own pane
                <span class="sub">We list; LinkedIn still shows the detail and takes the application</span>
              </label>
            </div>
            <a class="foot" href="https://www.linkedin.com/jobs/" target="_blank" rel="noreferrer noopener">
              <JobsIcon /> Open LinkedIn Jobs
            </a>
          </div>
        </aside>
      </div>
    </div>
  )
}
