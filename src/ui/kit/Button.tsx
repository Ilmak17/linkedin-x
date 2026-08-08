import type { ComponentChildren } from 'preact'

interface Props {
  children: ComponentChildren
  onClick?: (e: MouseEvent) => void
  variant?: 'primary' | 'outline' | 'ghost'
  size?: 'sm' | 'md'
  disabled?: boolean
  title?: string
  'aria-label'?: string
  /** Reserves the width of the longest label so the row never reflows. */
  steady?: string
}

export function Button({ children, onClick, variant = 'outline', size = 'md', disabled, steady, ...rest }: Props) {
  return (
    <button
      class={`kit-btn kit-btn--${variant} kit-btn--${size}`}
      disabled={disabled}
      onClick={onClick}
      {...rest}
    >
      {steady && (
        <span class="kit-btn__ghost" aria-hidden="true">
          {steady}
        </span>
      )}
      <span class="kit-btn__label">{children}</span>
    </button>
  )
}
