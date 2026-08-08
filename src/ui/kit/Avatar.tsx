interface Props {
  src?: string | null
  name: string
  href?: string
  /** Square for companies and jobs, round for people. */
  shape?: 'round' | 'square'
  size?: 40 | 48 | 32
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '·'
}

export function Avatar({ src, name, href, shape = 'round', size = 40 }: Props) {
  const cls = `kit-avatar kit-avatar--${shape} kit-avatar--${size}`
  const inner = src ? <img src={src} alt="" loading="lazy" /> : <span aria-hidden="true">{initialsOf(name)}</span>

  if (!href) return <div class={cls}>{inner}</div>
  return (
    <a class={cls} href={href} target="_blank" rel="noreferrer noopener" aria-label={name}>
      {inner}
    </a>
  )
}
