import { signal } from '@preact/signals'
import {
  BellIcon,
  BookmarkIcon,
  HomeIcon,
  JobsIcon,
  MessagesIcon,
  NetworkIcon,
  PenIcon,
  ProfileIcon,
  SearchIcon,
} from './icons'

/**
 * The rest of LinkedIn, one click away.
 *
 * We only take over `/feed`, so these are ordinary links to LinkedIn's own
 * pages: following one navigates the page, our overlay unmounts, and the user
 * gets the real thing. Nothing here pretends we have reimplemented messaging
 * or jobs.
 */
const LINKS = [
  { href: 'https://www.linkedin.com/feed/', label: 'Home', Icon: HomeIcon },
  { href: 'https://www.linkedin.com/search/results/all/', label: 'Search', Icon: SearchIcon },
  { href: 'https://www.linkedin.com/notifications/', label: 'Notifications', Icon: BellIcon },
  { href: 'https://www.linkedin.com/messaging/', label: 'Messages', Icon: MessagesIcon },
  { href: 'https://www.linkedin.com/mynetwork/', label: 'Network', Icon: NetworkIcon },
  { href: 'https://www.linkedin.com/jobs/collections/recommended/', label: 'Jobs', Icon: JobsIcon },
  { href: 'https://www.linkedin.com/my-items/saved-posts/', label: 'Saved', Icon: BookmarkIcon },
  { href: 'https://www.linkedin.com/in/', label: 'Profile', Icon: ProfileIcon },
]

/** Unread counts lifted off LinkedIn's own nav, which our overlay covers. */
export const badges = signal<Record<string, number>>({})

export function Rail({ current = 'Home' }: { current?: string }) {
  return (
    <nav class="rail" aria-label="LinkedIn">
      <a class="brand" href="https://www.linkedin.com/feed/" aria-label="linkedin-x" title="linkedin-x">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 3h4.6l5 6.9L18.7 3H21l-7.2 8.4L21.4 21h-4.6l-5.4-7.4L4.7 21H2.4l7.7-9z" />
        </svg>
      </a>

      {LINKS.map(({ href, label, Icon }) => (
        <a key={href} class="rail-link" href={href} aria-current={label === current ? 'page' : undefined} title={label}>
          <span class="rail-icon">
            <Icon />
            {badges.value[label] ? (
              <span class="rail-badge" aria-label={`${badges.value[label]} unread`}>
                {badges.value[label]! > 99 ? '99+' : badges.value[label]}
              </span>
            ) : null}
          </span>
          <span>{label}</span>
        </a>
      ))}

      <a class="post-cta" href="https://www.linkedin.com/feed/?shareActive=true" title="Write a post">
        <span>Post</span>
        <PenIcon />
      </a>

      <div class="rail-foot">
        <kbd>j</kbd> <kbd>k</kbd> move · <kbd>l</kbd> like · <kbd>s</kbd> save
        <br />
        <kbd>enter</kbd> comments · <kbd>/</kbd> search
      </div>
    </nav>
  )
}
