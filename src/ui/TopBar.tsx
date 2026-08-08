import { saveSettings } from '../lib/settings'
import { hiddenCount, settings, visiblePosts } from '../state/store'
import { BellIcon, GearIcon, HomeIcon, JobsIcon, MessagesIcon, MoonIcon, NetworkIcon, SunIcon } from './icons'

/**
 * The rest of LinkedIn, one click away.
 *
 * We only take over `/feed`, so these are ordinary links to LinkedIn's own
 * pages: following one navigates the page, our overlay unmounts, and the user
 * gets the real thing. That keeps every LinkedIn feature reachable without
 * pretending we have reimplemented messaging or jobs.
 */
const DESTINATIONS = [
  { href: 'https://www.linkedin.com/feed/', label: 'Home', Icon: HomeIcon, current: true },
  { href: 'https://www.linkedin.com/mynetwork/', label: 'My Network', Icon: NetworkIcon, current: false },
  { href: 'https://www.linkedin.com/jobs/', label: 'Jobs', Icon: JobsIcon, current: false },
  { href: 'https://www.linkedin.com/messaging/', label: 'Messaging', Icon: MessagesIcon, current: false },
  { href: 'https://www.linkedin.com/notifications/', label: 'Notifications', Icon: BellIcon, current: false },
]

export function TopBar() {
  const dark = settings.value.theme !== 'light'
  const shown = visiblePosts.value.length

  return (
    <header class="topbar">
      <div class="inner">
        <span class="wordmark">
          linkedin<b>-x</b>
        </span>

        <nav class="nav" aria-label="LinkedIn">
          {DESTINATIONS.map(({ href, label, Icon, current }) => (
            <a key={href} href={href} title={label} aria-label={label} aria-current={current ? 'page' : undefined}>
              <Icon />
            </a>
          ))}
        </nav>

        <div class="bar-right">
          <span class="counter">
            {shown}
            {hiddenCount.value > 0 ? ` · ${hiddenCount.value} filtered` : ''}
          </span>
          <button
            class="icon-btn"
            aria-label={dark ? 'Switch to light' : 'Switch to dark'}
            title={dark ? 'Light theme' : 'Dark theme'}
            onClick={() => void saveSettings({ theme: dark ? 'light' : 'dark' })}
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
          <button
            class="icon-btn"
            title="Show the original LinkedIn"
            aria-label="Show the original LinkedIn"
            onClick={() => void saveSettings({ enabled: false })}
          >
            <GearIcon />
          </button>
        </div>
      </div>
    </header>
  )
}
