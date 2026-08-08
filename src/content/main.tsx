import { render } from 'preact'
import styles from '../ui/styles.css?inline'
import { fontFaceCss } from '../ui/fonts'
import { DomHost } from '../host/dom-host'
import { attachHost, ingest, markBroken, settings } from '../state/store'
import { loadSettings, onSettingsChanged, type AppSettings, type Theme } from '../lib/settings'
import { App } from '../ui/App'

const MOUNT_ID = 'linkedin-x-root'
const FEED_PATH = /^\/feed\/?$/

const host = new DomHost()
let shadowHost: HTMLElement | null = null
let unobserve: (() => void) | null = null

function resolveTheme(theme: Theme): 'dark' | 'light' {
  if (theme !== 'system') return theme
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function mount(): void {
  if (shadowHost) return

  shadowHost = document.createElement('div')
  shadowHost.id = MOUNT_ID
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

  attachHost(host)
  const first = host.harvest()
  ingest(first)

  if (first.length === 0 && host.isReady()) {
    markBroken('Found the feed container but read zero posts out of it.')
  }

  unobserve = host.observe((posts) => {
    if (posts.length === 0 && host.isReady()) {
      markBroken('The feed is present but no post matched our selectors.')
      return
    }
    ingest(posts)
  })
}

function unmount(): void {
  unobserve?.()
  unobserve = null
  shadowHost?.remove()
  shadowHost = null
  document.documentElement.style.removeProperty('scrollbar-width')
}

function applySettings(next: AppSettings): void {
  settings.value = next
  shadowHost?.setAttribute('data-theme', resolveTheme(next.theme))

  const onFeed = FEED_PATH.test(location.pathname)
  if (next.enabled && onFeed) mount()
  else unmount()

  shadowHost?.setAttribute('data-theme', resolveTheme(next.theme))
}

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

  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    if (settings.value.theme === 'system') applySettings(settings.value)
  })

  // A diagnostic for the "LinkedIn changed its markup" bug report. Users are
  // asked to paste the output into an issue.
  Object.defineProperty(window, '__linkedinX', {
    value: { doctor: () => host.doctor(), harvest: () => host.harvest() },
    configurable: true,
  })
}

void boot()
