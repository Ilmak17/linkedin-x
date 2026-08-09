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
      <div class="shell">
        <Rail current="Messages" />

        <main class="feed">
          <Tabs
            tabs={[
              { label: 'Focused', active: true },
              { label: 'Unread', href: 'https://www.linkedin.com/messaging/?filter=unread' },
              { label: 'Starred', href: 'https://www.linkedin.com/messaging/?filter=starred' },
            ]}
          />

          {items.length === 0 && messagingWarmingUp.value && (
            <>
              <Skeleton lines={2} />
              <Skeleton lines={2} />
            </>
          )}

          {items.length === 0 && !messagingWarmingUp.value && (
            <EmptyState title="No conversations">
              Nothing in the inbox. Reading a thread still happens on LinkedIn — only the list is ours.
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
                  Reading and replying open the real conversation, because a populated inbox has never been
                  available to build against
                </span>
              </label>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
