import { dismissJob, jobFilter, jobs, jobsWarmingUp, openJob, selectedJob, visibleJobs } from '../state/jobs'
import { JobDetail } from './JobDetail'
import { Avatar, Button, Chip, EmptyState, FilterBar, Row, SearchBox, Skeleton, Tabs } from './kit'
import { Rail } from './Rail'

export function JobsPage() {
  const list = visibleJobs.value
  const total = jobs.value.length
  const open = jobs.value.find((j) => j.id === selectedJob.value)

  return (
    <div class="root">
      <div class="shell">
        <Rail current="Jobs" />

        <main class="feed">
          {open ? (
            <JobDetail job={open} />
          ) : (
            <>
          <Tabs
            tabs={[
              { label: 'Search', active: true },
              { label: 'Recommended', href: 'https://www.linkedin.com/jobs/collections/recommended/' },
              { label: 'Saved', href: 'https://www.linkedin.com/my-items/saved-jobs/' },
            ]}
          />

          <FilterBar
            active={jobFilter.value}
            onSelect={(key) => {
              jobFilter.value = key
            }}
            filters={[
              { key: 'all', label: `All${total ? ` ${total}` : ''}` },
              { key: 'organic', label: 'No ads' },
              { key: 'remote', label: 'Remote' },
              { key: 'easy', label: 'Easy Apply' },
              { key: 'recent', label: 'This week' },
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
            <EmptyState
              title={total > 0 ? 'Nothing matches that filter' : 'No jobs here'}
              action={
                total > 0 ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      jobFilter.value = 'all'
                    }}
                  >
                    Clear the filter
                  </Button>
                ) : undefined
              }
            >
              {total > 0
                ? `${total} job${total === 1 ? '' : 's'} loaded, none of them fit.`
                : 'LinkedIn returned no results for this search.'}
            </EmptyState>
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
            </>
          )}
        </main>

        <aside class="aside">
          <SearchBox />
          <div class="card">
            <h2>This search</h2>
            <div class="stat">
              <b>{list.length}</b>
              <span>{list.length === total ? 'jobs listed' : `of ${total} shown`}</span>
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
