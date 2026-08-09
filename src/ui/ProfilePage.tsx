import { signal } from '@preact/signals'
import type { ProfileHost, RawProfile } from '../host/profile-host'
import { Avatar, Button, EmptyState, Skeleton } from './kit'
import { Rail } from './Rail'

export const profile = signal<RawProfile | null>(null)
export const profileWarmingUp = signal(true)

let host: ProfileHost

export function attachProfileHost(h: ProfileHost): void {
  host = h
}

export function ingestProfile(next: RawProfile | null): void {
  if (next) {
    profile.value = next
    profileWarmingUp.value = false
  }
}

export function ProfilePage() {
  const p = profile.value

  return (
    <div class="root">
      <a class="skip-link" href="#lx-timeline">Skip to the content</a>

      <div class="shell">
        <Rail current="Profile" />

        <main class="feed" id="lx-timeline" tabIndex={-1}>
          {!p && profileWarmingUp.value && (
            <>
              <div class="profile-cover" />
              <Skeleton lines={3} />
              <Skeleton lines={2} lead={false} />
            </>
          )}

          {!p && !profileWarmingUp.value && (
            <EmptyState title="Could not read this profile">
              LinkedIn rendered something we do not recognise as a profile.
            </EmptyState>
          )}

          {p && (
            <>
              <div class="profile-cover">
                {p.coverUrl && <img src={p.coverUrl} alt="" />}
              </div>

              <div class="profile-head">
                <div class="profile-avatar">
                  <Avatar src={p.avatarUrl} name={p.name} size={48} />
                </div>

                <div class="profile-actions">
                  {p.actions.map((label) => (
                    <Button
                      key={label}
                      variant={label.toLowerCase() === 'connect' ? 'primary' : 'outline'}
                      onClick={() => host?.act(label)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>

                <h1 class="profile-name">{p.name}</h1>
                {p.headline && <div class="profile-headline">{p.headline}</div>}

                <div class="profile-meta">
                  {p.company && <span>{p.company}</span>}
                  {p.location && <span class="dim">{p.location}</span>}
                  {p.website && (
                    <a href={p.website} target="_blank" rel="noreferrer noopener">
                      {p.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>

                {p.followers && <div class="profile-followers">{p.followers}</div>}
              </div>

              {p.about && (
                <section class="profile-section">
                  <h2>About</h2>
                  <p>{p.about}</p>
                </section>
              )}

              <section class="profile-section">
                <h2>The rest of this profile</h2>
                <p class="dim">
                  Experience, education and skills stay on LinkedIn for now — they load further down the page and
                  have not been read yet.
                </p>
                <a class="kit-btn kit-btn--outline kit-btn--md" href={location.href}>
                  <span class="kit-btn__label">Open the original profile</span>
                </a>
              </section>
            </>
          )}
        </main>

        <aside class="aside">
          <div class="card">
            <h2>Profile</h2>
            <div class="stat">
              <b>{p?.actions.length ?? 0}</b>
              <span>actions available</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
