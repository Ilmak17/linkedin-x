import { signal } from '@preact/signals'
import type { RawSaved } from '../host/saved-host'
import { Avatar, EmptyState, Row, Skeleton, Tabs } from './kit'
import { Rail } from './Rail'

export const saved = signal<RawSaved[]>([])
export const savedWarmingUp = signal(true)

export function ingestSaved(items: RawSaved[]): void {
  saved.value = items
  if (items.length > 0) savedWarmingUp.value = false
}

export function SavedPage() {
  const items = saved.value

  return (
    <div class="root">
      <div class="shell">
        <Rail current="Saved" />

        <main class="feed">
          <Tabs
            tabs={[
              { label: 'Posts', active: true },
              { label: 'Jobs', href: 'https://www.linkedin.com/my-items/saved-jobs/' },
            ]}
          />

          {items.length === 0 && savedWarmingUp.value && (
            <>
              <Skeleton lines={3} />
              <Skeleton lines={3} />
            </>
          )}

          {items.length === 0 && !savedWarmingUp.value && (
            <EmptyState title="Nothing saved yet">
              Save a post from the timeline and it shows up here.
            </EmptyState>
          )}

          {items.map((item) => (
            <Row key={item.id} lead={<Avatar src={item.avatarUrl} name={item.author} />}>
              <div class="byline">
                <a class="name" href={item.permalink} target="_blank" rel="noreferrer noopener">
                  {item.author}
                </a>
                {item.headline && <span class="headline">{item.headline}</span>}
                {item.timeLabel && <span class="sep">·</span>}
                {item.timeLabel && (
                  <a class="time" href={item.permalink} target="_blank" rel="noreferrer noopener">
                    {item.timeLabel}
                  </a>
                )}
              </div>
              <div class="text">{item.text}</div>
            </Row>
          ))}
        </main>

        <aside class="aside">
          <div class="card">
            <h2>Saved</h2>
            <div class="stat">
              <b>{items.length}</b>
              <span>posts kept</span>
            </div>
          </div>
          <div class="card">
            <div class="row">
              <label>
                These keep their permalinks
                <span class="sub">The feed's own posts no longer carry one; saved items do</span>
              </label>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
