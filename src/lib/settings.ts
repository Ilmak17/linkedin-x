import { DEFAULT_SETTINGS, type Settings } from '../filter/classify'

export type Theme = 'dark' | 'light' | 'system'

export interface AppSettings extends Settings {
  enabled: boolean
  theme: Theme
}

export const DEFAULTS: AppSettings = {
  ...DEFAULT_SETTINGS,
  enabled: true,
  theme: 'dark',
}

const KEY = 'linkedin-x:settings'

/**
 * `chrome.storage` is asynchronous, and at `document_start` we have to decide
 * whether to cover the page before a single frame is painted. Waiting for the
 * round trip is what makes LinkedIn flash into view first.
 *
 * So the settings are mirrored into the page's own localStorage, which reads
 * synchronously. `chrome.storage` stays the source of truth; this is only a
 * hint for the first paint, and being wrong costs one frame.
 */
export function cachedSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<AppSettings>) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

function cache(settings: AppSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings))
  } catch {
    // private mode, quota, a page that blocks storage: the slow path still works
  }
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    const stored = await chrome.storage.sync.get(KEY)
    const settings = { ...DEFAULTS, ...(stored[KEY] as Partial<AppSettings> | undefined) }
    cache(settings)
    return settings
  } catch {
    // storage can be unavailable in a torn-down context; defaults are fine
    return DEFAULTS
  }
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const next = { ...(await loadSettings()), ...patch }
  cache(next)
  await chrome.storage.sync.set({ [KEY]: next })
  return next
}

export function onSettingsChanged(cb: (s: AppSettings) => void): () => void {
  const handler = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area !== 'sync' || !changes[KEY]) return
    const next = { ...DEFAULTS, ...(changes[KEY].newValue as Partial<AppSettings>) }
    cache(next)
    cb(next)
  }
  chrome.storage.onChanged.addListener(handler)
  return () => chrome.storage.onChanged.removeListener(handler)
}
