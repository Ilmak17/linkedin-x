import { signal } from '@preact/signals'
import type { NetworkHost, RawPerson } from '../host/network-host'
import { Avatar, Button, EmptyState, Row, Skeleton, Tabs } from './kit'
import { Rail } from './Rail'

export const people = signal<RawPerson[]>([])
export const networkWarmingUp = signal(true)

let host: NetworkHost

export function attachNetworkHost(h: NetworkHost): void {
  host = h
}

export function ingestPeople(next: RawPerson[]): void {
  // Keep an optimistic "Pending" rather than letting the next harvest undo it
  // before LinkedIn has caught up.
  const invited = new Set(people.value.filter((p) => p.invited).map((p) => p.id))
  people.value = next.map((p) => (invited.has(p.id) ? { ...p, invited: true, actionLabel: 'Pending' } : p))
  if (next.length > 0) networkWarmingUp.value = false
}

export function NetworkPage() {
  const list = people.value

  const invite = (person: RawPerson) => {
    if (!host?.act(person.id)) return
    people.value = people.value.map((p) =>
      p.id === person.id ? { ...p, invited: true, actionLabel: 'Pending' } : p,
    )
  }

  return (
    <div class="root">
      <div class="shell">
        <Rail current="Network" />

        <main class="feed">
          <Tabs
            tabs={[
              { label: 'Grow', active: true },
              { label: 'Invitations', href: 'https://www.linkedin.com/mynetwork/invitation-manager/' },
              { label: 'Connections', href: 'https://www.linkedin.com/mynetwork/invite-connect/connections/' },
            ]}
          />

          {list.length === 0 && networkWarmingUp.value && (
            <>
              <Skeleton lines={2} />
              <Skeleton lines={2} />
            </>
          )}

          {list.length === 0 && !networkWarmingUp.value && (
            <EmptyState title="No suggestions">LinkedIn has nobody to suggest right now.</EmptyState>
          )}

          {list.map((person) => (
            <Row
              key={person.id}
              align="center"
              lead={<Avatar src={person.avatarUrl} name={person.name} href={person.profileUrl} />}
              trail={
                <Button
                  variant={person.invited ? 'ghost' : 'outline'}
                  disabled={person.invited}
                  steady="Connect"
                  onClick={() => invite(person)}
                >
                  {person.invited ? 'Pending' : person.actionLabel}
                </Button>
              }
            >
              <a class="person-name" href={person.profileUrl} target="_blank" rel="noreferrer noopener">
                {person.name}
              </a>
              <div class="person-headline">{person.headline}</div>
            </Row>
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
                <span class="sub">Same as everywhere here: we never call their API</span>
              </label>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
