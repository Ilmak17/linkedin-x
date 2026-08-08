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

export async function loadSettings(): Promise<AppSettings> {
  try {
    const stored = await chrome.storage.sync.get(KEY)
    return { ...DEFAULTS, ...(stored[KEY] as Partial<AppSettings> | undefined) }
  } catch {
    // storage can be unavailable in a torn-down context; defaults are fine
    return DEFAULTS
  }
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const next = { ...(await loadSettings()), ...patch }
  await chrome.storage.sync.set({ [KEY]: next })
  return next
}

export function onSettingsChanged(cb: (s: AppSettings) => void): () => void {
  const handler = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area !== 'sync' || !changes[KEY]) return
    cb({ ...DEFAULTS, ...(changes[KEY].newValue as Partial<AppSettings>) })
  }
  chrome.storage.onChanged.addListener(handler)
  return () => chrome.storage.onChanged.removeListener(handler)
}
