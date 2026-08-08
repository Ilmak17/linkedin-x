import { render } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { DEFAULTS, loadSettings, saveSettings, type AppSettings, type Theme } from '../lib/settings'

const THEMES: Theme[] = ['dark', 'light', 'system']

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label class="row">
      <span>
        {label}
        {hint && <span class="hint">{hint}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange((e.target as HTMLInputElement).checked)} />
    </label>
  )
}

function Popup() {
  const [s, setS] = useState<AppSettings>(DEFAULTS)

  useEffect(() => {
    void loadSettings().then(setS)
  }, [])

  const update = (patch: Partial<AppSettings>) => {
    setS((prev) => ({ ...prev, ...patch }))
    void saveSettings(patch)
  }

  const version = chrome.runtime?.getManifest?.().version ?? '0.0.0'

  return (
    <>
      <header>
        <span class="wordmark">
          linkedin<b>-x</b>
        </span>
        <span class="version">v{version}</span>
      </header>

      <section>
        <Toggle
          label="Replace the feed"
          hint="Turn off to get the original LinkedIn back"
          checked={s.enabled}
          onChange={(v) => update({ enabled: v })}
        />
      </section>

      <section>
        <h2>Theme</h2>
        <div class="segmented">
          {THEMES.map((t) => (
            <button key={t} aria-pressed={s.theme === t} onClick={() => update({ theme: t })}>
              {t}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2>Show anyway</h2>
        <Toggle label="Ads" checked={s.showPromoted} onChange={(v) => update({ showPromoted: v })} />
        <Toggle
          label="Reactions from connections"
          hint="“X commented on this”"
          checked={s.showSocialProof}
          onChange={(v) => update({ showSocialProof: v })}
        />
        <Toggle
          label="Suggestions"
          hint="“People you may know”, “Recommended for you”"
          checked={s.showSuggested}
          onChange={(v) => update({ showSuggested: v })}
        />
        <Toggle
          label="Modules"
          hint="Carousels, polls, job lists"
          checked={s.showModules}
          onChange={(v) => update({ showModules: v })}
        />
      </section>

      <footer>
        Feed looks broken?{' '}
        <a href="https://github.com/Ilmak17/linkedin-x/issues/new?template=selector-break.yml" target="_blank" rel="noreferrer">
          report it
        </a>{' '}
        and paste the output of <code>__linkedinX.doctor()</code> from the console.
      </footer>
    </>
  )
}

render(<Popup />, document.getElementById('app')!)
