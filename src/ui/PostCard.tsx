import { useState } from 'preact/hooks'
import type { Post } from '../model/post'
import { openThread } from '../state/store'
import { ActionBar } from './ActionBar'
import { Avatar } from './Avatar'
import { CommentThread } from './CommentThread'

const CLAMP_AT = 900 // characters, roughly twelve lines at 17px/1.6

export function PostCard({ post }: { post: Post }) {
  const [expanded, setExpanded] = useState(false)
  const threadOpen = openThread.value === post.urn
  const long = post.text.length > CLAMP_AT

  return (
    <article class="post">
      <Avatar src={post.author.avatar} initials={post.author.initials} href={post.author.url} name={post.author.name} />

      <div class="body">
        <div class="byline">
          <a class="name" href={post.author.url} target="_blank" rel="noreferrer noopener">
            {post.author.name}
          </a>
          <span class="headline">{post.author.headline}</span>
          <a class="time" href={post.permalink} target="_blank" rel="noreferrer noopener" title="Open on LinkedIn">
            {post.timeLabel}
          </a>
        </div>

        {post.text && <div class={`text${long && !expanded ? ' clamped' : ''}`}>{post.text}</div>}
        {long && (
          <button class="more" onClick={() => setExpanded(!expanded)}>
            {expanded ? 'show less' : 'show more'}
          </button>
        )}

        {post.imageUrl && (
          <a class="media" href={post.permalink} target="_blank" rel="noreferrer noopener">
            <img src={post.imageUrl} alt="" loading="lazy" />
          </a>
        )}

        {post.hasVideo && (
          <a class="linkcard" href={post.permalink} target="_blank" rel="noreferrer noopener">
            video · open on LinkedIn
          </a>
        )}

        {post.linkTitle && !post.imageUrl && (
          <a class="linkcard" href={post.permalink} target="_blank" rel="noreferrer noopener">
            {post.linkTitle}
          </a>
        )}

        <ActionBar
          post={post}
          threadOpen={threadOpen}
          onToggleThread={() => {
            openThread.value = threadOpen ? null : post.urn
          }}
        />

        {threadOpen && <CommentThread post={post} />}
      </div>
    </article>
  )
}
