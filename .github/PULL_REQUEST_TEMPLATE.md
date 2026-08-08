## What this changes

<!-- One or two sentences. If a user would notice, say what they will see. -->

## Why

<!-- Link the issue, or describe the irritation this removes. -->

## How it was verified

- [ ] `npm test` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run build` produces a `dist/` that loads in Chrome

If this touches reading, filtering, or actions, list the items from the manual
checklist in CONTRIBUTING.md that you actually ran on a live LinkedIn session.
Saying you ran items you did not is worse than saying you skipped them.

<!-- e.g.
- [x] Like fills immediately and survives a refresh
- [x] Category toggles change what is shown
- [ ] Repost — not tested, no account to repost from
-->

## Checklist

- [ ] No LinkedIn selector, class name, or `aria-label` string outside `src/host/selectors.ts`
- [ ] No new hex colour, font, or spacing value that is not already in `DESIGN.md`
- [ ] No new network request, permission, or stored data
- [ ] Fixtures added for any new post shape, scrubbed of names, URNs, profile URLs and image URLs
