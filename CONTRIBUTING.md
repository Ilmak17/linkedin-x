# Contributing

The most valuable contributions to this project are small and specific. Read this before opening a PR; it should take three minutes.

## The three kinds of contribution that matter most

### 1. A selector broke

This is the bread and butter of the project and needs no architectural knowledge.

1. On `linkedin.com/feed`, open the console and run `__linkedinX.doctor()`.
2. Find the field that is missing or matching the wrong element.
3. Add the new selector to the **front** of that key's list in `src/host/selectors.ts`. Do not delete the old ones: people on older LinkedIn buckets still need them.
4. Add a fixture (below) so it stays fixed.

### 2. A post type is classified wrong

An ad slipped through, or a real post got filtered as noise.

1. Capture the post's markup (see fixtures below).
2. Add it to `tests/fixtures/`.
3. Add the expected verdict to `tests/host.test.ts` or `tests/classify.test.ts`.
4. Adjust `src/filter/classify.ts` until it passes.

If your LinkedIn is not in English and a marker word is missing, adding it to the word lists in `classify.ts` is a perfect first PR. Each list is matched case-insensitively as a substring, so a stem is enough.

### 3. A fixture

Fixtures make everything else testable. To capture one:

```js
copy(document.querySelector('.scaffold-finite-scroll__content').outerHTML)
```

Then, **before committing**, remove:

- real names, headlines and profile URLs
- real `urn:li:activity:` ids (replace with `1000000000000000001`, `…02`, and so on)
- real image URLs (point them at `media.example.com`)
- anything identifying about you or the people whose posts you captured

Trim it to the few posts you care about. A fixture is a test input, not an archive.

## Setup

```bash
npm install
npm run fonts     # optional; without it the UI falls back to system fonts
npm run build
```

Load `dist/` at `chrome://extensions` with Developer mode on. After each rebuild, press reload on the extension card, then reload the LinkedIn tab.

```bash
npm run dev        # rebuild the content script on change
npm test           # unit + fixture tests, no browser
npm run typecheck
```

## Where code goes

| If you are changing… | It belongs in |
|---|---|
| anything about LinkedIn's markup | `src/host/selectors.ts` — and nowhere else |
| how we read a post | `src/host/dom-host.ts` |
| what counts as noise | `src/filter/classify.ts` |
| what the UI shows | `src/ui/` |
| colours, type, spacing | `DESIGN.md` first, then `src/ui/styles.css` |

**The rule that keeps this project maintainable:** no file outside `src/host/` may contain a LinkedIn CSS selector, class name, or `aria-label` string. If you find yourself needing one, add a key to `selectors.ts` and use it through `queryOne` / `queryAll`. PRs that break this will be asked to change.

## Design changes

`DESIGN.md` is the source of truth for colour, typography, spacing and motion, and it explains *why* each choice was made, including the three deliberate risks (serif body text, amber accent, no cards). If you want to change one of those, open an issue and make the case before writing code. If you are adding a new component, use the existing tokens; do not introduce new hex values.

`docs/design-preview.html` renders the whole system in one page. Open it in a browser when you touch styles.

## Manual test checklist

Actions cannot be covered by fixtures: they need a live LinkedIn session and depend on LinkedIn's own confirmation behaviour. Before a release, on a real account:

- [ ] Feed loads and shows only organic posts
- [ ] Scrolling to the bottom loads more posts, repeatedly
- [ ] Like: fills immediately, count increments, survives a refresh
- [ ] Unlike: reverses, count decrements
- [ ] Comment: thread opens, comment sends, appears in the thread, survives a refresh
- [ ] Repost: the dropdown item is found and the count increments
- [ ] Save: no error toast
- [ ] Every category toggle in the popup changes what is shown
- [ ] Theme switch works in both directions
- [ ] Turning the extension off restores LinkedIn immediately, with no reload
- [ ] Navigating to `/jobs` and back to `/feed` unmounts and remounts cleanly
- [ ] A failed action shows a toast and rolls the optimistic update back

Note which of these you ran in the PR description. "I ran the checklist" with items you did not test is worse than saying you skipped them.

## Commits and PRs

- One concern per PR. A selector fix and a UI change are two PRs.
- Present tense, lowercase subject: `add sdui selector for author headline`.
- CI runs typecheck, tests and a build. All three must pass.
- If your change affects what a user sees, say so in the PR description in one sentence.

## Scope

Things this project will not grow into:

- A post composer, a profile page, a jobs surface, or a messaging client. The feed is the product.
- Analytics, telemetry, or error reporting of any kind.
- Any network request. The extension talks to nothing.
- Storing post content anywhere.

Proposals that fit within those lines are welcome. Open an issue first for anything larger than a bug fix.

## Code of conduct

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).
