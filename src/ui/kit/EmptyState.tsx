import type { ComponentChildren } from 'preact'

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string
  children?: ComponentChildren
  action?: ComponentChildren
}) {
  return (
    <div class="kit-empty">
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}
