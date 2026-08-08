import type { RawJob } from '../host/jobs-host'
import { closeJob, jobDetail, jobDetailLoading } from '../state/jobs'
import { Avatar, Button, Chip, EmptyState, Skeleton } from './kit'

/**
 * A job on its own, in the centre column.
 *
 * Title, company, location and the badges come from the card we already read;
 * only the description and the conditions come from LinkedIn's detail pane,
 * which is both less to parse and less to get wrong.
 */
export function JobDetail({ job }: { job: RawJob }) {
  const detail = jobDetail.value

  return (
    <>
      <div class="kit-head thread-head">
        <button class="thread-back" onClick={closeJob} aria-label="Back to the results">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <span>Job</span>
      </div>

      <article class="thread-post">
        <div class="thread-actor">
          <Avatar src={job.logoUrl} name={job.company} shape="square" size={48} />
          <div>
            <div class="job-detail-title">{job.title}</div>
            <div class="headline">
              {job.company}
              {job.location && <span class="dim"> · {job.location}</span>}
            </div>
          </div>
        </div>

        <div class="job-foot" style="margin-top:12px">
          {job.postedLabel && <span class="dim">{job.postedLabel}</span>}
          {detail?.conditions.map((c) => (
            <Chip key={c}>{c}</Chip>
          ))}
          {job.badges.map((b) => (
            <Chip key={b} muted={/promoted|продвиг/i.test(b)}>
              {b}
            </Chip>
          ))}
        </div>

        <div class="job-detail-actions">
          <a
            class="kit-btn kit-btn--primary kit-btn--md"
            href={detail?.applyUrl ?? job.url}
            target="_blank"
            rel="noreferrer noopener"
          >
            <span class="kit-btn__label">{detail?.applyLabel ?? 'Apply on LinkedIn'}</span>
          </a>
          <Button variant="outline" onClick={closeJob}>
            Back to results
          </Button>
        </div>
      </article>

      {jobDetailLoading.value && !detail && (
        <>
          <Skeleton lines={4} lead={false} />
          <Skeleton lines={3} lead={false} />
        </>
      )}

      {!jobDetailLoading.value && !detail && (
        <EmptyState
          title="No description to show"
          action={
            <a class="kit-btn kit-btn--outline kit-btn--md" href={job.url} target="_blank" rel="noreferrer noopener">
              <span class="kit-btn__label">Open it on LinkedIn</span>
            </a>
          }
        >
          LinkedIn did not render a description for this listing where we could read it.
        </EmptyState>
      )}

      {detail && <div class="job-description">{detail.description}</div>}
    </>
  )
}
