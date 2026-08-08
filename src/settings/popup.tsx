import { render } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { DEFAULTS, loadSettings, saveSettings, type AppSettings } from '../lib/settings'

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
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 3h4.6l5 6.9L18.7 3H21l-7.2 8.4L21.4 21h-4.6l-5.4-7.4L4.7 21H2.4l7.7-9z" />
        </svg>
        <strong>linkedin-x</strong>
        <span class="version">v{version}</span>
      </header>

      <section>
        <h2>Surfaces replaced</h2>
        <div class="surfaces">
          {['Feed', 'Search', 'Post', 'Jobs', 'Network', 'Profile'].map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
      </section>

      <section>
        <Toggle
          label="Replace the feed"
          hint="Turn off to get the original LinkedIn back"
          checked={s.enabled}
          onChange={(v) => update({ enabled: v })}
        />
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
        Looks broken?{' '}
        <a href="https://github.com/Ilmak17/linkedin-x/issues/new?template=selector-break.yml" target="_blank" rel="noreferrer">
          report it
        </a>{' '}
        and paste the doctor report from the console. The command is in the README.
      </footer>
    </>
  )
}

render(<Popup />, document.getElementById('app')!)
