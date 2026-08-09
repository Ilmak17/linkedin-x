import { useState } from 'preact/hooks'
import { formatCount, type Post } from '../model/post'
import { repost, toggleLike, toggleSave } from '../state/store'
import { BookmarkIcon, CommentIcon, HeartIcon, RepostIcon } from './icons'
import { glyphFor, ReactionPicker } from './ReactionPicker'

interface Props {
  post: Post
  threadOpen: boolean
  onToggleThread: () => void
}

export function ActionBar({ post, threadOpen, onToggleThread }: Props) {
  const [popping, setPopping] = useState(false)
  const [picking, setPicking] = useState(false)

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

      <div
        class="action-with-picker"
        onMouseEnter={() => setPicking(true)}
        onMouseLeave={() => setPicking(false)}
      >
        {picking && <ReactionPicker post={post} onPicked={() => setPicking(false)} />}
        <button
          class={`action like${popping ? ' pop' : ''}`}
          aria-pressed={post.viewer.liked}
          aria-label={post.viewer.liked ? `Reacted ${post.viewer.reaction}` : 'Like'}
          aria-haspopup="menu"
          onClick={like}
        >
          <span class="ring">
            {post.viewer.reaction ? (
              <span class="reaction-glyph" aria-hidden="true">
                {glyphFor(post.viewer.reaction)}
              </span>
            ) : (
              <HeartIcon />
            )}
          </span>
          <span class="count">{formatCount(post.stats.reactions)}</span>
        </button>
      </div>

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
