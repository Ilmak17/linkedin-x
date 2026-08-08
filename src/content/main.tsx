import { render } from 'preact'
import styles from '../ui/styles.css?inline'
import { fontFaceCss } from '../ui/fonts'
import { DomHost } from '../host/dom-host'
import { attachHost, ingest, markBroken, settings, warmingUp } from '../state/store'
import { cachedSettings, loadSettings, onSettingsChanged, type AppSettings } from '../lib/settings'
import { App } from '../ui/App'

const MOUNT_ID = 'linkedin-x-root'
const FEED_PATH = /^\/feed\/?$/
const WARMUP_EVERY_MS = 500
const WARMUP_TRIES = 40 // 20 seconds

const host = new DomHost()
let shadowHost: HTMLElement | null = null
let unobserve: (() => void) | null = null
let warmUpTimer: number | null = null
let wired = false

const onFeed = (): boolean => FEED_PATH.test(location.pathname)

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
function mount(theme: 'dark' | 'light'): void {
  if (shadowHost) {
    shadowHost.setAttribute('data-theme', theme)
    return
  }

  shadowHost = document.createElement('div')
  shadowHost.id = MOUNT_ID
  shadowHost.setAttribute('data-theme', theme)
  const shadow = shadowHost.attachShadow({ mode: 'open' })

  const sheet = document.createElement('style')
  sheet.textContent = `${fontFaceCss()}\n${styles}`
  shadow.append(sheet)

  const container = document.createElement('div')
  shadow.append(container)
  document.documentElement.append(shadowHost)

  // The overlay covers LinkedIn rather than deleting it, so the native feed
  // keeps virtualising and lazy-loading exactly as it would without us.
  // Stopping the page behind us from scrolling would break that, so we only
  // suppress the scrollbar, not the scrolling.
  document.documentElement.style.setProperty('scrollbar-width', 'none')

  render(<App />, container)
}

/**
 * Starts reading the feed. Deliberately not part of `mount`: at
 * `document_start` there is nothing to read yet, and a MutationObserver
 * attached that early would fire on every node the parser creates.
 */
function wire(): void {
  if (wired || !shadowHost) return
  wired = true

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
  wired = false
  shadowHost?.remove()
  shadowHost = null
  document.documentElement.style.removeProperty('scrollbar-width')
  delete document.documentElement.dataset.linkedinXDoctor
}

function applySettings(next: AppSettings): void {
  settings.value = next

  if (next.enabled && onFeed()) {
    mount(THEME)
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
