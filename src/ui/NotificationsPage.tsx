import { signal } from '@preact/signals'
import type { NotificationsHost, RawNotification } from '../host/notifications-host'
import { Avatar, Button, EmptyState, Row, Skeleton, Tabs } from './kit'
import { Rail } from './Rail'

export const notifications = signal<RawNotification[]>([])
export const notificationsWarmingUp = signal(true)

let host: NotificationsHost

export function attachNotificationsHost(h: NotificationsHost): void {
  host = h
}

export function ingestNotifications(items: RawNotification[]): void {
  notifications.value = items
  if (items.length > 0) notificationsWarmingUp.value = false
}

export function NotificationsPage() {
  const items = notifications.value
  const unread = items.filter((n) => n.unread).length

  const dismiss = (id: string) => {
    if (host?.dismiss(id)) notifications.value = notifications.value.filter((n) => n.id !== id)
  }

  return (
    <div class="root">
      <div class="shell">
        <Rail current="Notifications" />

        <main class="feed">
          <Tabs
            tabs={[
              { label: 'All', active: true },
              { label: 'Jobs', href: 'https://www.linkedin.com/notifications/?filter=job_alerts' },
              { label: 'My posts', href: 'https://www.linkedin.com/notifications/?filter=my_posts_all' },
            ]}
          />

          {items.length === 0 && notificationsWarmingUp.value && (
            <>
              <Skeleton lines={2} />
              <Skeleton lines={2} />
            </>
          )}

          {items.length === 0 && !notificationsWarmingUp.value && (
            <EmptyState title="Nothing new">
              LinkedIn has not sent anything worth interrupting you for.
            </EmptyState>
          )}

          {items.map((n) => (
            <Row
              key={n.id}
              align="center"
              selected={n.unread}
              onClick={n.url ? () => window.open(n.url!, '_blank', 'noopener') : undefined}
              lead={<Avatar src={n.imageUrl} name={n.subject || 'LinkedIn'} shape="square" />}
              trail={
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Dismiss this notification"
                  onClick={(e) => {
                    e.stopPropagation()
                    dismiss(n.id)
                  }}
                >
                  Hide
                </Button>
              }
            >
              <div class="notification-text">{n.text}</div>
              <div class="job-foot">
                {n.timeLabel && <span class="dim">{n.timeLabel}</span>}
                {n.actionLabel && <span class="notification-cta">{n.actionLabel}</span>}
              </div>
            </Row>
          ))}
        </main>

        <aside class="aside">
          <div class="card">
            <h2>Notifications</h2>
            <div class="stat">
              <b>{unread}</b>
              <span>unread</span>
            </div>
            <div class="stat" style="padding-top:0">
              <b>{items.length}</b>
              <span>in total</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
