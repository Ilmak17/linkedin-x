import { dismissJob, jobs, jobsWarmingUp, openJob, selectedJob } from '../state/jobs'
import { Avatar, Button, Chip, EmptyState, Row, Skeleton, Tabs } from './kit'
import { Rail } from './Rail'

export function JobsPage() {
  const list = jobs.value

  return (
    <div class="root">
      <div class="shell">
        <Rail current="Jobs" />

        <main class="feed">
          <Tabs
            tabs={[
              { label: 'Search', active: true },
              { label: 'Recommended', href: 'https://www.linkedin.com/jobs/collections/recommended/' },
              { label: 'Saved', href: 'https://www.linkedin.com/my-items/saved-jobs/' },
            ]}
          />

          {list.length === 0 && jobsWarmingUp.value && (
            <>
              <Skeleton lines={3} />
              <Skeleton lines={3} />
              <Skeleton lines={3} />
            </>
          )}

          {list.length === 0 && !jobsWarmingUp.value && (
            <EmptyState title="No jobs here">LinkedIn returned no results for this search.</EmptyState>
          )}

          {list.map((job) => (
            <Row
              key={job.id}
              selected={selectedJob.value === job.id}
              onClick={() => openJob(job.id)}
              lead={<Avatar src={job.logoUrl} name={job.company} shape="square" size={48} />}
              trail={
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Dismiss ${job.title}`}
                  title="Not interested"
                  onClick={(e) => {
                    e.stopPropagation()
                    dismissJob(job.id)
                  }}
                >
                  Hide
                </Button>
              }
            >
              <div class="job-title">{job.title}</div>
              <div class="job-meta">
                {job.company}
                {job.location && <span class="dim"> · {job.location}</span>}
              </div>
              <div class="job-foot">
                {job.postedLabel && <span class="dim">{job.postedLabel}</span>}
                {job.badges.map((b) => (
                  <Chip key={b} muted={/promoted|продвиг/i.test(b)}>
                    {b}
                  </Chip>
                ))}
              </div>
            </Row>
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
                Opens in LinkedIn's own pane
                <span class="sub">We list the results; LinkedIn keeps the detail and the application</span>
              </label>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
