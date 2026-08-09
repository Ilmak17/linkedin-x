import type { Post } from '../model/post'
import { react } from '../state/store'

/**
 * LinkedIn's six reactions, in its own order.
 *
 * The glyphs are ours rather than LinkedIn's artwork: we send the reaction by
 * clicking their control, but we do not ship their images.
 */
export const REACTIONS: Array<{ name: string; glyph: string; colour: string }> = [
  { name: 'Like', glyph: '👍', colour: 'var(--accent)' },
  { name: 'Celebrate', glyph: '👏', colour: '#6dae4f' },
  { name: 'Support', glyph: '🤝', colour: '#b06ecf' },
  { name: 'Love', glyph: '❤️', colour: 'var(--like)' },
  { name: 'Insightful', glyph: '💡', colour: '#f5bb5c' },
  { name: 'Funny', glyph: '😄', colour: '#44b6c4' },
]

export const glyphFor = (reaction: string): string =>
  REACTIONS.find((r) => r.name.toLowerCase() === reaction.toLowerCase())?.glyph ?? '👍'

export function ReactionPicker({ post, onPicked }: { post: Post; onPicked?: () => void }) {
  return (
    <div class="reaction-picker" role="menu" aria-label="Pick a reaction">
      {REACTIONS.map((r) => (
        <button
          key={r.name}
          class="reaction-option"
          role="menuitem"
          title={r.name}
          aria-label={r.name}
          aria-current={post.viewer.reaction.toLowerCase() === r.name.toLowerCase()}
          onClick={(e) => {
            e.stopPropagation()
            react(post, r.name)
            onPicked?.()
          }}
        >
          <span aria-hidden="true">{r.glyph}</span>
        </button>
      ))}
    </div>
  )
}
