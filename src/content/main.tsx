import { render } from 'preact'
import kit from '../ui/kit.css?inline'
import styles from '../ui/styles.css?inline'
import { fontFaceCss } from '../ui/fonts'
import { DomHost } from '../host/dom-host'
import { JobsHost } from '../host/jobs-host'
import { attachHost, ingest, markBroken, settings, warmingUp } from '../state/store'
import { attachJobsHost, ingestJobs, jobsWarmingUp } from '../state/jobs'
import { JobsPage } from '../ui/JobsPage'
import { NetworkHost } from '../host/network-host'
import { ProfileHost } from '../host/profile-host'
import { CompanyHost } from '../host/company-host'
import { SavedHost } from '../host/saved-host'
import { NotificationsHost } from '../host/notifications-host'
import { BadgesHost } from '../host/badges-host'
import { MessagingHost } from '../host/messaging-host'
import { ingestConversations, MessagingPage, messagingWarmingUp } from '../ui/MessagingPage'
import { badges } from '../ui/Rail'
import {
  attachNotificationsHost,
  ingestNotifications,
  NotificationsPage,
  notificationsWarmingUp,
} from '../ui/NotificationsPage'
import { ingestSaved, SavedPage, savedWarmingUp } from '../ui/SavedPage'
import { attachCompanyHost, CompanyPage, ingestCompany } from '../ui/CompanyPage'
import { attachProfileHost, ingestProfile, ProfilePage, profileWarmingUp } from '../ui/ProfilePage'
import { attachNetworkHost, ingestPeople, NetworkPage, networkWarmingUp } from '../ui/NetworkPage'
import { cachedSettings, loadSettings, onSettingsChanged, type AppSettings } from '../lib/settings'
import { App } from '../ui/App'

const MOUNT_ID = 'linkedin-x-root'

/**
 * Which LinkedIn page we take over, and with what.
 *
 * Everything not listed here is left to LinkedIn: the rail links out to those
 * pages and the overlay unmounts when you follow one. Adding a surface means
 * a matcher, a host that reads that page, and a view — nothing in the ones
 * already here has to change.
 */
type SurfaceName = 'feed' | 'jobs' | 'network' | 'profile' | 'company' | 'saved' | 'notifications' | 'messaging'

const SURFACES: Array<{ name: SurfaceName; match: RegExp }> = [
  { name: 'feed', match: /^\/feed\/?$/ },
  { name: 'jobs', match: /^\/jobs\/(search|search-results|collections)/ },
  { name: 'network', match: /^\/mynetwork\// },
  { name: 'profile', match: /^\/in\/[^/]+/ },
  { name: 'company', match: /^\/company\/[^/]+/ },
  { name: 'saved', match: /^\/my-items\// },
  { name: 'notifications', match: /^\/notifications\// },
  { name: 'messaging', match: /^\/messaging\/?$/ },
  // Search results and a shared post link both render exactly the post markup
  // the feed does, so the feed surface reads them without a reader of its own.
  { name: 'feed', match: /^\/search\/results\// },
  { name: 'feed', match: /^\/feed\/update\// },
]

function currentSurface(): SurfaceName | null {
  return SURFACES.find((s) => s.match.test(location.pathname))?.name ?? null
}
const WARMUP_EVERY_MS = 500
const WARMUP_TRIES = 40 // 20 seconds

const host = new DomHost()
const jobsHost = new JobsHost()
const networkHost = new NetworkHost()
const profileHost = new ProfileHost()
const companyHost = new CompanyHost()
const savedHost = new SavedHost()
const notificationsHost = new NotificationsHost()
const badgesHost = new BadgesHost()
const messagingHost = new MessagingHost()
let shadowHost: HTMLElement | null = null
let unobserve: (() => void) | null = null
let warmUpTimer: number | null = null
let unbadge: (() => void) | null = null
let wired = false
let mountedSurface: SurfaceName | null = null

// Dark only, by design: see DESIGN.md. The setting is kept in storage so an
// older profile does not break, but nothing reads it any more.
const THEME = 'dark'

/**
 * Publishes the diagnostic where a person can actually reach it.
 *
 * A content script runs in an isolated world, so anything it hangs off
 * `window` is invisible to the DevTools console, which evaluates in the
 * page's world. Writing the report to a data attribute crosses that boundary,
 * because the DOM is the one thing both worlds share.
 */
function publishDoctor(): void {
  try {
    document.documentElement.dataset.linkedinXDoctor = JSON.stringify(host.doctor())
  } catch {
    // a report we cannot serialise is not worth breaking the feed over
  }
}

/**
 * Puts the overlay on screen. Called synchronously at `document_start`, before
 * LinkedIn has painted anything, which is the whole point: mounting later is
 * what made the old design flash into view and then get replaced.
 *
 * At `document_start` there is no `document.body` yet, so the host element
 * goes on `documentElement`, which always exists.
 */
function mount(surface: SurfaceName): void {
  if (shadowHost && mountedSurface === surface) return
  if (shadowHost) unmount()
  mountedSurface = surface

  shadowHost = document.createElement('div')
  shadowHost.id = MOUNT_ID
  shadowHost.setAttribute('data-theme', THEME)
  const shadow = shadowHost.attachShadow({ mode: 'open' })

  const sheet = document.createElement('style')
  sheet.textContent = [fontFaceCss(), kit, styles].join("\n")
  shadow.append(sheet)

  const container = document.createElement('div')
  shadow.append(container)
  document.documentElement.append(shadowHost)

  // The overlay covers LinkedIn rather than deleting it, so the native feed
  // keeps virtualising and lazy-loading exactly as it would without us.
  // Stopping the page behind us from scrolling would break that, so we only
  // suppress the scrollbar, not the scrolling.
  document.documentElement.style.setProperty('scrollbar-width', 'none')

  // The rail replaces LinkedIn's nav, so the unread counts have to be lifted
  // off it — otherwise the only way to notice a new message is to leave.
  // Watched here rather than per surface: every surface has the rail.
  badges.value = badgesHost.read()
  unbadge = badgesHost.observe((next) => {
    badges.value = next
  })

  render(
    surface === 'jobs' ? (
      <JobsPage />
    ) : surface === 'network' ? (
      <NetworkPage />
    ) : surface === 'profile' ? (
      <ProfilePage />
    ) : surface === 'company' ? (
      <CompanyPage />
    ) : surface === 'saved' ? (
      <SavedPage />
    ) : surface === 'notifications' ? (
      <NotificationsPage />
    ) : surface === 'messaging' ? (
      <MessagingPage />
    ) : (
      <App />
    ),
    container,
  )
}

/**
 * Starts reading the feed. Deliberately not part of `mount`: at
 * `document_start` there is nothing to read yet, and a MutationObserver
 * attached that early would fire on every node the parser creates.
 */
function wire(): void {
  if (wired || !shadowHost) return
  wired = true


  if (mountedSurface === 'messaging') {
    ingestConversations(messagingHost.harvest())
    unobserve = messagingHost.observe(ingestConversations)
    setTimeout(() => {
      messagingWarmingUp.value = false
    }, 5000)
    return
  }

  if (mountedSurface === 'notifications') {
    attachNotificationsHost(notificationsHost)
    ingestNotifications(notificationsHost.harvest())
    unobserve = notificationsHost.observe(ingestNotifications)
    setTimeout(() => {
      notificationsWarmingUp.value = false
    }, 5000)
    return
  }

  if (mountedSurface === 'saved') {
    ingestSaved(savedHost.harvest())
    unobserve = savedHost.observe(ingestSaved)
    setTimeout(() => {
      savedWarmingUp.value = false
    }, 5000)
    return
  }

  if (mountedSurface === 'company') {
    // The header is its own reader; the posts below it are ordinary feed
    // posts, so the feed reader handles those rather than a second parser.
    attachCompanyHost(companyHost)
    ingestCompany(companyHost.harvest())
    attachHost(host)
    ingest(host.harvest())

    const stopCompany = companyHost.observe(ingestCompany)
    const stopPosts = host.observe(ingest)
    unobserve = () => {
      stopCompany()
      stopPosts()
    }
    startWarmUp()
    return
  }

  if (mountedSurface === 'profile') {
    attachProfileHost(profileHost)
    ingestProfile(profileHost.harvest())
    unobserve = profileHost.observe(ingestProfile)
    setTimeout(() => {
      profileWarmingUp.value = false
    }, 6000)
    return
  }

  if (mountedSurface === 'network') {
    attachNetworkHost(networkHost)
    ingestPeople(networkHost.harvest())
    unobserve = networkHost.observe(ingestPeople)
    setTimeout(() => {
      networkWarmingUp.value = false
    }, 4000)
    return
  }

  if (mountedSurface === 'jobs') {
    attachJobsHost(jobsHost)
    ingestJobs(jobsHost.harvest())
    unobserve = jobsHost.observe(ingestJobs)
    // Job results arrive with the document rather than trickling in, so the
    // feed's twenty-second warm-up would only delay the empty state.
    setTimeout(() => {
      jobsWarmingUp.value = false
    }, 4000)
    return
  }

  attachHost(host)
  ingest(host.harvest())
  publishDoctor()

  unobserve = host.observe((posts) => {
    ingest(posts)
    publishDoctor()
  })

  startWarmUp()
}

function whenDomReady(fn: () => void): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true })
  } else {
    fn()
  }
}

/**
 * The server-driven feed is usually empty when the document finishes parsing
 * and fills in over the next few seconds. The MutationObserver should catch
 * that, but it is the single point of failure for the whole extension, so
 * this polls alongside it until posts show up.
 *
 * It also decides the difference between "not loaded yet" and "genuinely
 * broken": if the feed ends up full of list items and we still cannot read a
 * post out of any of them, that is the kill switch's cue.
 */
function startWarmUp(): void {
  let tries = 0
  stopWarmUp()
  warmingUp.value = true

  warmUpTimer = window.setInterval(() => {
    tries++
    const posts = host.harvest()

    if (posts.length > 0) {
      ingest(posts)
      publishDoctor()
      warmingUp.value = false
      stopWarmUp()
      return
    }

    if (tries >= WARMUP_TRIES) {
      stopWarmUp()
      warmingUp.value = false
      publishDoctor()
      const { listItemsInFeed, feedRootFound } = host.doctor()
      if (listItemsInFeed > 0) {
        markBroken(`Found ${listItemsInFeed} items in the feed but could not read a post out of any of them.`)
      } else if (feedRootFound) {
        markBroken('Found the feed container, but it never rendered anything we recognise as a post.')
      }
    }
  }, WARMUP_EVERY_MS)
}

function stopWarmUp(): void {
  if (warmUpTimer !== null) {
    clearInterval(warmUpTimer)
    warmUpTimer = null
  }
}

function unmount(): void {
  stopWarmUp()
  unobserve?.()
  unobserve = null
  unbadge?.()
  unbadge = null
  wired = false
  shadowHost?.remove()
  shadowHost = null
  mountedSurface = null
  document.documentElement.style.removeProperty('scrollbar-width')
  delete document.documentElement.dataset.linkedinXDoctor
}

function applySettings(next: AppSettings): void {
  settings.value = next

  const surface = currentSurface()
  if (next.enabled && surface) {
    mount(surface)
    whenDomReady(wire)
  } else {
    unmount()
  }
}

// Runs at document_start, before the page paints. The cached settings are a
// hint: if the real ones disagree, the overlay is corrected a few
// milliseconds later, which is a far smaller artefact than watching LinkedIn
// render and then get covered.
applySettings(cachedSettings())

async function boot(): Promise<void> {
  applySettings(await loadSettings())
  onSettingsChanged(applySettings)

  // LinkedIn is a single-page app: leaving /feed never reloads the document,
  // so there is no unload event to hook. Poll the path instead; it is one
  // string comparison a second.
  let lastPath = location.pathname
  setInterval(() => {
    if (location.pathname === lastPath) return
    lastPath = location.pathname
    applySettings(settings.value)
  }, 1000)

  // Reachable from the isolated world only; the data attribute above is what
  // the console sees. Both are kept because they cost nothing.
  Object.defineProperty(window, '__linkedinX', {
    value: { doctor: () => host.doctor(), harvest: () => host.harvest(), publish: publishDoctor },
    configurable: true,
  })
}

void boot()
