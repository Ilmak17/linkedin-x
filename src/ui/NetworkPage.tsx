import { signal } from '@preact/signals'
import type { NetworkHost, RawPerson } from '../host/network-host'
import { Rail } from './Rail'

export const people = signal<RawPerson[]>([])
export const networkWarmingUp = signal(true)

let host: NetworkHost

export function attachNetworkHost(h: NetworkHost): void {
  host = h
}

export function ingestPeople(next: RawPerson[]): void {
  people.value = next
  if (next.length > 0) networkWarmingUp.value = false
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '·'
}

export function NetworkPage() {
  const list = people.value

  const invite = (person: RawPerson) => {
    if (!host?.act(person.id)) return
    // Optimistic, and reversed by the next harvest if LinkedIn disagrees.
    people.value = people.value.map((p) => (p.id === person.id ? { ...p, invited: true, actionLabel: 'Pending' } : p))
  }

  return (
    <div class="root">
      <div class="shell">
        <Rail current="Network" />

        <main class="feed">
          <div class="feed-head">
            <div class="tabs" role="tablist">
              <button class="tab" role="tab" aria-selected="true">
                Grow
              </button>
              <a class="tab" role="tab" aria-selected="false" href="https://www.linkedin.com/mynetwork/invite-connect/connections/">
                Connections
              </a>
            </div>
          </div>

          {list.length === 0 && networkWarmingUp.value && (
            <div class="skeleton">
              <div class="sk-avatar" />
              <div class="sk-body">
                <div class="sk-line" style="width:38%" />
                <div class="sk-line" style="width:72%" />
              </div>
            </div>
          )}

          {list.length === 0 && !networkWarmingUp.value && (
            <div class="state">
              <h2>No suggestions</h2>
              <p>LinkedIn has nobody to suggest right now.</p>
            </div>
          )}

          {list.map((person) => (
            <article class="post person" key={person.id}>
              <a class="avatar" href={person.profileUrl} target="_blank" rel="noreferrer noopener">
                {person.avatarUrl ? <img src={person.avatarUrl} alt="" loading="lazy" /> : <span>{initials(person.name)}</span>}
              </a>

              <div class="body">
                <a class="person-name" href={person.profileUrl} target="_blank" rel="noreferrer noopener">
                  {person.name}
                </a>
                <div class="person-headline">{person.headline}</div>
              </div>

              <button class="btn person-action" disabled={person.invited} onClick={() => invite(person)}>
                {person.invited ? 'Pending' : person.actionLabel}
              </button>
            </article>
          ))}
        </main>

        <aside class="aside">
          <div class="card">
            <h2>Suggestions</h2>
            <div class="stat">
              <b>{list.length}</b>
              <span>people listed</span>
            </div>
          </div>
          <div class="card">
            <div class="row">
              <label>
                Connect goes through LinkedIn's own button
                <span class="sub">Same as everywhere else here: we never call their API</span>
              </label>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
