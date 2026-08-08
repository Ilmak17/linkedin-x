import { useState } from 'preact/hooks'
import type { Post } from '../model/post'
import { openThread } from '../state/store'
import { ActionBar } from './ActionBar'
import { Avatar } from './Avatar'
import { CommentThread } from './CommentThread'

const CLAMP_AT = 900 // characters, roughly twelve lines at 17px/1.6

export function PostCard({ post }: { post: Post }) {
  const [expanded, setExpanded] = useState(false)
  const threadOpen = openThread.value === post.id
  const long = post.text.length > CLAMP_AT

  // The server-driven feed carries no activity urn, so most posts have no
  // derivable permalink. Where there is none, the time and media stay plain
  // rather than becoming dead links.
  const link = post.permalink

  return (
    <article class="post">
      <Avatar src={post.author.avatar} initials={post.author.initials} href={post.author.url} name={post.author.name} />

      <div class="body">
        <div class="byline">
          <a class="name" href={post.author.url} target="_blank" rel="noreferrer noopener">
            {post.author.name}
          </a>
          <span class="headline">{post.author.headline}</span>
          {link ? (
            <a class="time" href={link} target="_blank" rel="noreferrer noopener" title="Open on LinkedIn">
              {post.timeLabel}
            </a>
          ) : (
            <span class="time">{post.timeLabel}</span>
          )}
        </div>

        {post.text && <div class={`text${long && !expanded ? ' clamped' : ''}`}>{post.text}</div>}
        {long && (
          <button class="more" onClick={() => setExpanded(!expanded)}>
            {expanded ? 'show less' : 'show more'}
          </button>
        )}

        {post.imageUrl &&
          (link ? (
            <a class="media" href={link} target="_blank" rel="noreferrer noopener">
              <img src={post.imageUrl} alt="" loading="lazy" />
            </a>
          ) : (
            <div class="media">
              <img src={post.imageUrl} alt="" loading="lazy" />
            </div>
          ))}

        {(post.hasVideo || post.linkTitle) && (
          <div class="linkcard">{post.hasVideo ? 'video' : post.linkTitle} · open on LinkedIn to view</div>
        )}

        <ActionBar
          post={post}
          threadOpen={threadOpen}
          onToggleThread={() => {
            openThread.value = threadOpen ? null : post.id
          }}
        />

        {threadOpen && <CommentThread post={post} />}
      </div>
    </article>
  )
}
