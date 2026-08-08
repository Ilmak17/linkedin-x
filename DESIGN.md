# Design System — linkedin-x

## Product Context

- **What this is:** A browser extension that replaces the LinkedIn home feed with a calm, reader-focused timeline. The native feed keeps running offscreen as the engine; we render our own surface on top and proxy every action back to it.
- **Who it's for:** Developers and professionals who need LinkedIn for work and resent what the feed does to their attention.
- **Space/industry:** Browser extensions that reskin a site they don't control. Peers: Modern for Hacker News, Refined GitHub, Old Reddit Redirect, linkedin-feed-blocker.
- **Project type:** Reading surface. Not a dashboard, not a marketing site. Every decision serves sustained reading.

## The One Thing

Someone opens this once and thinks: **"oh, these are people writing, not brands posting."**

Every decision below serves that sentence. The serif body text is the loudest expression of it.

## Aesthetic Direction

- **Direction:** Quiet industrial-editorial. The structural discipline of a utility (fixed column, hairlines, tabular numbers) with the typographic care of a reading app.
- **Decoration level:** Minimal. Typography and negative space do all the work. No gradients, no shadows, no cards, no illustration.
- **Mood:** A well-set reading app that happens to contain a social feed. Dense enough to scan, quiet enough to actually read.
- **What we are deliberately not:** LinkedIn's card-and-shadow corporate stack, and x.com's blue. We take x.com's *structure* (single column, avatar-left, hairline separators, bottom action row) because it is the correct structure for a timeline, and we reject its palette and its cramped typography.

## Typography

The type system is where this product earns its identity. Three families, three jobs, no overlap.

- **UI / author names / nav:** **General Sans** (Fontshare) — geometric-humanist grotesque, crisp at small sizes, has real weight range. Not Inter, not Space Grotesk, not the convergence trap.
- **Post body:** **Source Serif 4** (variable, Google Fonts) — the signature move. A serif reframes a LinkedIn post from ad copy into writing. Excellent screen serif with a genuine variable optical range, unlike display serifs that fall apart below 20px.
- **Metadata / counters / timestamps:** **JetBrains Mono** at 12px with `font-variant-numeric: tabular-nums`. Counters that don't reflow when a like lands is the small thing that makes optimistic UI feel solid.
- **Code inside posts:** JetBrains Mono, same family, 13px.

Loading: self-hosted WOFF2 subsets bundled with the extension. No CDN. An extension that phones out to Google Fonts on every LinkedIn page load is both a privacy leak and a Chrome Web Store review problem.

### Scale

| Token | Size / line-height | Family | Use |
|---|---|---|---|
| `--fs-body` | 17px / 1.6 | Source Serif 4 | Post body text |
| `--fs-body-sm` | 15px / 1.55 | Source Serif 4 | Comment body |
| `--fs-name` | 15px / 1.3 | General Sans 600 | Author name |
| `--fs-meta` | 13px / 1.3 | General Sans 400 | Headline, "· 3h" |
| `--fs-num` | 12px / 1 | JetBrains Mono 400 | Counters, timestamps |
| `--fs-title` | 20px / 1.25 | General Sans 600 | Settings, empty states |
| `--fs-display` | 28px / 1.15 | General Sans 600 | Onboarding only |

17px body is deliberately larger than LinkedIn's 14px. Fewer posts per screen is a feature.

## Color

**Approach:** Restrained. Neutrals carry the interface; exactly one accent, used rarely.

**Risk taken:** the accent is amber, not blue. LinkedIn is blue. X is blue. Every professional tool is blue. Warm amber reads as a reading lamp rather than a notification badge, pairs with the serif, and makes the product recognizable in one glance.

### Dark (default)

```css
--bg:            #0E0E10;  /* near-black, slightly cool */
--surface:       #16161A;  /* composer, menus, hover */
--surface-hover: #1C1C21;
--hairline:      #232329;  /* the only separator in the product */
--text:          #EDEDEF;
--text-muted:    #8B8B94;
--text-faint:    #5A5A63;
--accent:        #E8A33D;
--accent-dim:    #4A3617;  /* liked-state fill */
--success:       #4FB477;
--danger:        #E2564D;
```

### Light

```css
--bg:            #FBFAF8;  /* warm paper, not white */
--surface:       #FFFFFF;
--surface-hover: #F3F1ED;
--hairline:      #E6E3DE;
--text:          #17171A;
--text-muted:    #6B6B73;
--text-faint:    #9A9AA2;
--accent:        #B26E10;  /* darkened for AA on paper */
--accent-dim:    #F7E9CF;
--success:       #2E7D52;
--danger:        #C0392B;
```

Both palettes clear WCAG AA for body text (dark: 14.8:1, light: 15.6:1) and for muted text at 13px+ (dark: 5.1:1, light: 5.4:1). Accent on background clears AA for large text and UI elements, and is never used for body copy.

Dark is the default. The audience is developers, and the surface is for evening reading.

## Spacing

- **Base unit:** 4px.
- **Density:** Comfortable. Denser than a blog, looser than LinkedIn.
- **Scale:** `2xs 2 · xs 4 · sm 8 · md 12 · lg 16 · xl 24 · 2xl 32 · 3xl 48`
- **Post block:** 16px top/bottom padding, 12px gutter between avatar and content, 12px between body and action row.
- **Action row:** 4 actions, `justify-content: space-between` capped at 320px wide, so the icons align down the whole column.

## Layout

- **Approach:** Grid-disciplined. One column, no exceptions.
- **Column:** 600px, centered. Below 640px viewport it goes full-bleed with 16px side padding.
- **No sidebars.** Not narrower ones, not collapsible ones. The right rail is where LinkedIn puts everything we are removing.
- **Separators:** a single 1px `--hairline` rule between posts. No cards, no borders, no shadows, no background shifts. This is the second risk: it removes the "corporate card stack" read entirely, at the cost of slightly weaker post boundaries when two short posts sit adjacent. The 16px padding carries that weight.
- **Top bar:** sticky, 52px, `--bg` with a bottom hairline. Wordmark left, settings gear right. Nothing else.
- **Radius:** `sm 6px` (images, buttons), `md 10px` (menus, dialogs), `full` (avatars only). Avatars are 40px in the feed, 32px in comments.

## Motion

**Approach:** Minimal-functional, with exactly one moment of delight.

- **Easing:** enter `cubic-bezier(0.16, 1, 0.3, 1)`, exit `ease-in`, move `ease-in-out`.
- **Duration:** micro 100ms (hover, color), short 180ms (menus, disclosure), medium 260ms.
- **No entrance animation on posts.** Animating rows during a scroll-driven infinite feed reads as jank, not polish.
- **The one moment:** the like button scales `1 → 1.25 → 1` over 220ms on the enter curve and fills with `--accent`. It fires optimistically, before the proxied click resolves. If the action fails, it reverses over 180ms and a hairline toast explains why.
- **Respect `prefers-reduced-motion: reduce`:** all of the above collapses to instant state changes.

## Safe choices vs risks

**Safe (category baseline, users expect these):**
- Single ~600px column, avatar-left, action row at the bottom of each post.
- Circular avatars.
- Dark by default for a developer-facing tool.

**Risks (where the product gets its own face):**
1. **Serif post body.** Reframes a post as writing rather than content marketing. Costs some perceived "app-ness"; some users read serif as blog-like. Mitigated by keeping every piece of chrome in the sans.
2. **Amber accent, no blue anywhere.** Instantly not-LinkedIn and not-X. Costs the learned affordance that blue means interactive; mitigated by never relying on color alone for affordance (icons carry shape and hover states).
3. **Zero cards, hairlines only.** Removes the corporate stack read. Costs post-boundary clarity for adjacent short posts; mitigated by generous vertical padding.

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-08-08 | Initial design system | Created by /design-consultation for the linkedin-x extension |
| 2026-08-08 | Serif body, sans chrome | The single strongest lever for "people writing, not brands posting" |
| 2026-08-08 | Amber accent instead of blue | Differentiation from both LinkedIn and x.com in one glance |
| 2026-08-08 | Self-hosted fonts, no CDN | Privacy, plus Chrome Web Store review friction with remote resources |
| 2026-08-08 | No post entrance animation | Animating rows in an infinite scroll reads as jank |
