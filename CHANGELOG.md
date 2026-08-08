# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow [SemVer](https://semver.org/).

## [Unreleased]

### Fixed

- The timeline stayed empty on a real feed. The mutation observer was bound to the feed container found at start-up, which LinkedIn replaces while it hydrates, so it never fired again. It now watches `documentElement`, with a warm-up poll alongside it.
- The doctor was unreachable. A content script runs in an isolated world, so `window.__linkedinX` is invisible to the DevTools console; the report is now mirrored onto a data attribute that both worlds can read.

## [0.1.0] — 2026-08-09

First working version.

### Added

- Reader-focused timeline replacing the LinkedIn home feed: one 600px column, hairline separators, post body set in Source Serif 4
- Noise filtering, on by default: ads, "X commented on this", "People you may know", carousels, polls and job lists, each independently switchable
- Full action set proxied to LinkedIn's own controls: like, comment, repost, save, with optimistic updates and rollback on failure
- Comment threads: read and reply without leaving the timeline
- Infinite scroll driven by LinkedIn's own pagination
- Dark and light themes plus a system option, `prefers-reduced-motion` honoured
- Settings popup
- Kill switch: if the feed cannot be read, the extension steps aside and offers the original LinkedIn
- Doctor diagnostic, readable from the console via `document.documentElement.dataset.linkedinXDoctor`, reporting which markup generation and which selectors matched
- 62 tests over saved HTML fixtures, runnable without a LinkedIn account
- Support for both feed generations: LinkedIn's current server-driven markup and the legacy Ember markup still served to some members

### Notes

- Reading was verified against the live LinkedIn feed on 2026-08-09. Actions (like, comment, repost, save) and infinite scroll have not been exercised end to end; see the manual checklist in CONTRIBUTING.md.
- LinkedIn's markup is not a stable interface. Every selector lives in `src/host/selectors.ts` as an ordered candidate list so a break is a one-line fix.
- The server-driven markup carries no activity urn, so post permalinks are not derivable and the UI degrades to plain text where it would link out.
- The extension makes no network requests. Fonts are bundled.

[Unreleased]: https://github.com/Ilmak17/linkedin-x/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Ilmak17/linkedin-x/releases/tag/v0.1.0
