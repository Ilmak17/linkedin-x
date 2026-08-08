# Design System — linkedin-x

## Product Context

- **What this is:** A browser extension that replaces the LinkedIn home feed with an x.com-shaped timeline. The native feed keeps running underneath as the engine; we render our own surface on top and proxy every action back to it.
- **Who it's for:** Developers and professionals who need LinkedIn for work and resent what the feed does to their attention.
- **Space/industry:** Browser extensions that reskin a site they don't control. Peers: Modern for Hacker News, Refined GitHub, Old Reddit Redirect, linkedin-feed-blocker.
- **Project type:** Reading surface. Not a dashboard, not a marketing site. Every decision serves sustained reading.

## The One Thing

Someone opens LinkedIn and, for a second, thinks they are on x.com.

That is a deliberate reversal of this document's first version, which set post
text in a serif and used an amber accent to be recognisably *not* x. Tried
against a real feed, it read as a blog rather than a social app, and the
person it was built for said so twice. x.com's timeline is the shape people
already know for reading a stream of short posts. We take the shape.

## Aesthetic Direction

- **Direction:** x.com's dark shell, LinkedIn's content.
- **Layout:** three columns, `275px` navigation rail, `600px` timeline,
  `350px` right rail, centred. The timeline is bordered on both sides.
- **Theme:** dark only. A light theme was built and then removed; nobody using
  this at 1am wanted it, and every extra theme is a second set of contrast
  decisions to get wrong.
- **Decoration:** none. Flat black, hairline borders, one accent.

## Typography

One family, used everywhere, the way x does it. The serif experiment is over:
in a stream of short professional posts it added weight without adding
clarity, and it made a social feed read like an essay collection.

- **Everything:** **General Sans**, bundled. Falls back to the system sans.
- **Post body:** 15px / 20px line height. Same as x, and it is right: at 17px
  with generous leading, three posts filled a screen and the feed stopped
  feeling like a feed.
- **Names:** 15px, 600 weight. **Headline and age:** 15px, muted, on the same
  line, ellipsised.
- **Counters:** `font-variant-numeric: tabular-nums`, so a like landing does
  not shift the row.

## Color

**Approach:** Near-black surface, one blue accent, two semantic colours for
the two actions that deserve them.

```css
--bg:            #000000;  /* true black, like x's "Lights out" */
--elevated:      #16181c;  /* right-rail cards, avatars */
--border:        #2f3336;  /* every divider in the product */
--text:          #e7e9ea;
--muted:         #71767b;
--accent:        #1d9bf0;  /* links, focus, active tab, primary button */
--like:          #f91880;
--repost:        #00ba7c;
--danger:        #f4212e;
```

The amber accent is gone with the serif. Being unmistakably not-LinkedIn
turned out to matter less than being instantly familiar.

## Spacing

- **Base unit:** 4px.
- **Post block:** 12px vertical padding, 16px horizontal, 12px gutter between
  avatar and content. Denser than the first version, because a feed you scroll
  is not an article you settle into.
- **Action row:** four actions, `space-between`, capped at 425px so the icons
  align down the whole column.
- **Rail links:** 11px/12px padding inside a pill that only paints on hover.

## Layout

- **Three columns**, centred: `275px` rail, `600px` timeline, `350px` aside.
- **Timeline** is bordered left and right, which is what stops it reading as
  text floating in a void.
- **Sticky tab head** with a blurred translucent background, `For you` active.
- **Breakpoints:** under 1265px the right rail goes and the left rail collapses
  to icons; under 700px only the timeline remains.
- **Radius:** `16px` (media, cards, composer), `999px` (avatars, buttons,
  action rings). Avatars are 40px in the feed, 32px in comments.

## Motion

**Approach:** Minimal-functional, with exactly one moment of delight.

- **Easing:** enter `cubic-bezier(0.16, 1, 0.3, 1)`, exit `ease-in`, move `ease-in-out`.
- **Duration:** micro 100ms (hover, color), short 180ms (menus, disclosure), medium 260ms.
- **No entrance animation on posts.** Animating rows during a scroll-driven infinite feed reads as jank, not polish.
- **The one moment:** the like button scales `1 → 1.35 → 1` over 300ms and fills with `--like`. It fires optimistically, before the proxied click resolves. If the action fails it reverses, and a toast says why.
- **Respect `prefers-reduced-motion: reduce`:** all of the above collapses to instant state changes.

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-08-08 | Initial design system | Created by /design-consultation for the linkedin-x extension |
| 2026-08-08 | Serif body, sans chrome | Reverted 2026-08-09: read as a blog, not a feed |
| 2026-08-08 | Amber accent instead of blue | Reverted 2026-08-09: familiarity beat differentiation |
| 2026-08-08 | Self-hosted fonts, no CDN | Privacy, plus Chrome Web Store review friction with remote resources |
| 2026-08-08 | No post entrance animation | Animating rows in an infinite scroll reads as jank |
| 2026-08-09 | x.com's three-column shell, dark only | Two rounds of "the design is bad" against a real feed. x's timeline is the shape people already read streams in |
| 2026-08-09 | One sans, 15/20 body | The serif made short professional posts feel heavier than they are |
| 2026-08-09 | Light theme removed | Half the contrast decisions, none of the demand |
