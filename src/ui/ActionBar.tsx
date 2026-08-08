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
      setTimeout(() => setPopping(false), 320)
    }
    toggleLike(post)
  }

  return (
    <div class="actions">
      <button class="action comment" aria-pressed={threadOpen} aria-label="Comments" onClick={onToggleThread}>
        <span class="ring">
          <CommentIcon />
        </span>
        <span class="count">{formatCount(post.stats.comments)}</span>
      </button>

      <button class="action repost" aria-label="Repost" onClick={() => void repost(post)}>
        <span class="ring">
          <RepostIcon />
        </span>
        <span class="count">{formatCount(post.stats.reposts)}</span>
      </button>

      <button
        class={`action like${popping ? ' pop' : ''}`}
        aria-pressed={post.viewer.liked}
        aria-label={post.viewer.liked ? 'Remove reaction' : 'Like'}
        onClick={like}
      >
        <span class="ring">
          <HeartIcon />
        </span>
        <span class="count">{formatCount(post.stats.reactions)}</span>
      </button>

      <button
        class="action save"
        aria-pressed={post.viewer.saved}
        aria-label={post.viewer.saved ? 'Unsave' : 'Save'}
        onClick={() => toggleSave(post)}
      >
        <span class="ring">
          <BookmarkIcon />
        </span>
      </button>
    </div>
  )
}
