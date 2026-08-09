import { signal } from '@preact/signals'
import type { CompanyHost, RawCompany } from '../host/company-host'
import { visiblePosts, warmingUp } from '../state/store'
import { Avatar, Button, EmptyState, Skeleton, Tabs } from './kit'
import { PostCard } from './PostCard'
import { Rail } from './Rail'

export const company = signal<RawCompany | null>(null)

let host: CompanyHost

export function attachCompanyHost(h: CompanyHost): void {
  host = h
}

export function ingestCompany(next: RawCompany | null): void {
  if (next) company.value = next
}

export function CompanyPage() {
  const c = company.value
  const posts = visiblePosts.value

  return (
    <div class="root">
      <a class="skip-link" href="#lx-timeline">Skip to the content</a>

      <div class="shell">
        <Rail current="Home" />

        <main class="feed" id="lx-timeline" tabIndex={-1}>
          <div class="profile-cover" />

          <div class="profile-head">
            <div class="profile-avatar profile-avatar--square">
              <Avatar src={c?.logoUrl} name={c?.name ?? 'Company'} shape="square" size={48} />
            </div>

            <div class="profile-actions">
              {c && (
                <Button
                  variant={/following|подписаны/i.test(c.followLabel) ? 'outline' : 'primary'}
                  steady="Following"
                  onClick={() => host?.toggleFollow()}
                >
                  {c.followLabel}
                </Button>
              )}
            </div>

            <h1 class="profile-name">{c?.name ?? 'Company'}</h1>
            <div class="profile-meta">
              {c?.industry && <span>{c.industry}</span>}
              {c?.location && <span class="dim">{c.location}</span>}
            </div>
            <div class="profile-followers">
              {[c?.followers, c?.employees].filter(Boolean).join(' · ')}
            </div>
          </div>

          <Tabs tabs={[{ label: 'Posts', active: true }]} />

          {posts.length === 0 && warmingUp.value && (
            <>
              <Skeleton lines={3} />
              <Skeleton lines={3} />
            </>
          )}

          {posts.length === 0 && !warmingUp.value && (
            <EmptyState title="No posts here">This page has not posted anything we can read.</EmptyState>
          )}

          {posts.map((p) => (
            <PostCard post={p} key={p.id} />
          ))}
        </main>

        <aside class="aside">
          <div class="card">
            <h2>This page</h2>
            <div class="stat">
              <b>{posts.length}</b>
              <span>posts shown</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
