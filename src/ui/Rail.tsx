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
  { href: 'https://www.linkedin.com/jobs/', label: 'Jobs', Icon: JobsIcon },
  { href: 'https://www.linkedin.com/my-items/saved-posts/', label: 'Saved', Icon: BookmarkIcon },
  { href: 'https://www.linkedin.com/in/', label: 'Profile', Icon: ProfileIcon },
]

export function Rail({ current = 'Home' }: { current?: string }) {
  return (
    <nav class="rail" aria-label="LinkedIn">
      <div class="brand">
        <span class="glyph">x</span>
        <span>linkedin-x</span>
      </div>

      {LINKS.map(({ href, label, Icon }) => (
        <a key={href} class="rail-link" href={href} aria-current={label === current ? 'page' : undefined} title={label}>
          <Icon />
          <span>{label}</span>
        </a>
      ))}

      <a class="post-cta" href="https://www.linkedin.com/feed/?shareActive=true" title="Write a post">
        <span>Post</span>
        <PenIcon />
      </a>

      <div class="rail-foot">
        Reading LinkedIn through linkedin-x.
        <br />
        Everything above opens the real LinkedIn.
      </div>
    </nav>
  )
}
