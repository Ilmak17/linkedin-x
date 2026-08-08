import type { ComponentChildren } from 'preact'

/** A small inline label: Easy Apply, Promoted, 2nd. */
export function Chip({ children, muted }: { children: ComponentChildren; muted?: boolean }) {
  return <span class={`kit-chip${muted ? ' kit-chip--muted' : ''}`}>{children}</span>
}
