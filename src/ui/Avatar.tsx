interface Props {
  src: string
  initials: string
  href?: string
  name: string
}

export function Avatar({ src, initials, href, name }: Props) {
  const inner = src ? <img src={src} alt="" loading="lazy" /> : <span aria-hidden="true">{initials}</span>

  if (!href) return <div class="avatar">{inner}</div>

  return (
    <a class="avatar" href={href} target="_blank" rel="noreferrer noopener" aria-label={name}>
      {inner}
    </a>
  )
}
