# 1. Replace the feed instead of restyling it

**Date:** 2026-08-09
**Status:** accepted

## Context

The goal is a LinkedIn feed that reads like x.com's timeline rather than a corporate card stack, with every action still working.

Two existing projects mark out the space. [linkedin-feed-blocker](https://github.com/andrewpollack/linkedin-feed-blocker) deletes the feed with nine lines of CSS and a declarativeNetRequest rule against the `com.linkedin.sdui.pagers.feed.mainFeed` pager. [Modern for Hacker News](https://modernhn.com/) restyles Hacker News into something genuinely nice.

The Modern-for-HN approach does not transfer. Hacker News is static HTML with class names unchanged for a decade. LinkedIn is a React application with compiled class names, virtualised rows, and an in-progress migration from Ember markup to a server-driven UI. A pure CSS reskin would break on a schedule, and could not produce an x.com layout anyway, because the DOM has LinkedIn's shape, not Twitter's.

## Options considered

**A. CSS skin over the native DOM.** Cheap. Actions work for free. But the layout ceiling is LinkedIn's own DOM shape, and obfuscated class names make it break constantly. Rejected: it cannot deliver the product.

**B. Own render, actions proxied to the native DOM.** Read posts from the native DOM through whatever stable handles it exposes, render our own timeline in a shadow root, and perform actions by clicking LinkedIn's own buttons. Full design freedom, full action set, no API reverse engineering, no CSRF handling, and nothing that looks unlike a person using the site. **Chosen.**

**C. Intercept LinkedIn's JSON and call its API directly.** Patch `fetch`/XHR, read the server-driven UI payload, render from clean structured data, and send actions straight to Voyager with the csrf token from the `JSESSIONID` cookie. Best data quality by far. Also the most work: the SDUI schema is large and moves, every action endpoint needs separate reverse engineering, and direct API calls are the easiest thing for anti-abuse systems to flag. Rejected for now.

## Decision

Build B, behind a `HostFeed` interface narrow enough that C can be implemented later as a second host without touching the UI, the filter, or the store.

Two sub-decisions follow from B and are worth recording:

**We cover the native feed rather than hiding it.** `display: none` would stop the virtualisation, lazy loading and IntersectionObserver pagination we are borrowing. So LinkedIn's feed keeps its normal layout and our timeline is an opaque fixed overlay on top. Infinite scroll works by scrolling the window underneath us.

**We click rather than call.** `act()` finds the native control, clicks it, and waits for LinkedIn to confirm through the DOM. Confirmation timeouts roll the optimistic update back.

## Consequences

Good:

- The design is unconstrained: the timeline is ours to draw.
- All four actions work without touching an undocumented endpoint.
- LinkedIn's own error handling, rate limiting and edge cases apply to our actions, because they are its actions.
- One directory, `src/host/`, absorbs every LinkedIn redesign. In practice, one file.

Bad, and accepted:

- Reading the DOM yields worse data than reading the JSON would: text is already truncated to what LinkedIn rendered, and counts are localised sentences we have to parse.
- The server-driven markup dropped the activity urn, so permalinks are gone. Option C would get them back.
- LinkedIn keeps downloading media for posts we never display. A later version can null out `img.src` after parsing.
- Repost and save go through a dropdown rendered in a portal, matched by visible text per locale. This is the most fragile part of the extension.
- The extension is visible to LinkedIn and always will be. That is deliberate: it does what a user asked, when they asked.

## Revisit when

Reading the DOM stops yielding usable text (LinkedIn moves to canvas rendering, heavier truncation, or shadow DOM of its own), or selector breaks become more frequent than roughly monthly. At that point implement `JsonHost` against the same `HostFeed` interface and switch the binding in `src/content/main.tsx`.
