import { useState } from 'preact/hooks'
import { formatCount, type Post } from '../model/post'
import { repost, toggleLike, toggleSave } from '../state/store'
import { BookmarkIcon, CommentIcon, HeartIcon, RepostIcon } from './icons'

interface Props {
  post: Post
  threadOpen: boolean
  onToggleThread: () => void
}

export function ActionBar({ post, threadOpen, onToggleThread }: Props) {
  const [popping, setPopping] = useState(false)

  const like = () => {
    if (!post.viewer.liked) {
      setPopping(true)
      setTimeout(() => setPopping(false), 240)
    }
    toggleLike(post)
  }

  return (
    <div class="actions">
      <button
        class={`action${popping ? ' pop' : ''}`}
        aria-pressed={post.viewer.liked}
        aria-label={post.viewer.liked ? 'Remove reaction' : 'Like'}
        onClick={like}
      >
        <HeartIcon />
        <span class="count">{formatCount(post.stats.reactions)}</span>
      </button>

      <button class="action" aria-pressed={threadOpen} aria-label="Comments" onClick={onToggleThread}>
        <CommentIcon />
        <span class="count">{formatCount(post.stats.comments)}</span>
      </button>

      <button class="action" aria-label="Repost" onClick={() => void repost(post)}>
        <RepostIcon />
        <span class="count">{formatCount(post.stats.reposts)}</span>
      </button>

      <button
        class="action"
        aria-pressed={post.viewer.saved}
        aria-label={post.viewer.saved ? 'Unsave' : 'Save'}
        onClick={() => toggleSave(post)}
      >
        <BookmarkIcon />
      </button>
    </div>
  )
}
