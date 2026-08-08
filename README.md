<div align="center">

<img src="public/icons/icon-128.png" width="72" height="72" alt="">

# linkedin-x

**A browser extension that replaces the LinkedIn home feed with a calm, reader-focused timeline.**

Posts from people you follow, set in a serif, one column, no ads, no "someone you barely know commented on this", no job carousels. Everything you can do on LinkedIn still works, because underneath it *is* LinkedIn.

[Install](#install) · [How it works](#how-it-works) · [When LinkedIn breaks it](#when-linkedin-breaks-it) · [Contributing](CONTRIBUTING.md)

</div>

---

## Why

There are two good extensions in this space and neither does this.

[linkedin-feed-blocker](https://github.com/andrewpollack/linkedin-feed-blocker) deletes the feed. That is the right call if you only want LinkedIn for jobs and messages, and it is nine lines of CSS, which is admirable. But it is all or nothing.

[Modern for Hacker News](https://modernhn.com/) restyles Hacker News beautifully. That works because HN is static HTML with class names that have not changed in a decade. LinkedIn is a React app with obfuscated class names that change between releases, so the same approach would break every other week.

linkedin-x takes a third path: keep LinkedIn's feed running as the engine, draw our own surface on top, and route every action back down to the real buttons.

## What you get

- **One column, 600px, hairlines instead of cards.** No sidebars, no "People also viewed", no shadows.
- **Post text set in a serif.** The single change that makes a LinkedIn post read like writing instead of ad copy.
- **Ads and noise gone by default.** Promoted posts, "X commented on this", "People you may know", job carousels and polls are filtered out. Each category can be switched back on.
- **Every action still works.** Like, comment, repost and save all work from the new UI, with optimistic updates.
- **Dark by default**, light theme included, `prefers-reduced-motion` respected.
- **It gets out of the way when it breaks.** If we cannot read the feed, we say so and hand you the original.

Design decisions and the full token set live in [DESIGN.md](DESIGN.md). Open [docs/design-preview.html](docs/design-preview.html) in a browser to see the system rendered.

## Install

No store listing yet. Build it and load it unpacked:

```bash
git clone https://github.com/Ilmak17/linkedin-x
cd linkedin-x
npm install
npm run fonts     # downloads the three bundled font families
npm run build
```

Then open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and pick the `dist/` folder. Works in Chrome, Edge, Brave and any other Chromium browser with MV3.

`npm run fonts` is optional. Skip it and the extension falls back to your system fonts; everything still works, it just looks less like the screenshots.

## How it works

The whole design rests on one decision: **we never modify LinkedIn's DOM and never call LinkedIn's API.**

```
LinkedIn's own feed (untouched, running normally, covered by our overlay)
        │  read                                    ▲  click
        ▼                                          │
┌─────────────────────────────────────────────────────────┐
│  src/host/   the only code that knows LinkedIn exists    │
│              HostFeed: harvest · observe · act · comments│
└─────────────────────────────────────────────────────────┘
        │  RawPost
        ▼
   classify  →  normalize  →  store (optimistic)  →  Preact timeline
```

**Why we cover instead of hide.** `display: none` on the feed would stop LinkedIn's virtualisation, lazy image loading and IntersectionObserver-driven pagination, which are exactly the machinery we depend on. So the native feed keeps its normal layout and we draw a fixed, opaque overlay on top of it. Infinite scroll works by scrolling the window underneath us, which triggers LinkedIn's own pagination.

**Why we click instead of calling the API.** Liking a post means finding LinkedIn's like button and clicking it. No CSRF tokens, no reverse-engineered endpoints, and LinkedIn's own error handling applies for free.

This is **not** the same as being indistinguishable from a person, and an earlier version of this README wrongly claimed it was. A synthesised click carries `isTrusted: false`, and no extension can forge that flag; a single line of LinkedIn's JavaScript can tell our actions from yours. Reading the feed is effectively undetectable, because there is no API that reports what a script read. Acting is not. See [the risk section](#a-caveat-worth-stating-plainly).

**Why `src/host/` matters.** Everything above that interface is ordinary application code. When LinkedIn ships a redesign, one directory changes. A second implementation that reads LinkedIn's JSON responses instead of its DOM can be dropped in without touching a line of UI.

**What the markup actually looks like.** Verified against the live site on 2026-08-09: LinkedIn now serves a server-driven feed where every class name is a content hash (`_6ebd00b4`) that changes each deploy. Nothing here matches on class. The stable handles are `data-testid` on the feed root and post body, `componentkey` for post identity, `role="listitem"`, and `aria-label` prefixes on the action buttons. Where even those run out, posts are read structurally, by walking the text in document order and working out what each piece is.

More detail in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## When LinkedIn breaks it

It will. LinkedIn is migrating the feed to a server-driven UI and the markup moves.

Two things are built for that day:

1. **The kill switch.** If we can see a feed container but read zero posts out of it, the overlay replaces itself with an explanation and a button that gives you the original LinkedIn back. You never get a blank screen.
2. **The doctor.** Open the console on `linkedin.com/feed` and run:

   ```js
   JSON.parse(document.documentElement.dataset.linkedinXDoctor)
   ```

   (A content script runs in an isolated world, so it cannot hang a function
   off the page's `window` where the console would see it. The report is
   written to a data attribute instead, which both worlds share.)

   It reports which markup generation matched, which selector variant matched for every field, how many list items were skipped as modules, and which fields came back empty. Paste that into a [selector break report](https://github.com/Ilmak17/linkedin-x/issues/new?template=selector-break.yml) and the fix is usually a one-line addition to `src/host/selectors.ts`.

Every selector in the project lives in that one file, as an ordered list of candidates: server-driven attributes first, legacy Ember classes second, a loose structural fallback last. Both generations are supported, because LinkedIn still serves the old one to some members. Fixing a break does not require understanding the rest of the codebase.

## Settings

Click the toolbar icon.

| Setting | Default | |
|---|---|---|
| Replace the feed | on | Turn off to get the original LinkedIn back instantly |
| Theme | dark | dark · light · system |
| Show ads | off | Promoted and sponsored posts |
| Show reactions from connections | off | "X commented on this" |
| Show suggestions | off | "People you may know", "Recommended for you" |
| Show modules | off | Carousels, polls, job lists |

## Development

```bash
npm run dev        # rebuild the content script on change
npm test           # 62 tests, no browser needed
npm run typecheck
```

After a rebuild, hit the reload button on the extension card in `chrome://extensions`, then reload the LinkedIn tab.

Tests run against saved HTML fixtures in `tests/fixtures/`, so the parsing and classification logic is verifiable without a LinkedIn account. If you hit a post type we classify wrong, adding a fixture is the most useful contribution you can make.

## Privacy

The extension has two permissions: `storage`, for your settings, and access to `www.linkedin.com`, because that is the page it runs on.

It makes no network requests. Fonts are bundled, not fetched. There is no analytics, no telemetry, no error reporting, no remote config, and no server. Your settings live in Chrome's own sync storage and nowhere else. See [PRIVACY.md](PRIVACY.md).

## A caveat worth stating plainly

This is an unofficial extension that reads and drives a website LinkedIn owns. It makes no network requests, scrapes nothing, stores nothing about posts, and never acts unless you click.

Two honest risks, in order of seriousness.

**Actions are detectable.** Like, comment, repost and save work by clicking LinkedIn's own buttons, and a synthesised click is flagged `isTrusted: false` by the browser. LinkedIn can distinguish those from yours trivially, if it looks. LinkedIn's User Agreement prohibits automated methods of accessing the service, so this is squarely against their terms. Whether it leads to any consequence on an account is not something this project can tell you; treat unsourced claims either way with suspicion, including reassuring ones. If that risk is not worth a nicer feed to you, switch the action toggles off in the popup and use it as a reader — reading is the part that is effectively undetectable.

**Reading is a grey area.** The extension reads the page the way a screen reader does, which is hard to detect and hard to object to. It also adds one element to the page, which is not hidden and is not meant to be. This project will not add anything designed to evade detection.

## Prior art

- [linkedin-feed-blocker](https://github.com/andrewpollack/linkedin-feed-blocker) by Andrew Pollack, which is where the `sduiid=com.linkedin.sdui.pagers.feed.mainFeed` pagination detail came from
- [Modern for Hacker News](https://modernhn.com/), for proving people want this and will pay for it
- x.com, for the timeline structure, which is correct

## License

MIT. See [LICENSE](LICENSE). Bundled fonts keep their own licenses; see [fonts/LICENSES.md](fonts/LICENSES.md).
