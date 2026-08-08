import type { ComponentChildren } from 'preact'

interface Props {
  children: ComponentChildren
  /** Rendered in the left gutter: an avatar, a logo, nothing. */
  lead?: ComponentChildren
  /** Rendered hard right and vertically centred: a button, a menu. */
  trail?: ComponentChildren
  selected?: boolean
  /** The keyboard is pointing at this row. */
  cursored?: boolean
  onClick?: () => void
  /** Vertically centre the row instead of top-aligning it. */
  align?: 'top' | 'center'
}

/**
 * Every list row in the product: a post, a job, a person, a comment.
 *
 * All of the density lives here — the padding, the gutter, the divider, the
 * hover tint, the focus ring. Surfaces compose rows and never set spacing of
 * their own, which is what stopped the four screens drifting apart.
 */
export function Row({ children, lead, trail, selected, cursored, onClick, align = 'top' }: Props) {
  const interactive = Boolean(onClick)
  return (
    <article
      class={`kit-row kit-row--${align}${selected ? ' is-selected' : ''}${cursored ? ' is-cursor' : ''}${
        interactive ? ' is-clickable' : ''
      }`}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
      tabIndex={interactive ? 0 : undefined}
      role={interactive ? 'button' : undefined}
    >
      {lead && <div class="kit-row__lead">{lead}</div>}
      <div class="kit-row__body">{children}</div>
      {trail && <div class="kit-row__trail">{trail}</div>}
    </article>
  )
}
