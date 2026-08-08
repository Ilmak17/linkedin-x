import { hiddenCount, settings, visiblePosts } from '../state/store'
import { saveSettings, type AppSettings } from '../lib/settings'
import { SearchBox } from './kit'

const FILTERS: Array<{ key: keyof AppSettings; label: string; sub: string }> = [
  { key: 'showPromoted', label: 'Ads', sub: 'Promoted and sponsored posts' },
  { key: 'showSocialProof', label: 'Reactions from your network', sub: '“X likes this”, reposts' },
  { key: 'showSuggested', label: 'Suggestions', sub: '“People you may know”' },
  { key: 'showModules', label: 'Modules', sub: 'Carousels, polls, job lists' },
]

/**
 * The right rail. x.com fills it with trends; there are none worth showing
 * here, so it does the one thing the popup used to hide: shows what was
 * filtered out and lets any of it back in without leaving the page.
 */
export function Aside() {
  const s = settings.value

  return (
    <aside class="aside">
      <SearchBox />
      <div class="card">
        <h2>This session</h2>
        <div class="stat">
          <b>{visiblePosts.value.length}</b>
          <span>posts shown</span>
        </div>
        <div class="stat" style="padding-top:0">
          <b>{hiddenCount.value}</b>
          <span>filtered out</span>
        </div>
      </div>

      <div class="card">
        <h2>Show anyway</h2>
        {FILTERS.map(({ key, label, sub }) => (
          <div class="row" key={key}>
            <label for={`f-${key}`}>
              {label}
              <span class="sub">{sub}</span>
            </label>
            <input
              id={`f-${key}`}
              type="checkbox"
              checked={Boolean(s[key])}
              onChange={(e) => void saveSettings({ [key]: (e.target as HTMLInputElement).checked })}
            />
          </div>
        ))}
      </div>

      <div class="card">
        <div class="row">
          <label for="f-enabled">
            Replace the feed
            <span class="sub">Off gives you the original LinkedIn</span>
          </label>
          <input
            id="f-enabled"
            type="checkbox"
            checked={s.enabled}
            onChange={(e) => void saveSettings({ enabled: (e.target as HTMLInputElement).checked })}
          />
        </div>
        <a class="foot" href="https://github.com/Ilmak17/linkedin-x" target="_blank" rel="noreferrer noopener">
          Something looks wrong? Report it
        </a>
      </div>
    </aside>
  )
}
