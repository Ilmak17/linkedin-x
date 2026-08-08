import { useEffect, useState } from 'preact/hooks'
import type { RawComment } from '../host/types'
import { initialsOf } from '../model/post'
import { loadComments, submitComment } from '../state/store'
import type { Post } from '../model/post'
import { Avatar } from './Avatar'

export function CommentThread({ post }: { post: Post }) {
  const [comments, setComments] = useState<RawComment[] | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    let live = true
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
    const sentOk = await submitComment(post, text)
    setSending(false)
    if (sentOk) {
      setDraft('')
      setComments(await loadComments(post.id))
    }
  }

  return (
    <div class="thread">
      <div class="composer">
        <textarea
          value={draft}
          placeholder="Write a comment"
          rows={1}
          onInput={(e) => setDraft((e.target as HTMLTextAreaElement).value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') void send()
          }}
        />
        <button class="btn primary" disabled={!draft.trim() || sending} onClick={() => void send()}>
          {sending ? 'Sending' : 'Reply'}
        </button>
      </div>

      {comments === null && <div class="hidden-note">loading comments</div>}

      {comments?.map((c) => (
        <div class="comment" key={c.id}>
          <Avatar src={c.avatarUrl} initials={initialsOf(c.authorName)} name={c.authorName} />
          <div class="body">
            <div class="byline">
              <span class="name">{c.authorName || 'LinkedIn member'}</span>
              <span class="headline">{c.authorHeadline}</span>
            </div>
            <div class="ctext">{c.text}</div>
          </div>
        </div>
      ))}

      {comments?.length === 0 && <div class="hidden-note">no comments yet</div>}
    </div>
  )
}
