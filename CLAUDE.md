# linkedin-x — notes for AI coding agents

## What this is

A Chrome MV3 extension that replaces the LinkedIn home feed. LinkedIn's own feed keeps running underneath as the engine; we draw an overlay and proxy every action back to LinkedIn's real buttons. Read `docs/ARCHITECTURE.md` before changing anything structural.

## The one rule

**No LinkedIn CSS selector, class name, or `aria-label` string may appear outside `src/host/selectors.ts`.**

If you need one, add a key to `SELECTORS` and reach it through `queryOne` / `queryAll` / `visibleTextOf`. This is what keeps a LinkedIn redesign a one-line fix instead of a rewrite. Selector lists are ordered: server-driven attributes first, legacy Ember classes second, loose structural fallback last. Class names are content hashes and must never be matched on. Add new selectors to the front; never delete old ones.

## Design system

Read `DESIGN.md` before any visual change. Colour, typography, spacing and motion are all defined there, with the reasoning, including three deliberate risks: serif post body, amber accent instead of blue, hairlines instead of cards. Do not introduce a hex value, font, or spacing step that is not already a token. `docs/design-preview.html` renders the whole system.

## Layering

```
src/host/     the only LinkedIn-aware code, one reader per surface
src/filter/   pure: RawPost -> PostKind
src/model/    pure: RawPost -> Post
src/state/    signals stores, optimistic updates, kill switch
src/ui/kit/   the component layer: Row, Avatar, Button, Chip, Tabs, …
src/ui/       one view per surface, composed from the kit
```

**The second rule:** surfaces set no spacing of their own. Padding, gutters,
dividers, hover and focus live in `src/ui/kit.css`. A surface that writes its
own `padding` is how the screens drifted apart the first time.

Nothing above `src/host/` may import the DOM contract; nothing in `src/filter/` or `src/model/` may touch the DOM, globals, or async.

## Verification

```bash
npm test         # 192 tests over fixtures in tests/fixtures/, no browser needed
npm run typecheck
npm run build
```

Actions (like, comment, repost, save) cannot be covered by fixtures. If you change them, say plainly that they were not verified rather than implying they were. The manual checklist is in `CONTRIBUTING.md`.

## Diagnostics

The content script runs in an isolated world, so `window.__linkedinX` is invisible to the DevTools console. The doctor report is mirrored onto `document.documentElement.dataset.linkedinXDoctor`, which both worlds can read. Keep it that way: anything meant for a human to read from the console has to cross the world boundary through the DOM.

## Hard constraints

- No network requests, ever. Fonts are bundled.
- No telemetry, analytics, or error reporting.
- No additional permissions beyond `storage` and `https://www.linkedin.com/*`.
- No storing post content anywhere.
- No calling LinkedIn's API directly. Actions are clicks on LinkedIn's own controls.
