import { useEffect, useRef, useState } from 'preact/hooks'
import type { RawComment } from '../host/types'
import type { Post } from '../model/post'
import { formatCount } from '../model/post'
import { loadComments, openThread, submitComment } from '../state/store'
import { ActionBar } from './ActionBar'
import { Avatar, Button, EmptyState, Row, Skeleton } from './kit'

/**
 * A post on its own, the way x opens one.
 *
 * The thread used to expand inside its row, which buried it: a long thread
 * pushed the rest of the timeline out of reach and the post being discussed
 * scrolled away above it. Here the post is the page.
 */
export function ThreadView({ post }: { post: Post }) {
  const [comments, setComments] = useState<RawComment[] | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const heading = useRef<HTMLDivElement>(null)

  // Opening a post replaces the whole column. Without moving focus, a screen
  // reader stays wherever the timeline was and never learns anything changed.
  useEffect(() => {
    heading.current?.focus()
  }, [post.id])

  useEffect(() => {
    let live = true
    setComments(null)
    void loadComments(post.id).then((c) => {
      if (live) setComments(c)
    })
    return () => {
      live = false
    }
  }, [post.id])

  const send = async () => {
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    const ok = await submitComment(post, text)
    setSending(false)
    if (ok) {
      setDraft('')
      setComments(await loadComments(post.id))
    }
  }

  const close = () => {
    openThread.value = null
  }

  return (
    <>
      <div class="kit-head thread-head" ref={heading} tabIndex={-1} role="heading" aria-level={1}>
        <button class="thread-back" onClick={close} aria-label="Back to the timeline">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <span>Post</span>
      </div>

      <article class="thread-post">
        <div class="thread-actor">
          <Avatar src={post.author.avatar} name={post.author.name} href={post.author.url} size={48} />
          <div>
            <a class="name" href={post.author.url} target="_blank" rel="noreferrer noopener">
              {post.author.name}
            </a>
            <div class="headline">{post.author.headline}</div>
          </div>
        </div>

        {post.text && <div class="thread-text">{post.text}</div>}

        {post.imageUrl && (
          <div class="media">
            <img src={post.imageUrl} alt="" loading="lazy" />
          </div>
        )}

        {post.timeLabel && <div class="thread-time">{post.timeLabel}</div>}

        <div class="thread-stats">
          <span>
            <b>{formatCount(post.stats.reactions) || '0'}</b> reactions
          </span>
          <span>
            <b>{formatCount(post.stats.comments) || '0'}</b> comments
          </span>
          <span>
            <b>{formatCount(post.stats.reposts) || '0'}</b> reposts
          </span>
        </div>

        <ActionBar post={post} threadOpen onToggleThread={close} />
      </article>

      <div class="thread-composer">
        <textarea
          value={draft}
          rows={2}
          placeholder="Post your reply"
          onInput={(e) => setDraft((e.target as HTMLTextAreaElement).value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') void send()
          }}
        />
        <Button variant="primary" disabled={!draft.trim() || sending} onClick={() => void send()}>
          {sending ? 'Sending' : 'Reply'}
        </Button>
      </div>

      {comments === null && (
        <>
          <Skeleton lines={2} />
          <Skeleton lines={2} />
        </>
      )}

      {comments?.length === 0 && <EmptyState title="No replies yet">Be the first to say something.</EmptyState>}

      {comments?.map((c) => (
        <Row key={c.id} lead={<Avatar src={c.avatarUrl} name={c.authorName} size={40} />}>
          <div class="byline">
            <span class="name">{c.authorName || 'LinkedIn member'}</span>
            {c.authorHeadline && <span class="headline">{c.authorHeadline}</span>}
            {c.timeLabel && <span class="sep">·</span>}
            {c.timeLabel && <span class="time">{c.timeLabel}</span>}
          </div>
          <div class="text">{c.text}</div>
        </Row>
      ))}
    </>
  )
}
