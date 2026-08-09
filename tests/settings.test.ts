import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * settings decides whether the extension mounts at all, and holds the
 * localStorage mirror that removed the flash of LinkedIn on every page load.
 * A bug here does not degrade the extension, it makes it not appear.
 */

const store: Record<string, unknown> = {}
const listeners: Array<(c: Record<string, { newValue: unknown }>, area: string) => void> = []

vi.stubGlobal('chrome', {
  storage: {
    sync: {
      get: vi.fn(async (key: string) => (key in store ? { [key]: store[key] } : {})),
      set: vi.fn(async (patch: Record<string, unknown>) => Object.assign(store, patch)),
    },
    onChanged: {
      addListener: (fn: (typeof listeners)[number]) => listeners.push(fn),
      removeListener: (fn: (typeof listeners)[number]) => listeners.splice(listeners.indexOf(fn), 1),
    },
  },
})

const { DEFAULTS, cachedSettings, loadSettings, onSettingsChanged, saveSettings } = await import(
  '../src/lib/settings'
)

describe('settings', () => {
  beforeEach(() => {
    for (const key of Object.keys(store)) delete store[key]
    localStorage.clear()
  })

  it('is on by default, so a fresh install does something', async () => {
    expect((await loadSettings()).enabled).toBe(true)
    expect(cachedSettings().enabled).toBe(true)
  })

  it('fills in anything a stored older version did not have', async () => {
    store['linkedin-x:settings'] = { enabled: false }
    const settings = await loadSettings()

    expect(settings.enabled).toBe(false)
    expect(settings.showPromoted).toBe(DEFAULTS.showPromoted)
  })

  it('mirrors to localStorage on load, so the next page paints without a flash', async () => {
    store['linkedin-x:settings'] = { enabled: false }
    await loadSettings()

    expect(cachedSettings().enabled).toBe(false)
  })

  it('mirrors on save too, before the async write lands', async () => {
    await saveSettings({ enabled: false })
    expect(cachedSettings().enabled).toBe(false)
  })

  it('merges a patch instead of replacing everything', async () => {
    await saveSettings({ showPromoted: true })
    const settings = await saveSettings({ enabled: false })

    expect(settings.showPromoted).toBe(true)
    expect(settings.enabled).toBe(false)
  })

  it('falls back to the defaults when storage is unavailable', async () => {
    const broken = vi.fn().mockRejectedValue(new Error('context invalidated'))
    ;(chrome.storage.sync.get as unknown as typeof broken) = broken

    // An extension reload tears the context down mid-page; the overlay must
    // not disappear because of it.
    expect((await loadSettings()).enabled).toBe(true)
  })

  it('survives localStorage being unavailable', () => {
    const original = Storage.prototype.getItem
    Storage.prototype.getItem = () => {
      throw new Error('blocked')
    }
    try {
      expect(cachedSettings()).toEqual(DEFAULTS)
    } finally {
      Storage.prototype.getItem = original
    }
  })

  it('tells a listener about a change from another tab, and can be unsubscribed', () => {
    const seen: boolean[] = []
    const stop = onSettingsChanged((s) => seen.push(s.enabled))

    listeners.forEach((fn) => fn({ 'linkedin-x:settings': { newValue: { enabled: false } } }, 'sync'))
    expect(seen).toEqual([false])

    stop()
    listeners.forEach((fn) => fn({ 'linkedin-x:settings': { newValue: { enabled: true } } }, 'sync'))
    expect(seen).toEqual([false])
  })

  it('ignores changes in a storage area that is not ours', () => {
    const seen: boolean[] = []
    onSettingsChanged((s) => seen.push(s.enabled))

    listeners.forEach((fn) => fn({ 'linkedin-x:settings': { newValue: { enabled: false } } }, 'local'))
    expect(seen).toEqual([])
  })
})
