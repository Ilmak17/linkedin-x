import { signal } from '@preact/signals'
import type { RawConversation } from '../host/messaging-host'
import { Avatar, EmptyState, Row, Skeleton, Tabs } from './kit'
import { Rail } from './Rail'

export const conversations = signal<RawConversation[]>([])
export const messagingWarmingUp = signal(true)

export function ingestConversations(items: RawConversation[]): void {
  conversations.value = items
  if (items.length > 0) messagingWarmingUp.value = false
}

export function MessagingPage() {
  const items = conversations.value

  return (
    <div class="root">
      <a class="skip-link" href="#lx-timeline">Skip to the content</a>

      <div class="shell">
        <Rail current="Messages" />

        <main class="feed" id="lx-timeline" tabIndex={-1}>
          <Tabs
            tabs={[
              { label: 'Focused', active: true },
              { label: 'Unread', href: 'https://www.linkedin.com/messaging/?filter=unread' },
              { label: 'Starred', href: 'https://www.linkedin.com/messaging/?filter=starred' },
            ]}
          />

          <a class="composer-cta" href="https://www.linkedin.com/messaging/thread/new/">
            <span class="prompt">Write a message</span>
            <span class="btn primary kit-btn kit-btn--primary kit-btn--sm">
              <span class="kit-btn__label">Compose</span>
            </span>
          </a>

          {items.length === 0 && messagingWarmingUp.value && (
            <>
              <Skeleton lines={2} />
              <Skeleton lines={2} />
            </>
          )}

          {items.length === 0 && !messagingWarmingUp.value && (
            <EmptyState
              title="No conversations"
              action={
                <a
                  class="kit-btn kit-btn--primary kit-btn--md"
                  href="https://www.linkedin.com/messaging/thread/new/"
                >
                  <span class="kit-btn__label">Write a message</span>
                </a>
              }
            >
              Nothing in the inbox yet. Opening a conversation hands you back to LinkedIn — we render the list,
              not the thread.
            </EmptyState>
          )}

          {items.map((c) => (
            <Row
              key={c.id}
              align="center"
              selected={c.unread}
              onClick={() => window.open(c.url, '_blank', 'noopener')}
              lead={<Avatar src={c.avatarUrl} name={c.name} />}
            >
              <div class="byline">
                <span class="name">{c.name}</span>
                {c.timeLabel && <span class="sep">·</span>}
                {c.timeLabel && <span class="time">{c.timeLabel}</span>}
              </div>
              <div class="conversation-snippet">{c.snippet}</div>
            </Row>
          ))}
        </main>

        <aside class="aside">
          <div class="card">
            <h2>Inbox</h2>
            <div class="stat">
              <b>{items.length}</b>
              <span>conversations</span>
            </div>
          </div>
          <div class="card">
            <div class="row">
              <label>
                The list is ours, the thread is LinkedIn's
                <span class="sub">
                  Opening a conversation leaves the overlay on purpose: a thread has never been available to
                  build against, and covering one with a worse version would help nobody
                </span>
              </label>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
