# Architecture

## The problem this shape solves

LinkedIn's feed is a React application whose class names are compiled and change between releases. Any extension that restyles it by CSS is betting on selectors that were never meant to be stable. Any extension that reimplements it by calling LinkedIn's API is betting on undocumented endpoints plus CSRF handling, and looks like automation from the server's side.

So the code is arranged around one question: **when LinkedIn changes, how many files do I have to fix?**

The answer is one, `src/host/selectors.ts`, and in the worst case one directory, `src/host/`.

## The seam

```
┌──────────────────────────────────────────────────────────────┐
│  LinkedIn's page                                             │
│  · native feed keeps its normal layout                       │
│  · virtualisation, lazy loading and pagination untouched     │
└──────────────────────────────────────────────────────────────┘
              │ read DOM                        ▲ dispatch click
              ▼                                 │
┌──────────────────────────────────────────────────────────────┐
│  src/host/          THE ONLY LINKEDIN-AWARE CODE             │
│                                                              │
│  selectors.ts   every selector, as ordered candidate lists    │
│  dom-host.ts    HostFeed implemented over the live DOM        │
│  types.ts       the interface, and RawPost                    │
└──────────────────────────────────────────────────────────────┘
              │ RawPost (plain data)
              ▼
   src/filter/classify.ts     pure: RawPost → PostKind
   src/model/post.ts          pure: RawPost → Post
   src/state/store.ts         signals, optimistic updates, kill switch
   src/ui/                    Preact, inside a shadow root
```

Nothing below `src/host/` imports anything above it, and nothing above it imports the DOM contract. `HostFeed` is four methods:

```ts
harvest(): RawPost[]
observe(cb): () => void
act(urn, action): Promise<Result<void>>
comments(urn): Promise<Result<RawComment[]>>
```

A second implementation that patches `fetch` and reads LinkedIn's server-driven UI JSON would satisfy the same interface. The UI would not notice.

## Three decisions worth the words

### We cover the page, we do not hide it

The obvious move is `display: none` on the feed container. It is also wrong. LinkedIn's feed virtualises rows, lazy-loads images, and paginates from an IntersectionObserver. All three depend on the element being laid out. Hide it and the engine we are borrowing stops running.

So the native feed is left completely alone, and our timeline is a `position: fixed` overlay with an opaque background at a very high z-index. LinkedIn is still there, still working, just not visible.

The cost: LinkedIn keeps downloading images we never show. Acceptable for now; a future version can null out `img.src` on posts we have already parsed.

### Infinite scroll is window scroll

Our overlay scrolls independently, so the window never moves, so LinkedIn's pagination sentinel never enters the viewport, so nothing loads. `DomHost.loadMore()` fixes that by scrolling the window to the bottom of the document and waiting for the post count to grow. In some locales and A/B buckets LinkedIn shows an explicit "Show more feed updates" button instead, so we click that too if we find it.

`overscroll-behavior: contain` on the overlay keeps a wheel gesture from chaining into the page underneath and confusing the whole arrangement.

### Actions are clicks, not requests

`act()` finds the post by its `urn:li:activity:…` identifier, finds LinkedIn's own control inside it, and clicks. Then it waits for LinkedIn to confirm: `aria-pressed` flipping, the comment editor emptying, the thread appearing. If confirmation does not arrive inside the timeout, the action fails with `ACTION_TIMEOUT` and the store rolls its optimistic update back.

Repost and save need one more step, because LinkedIn puts them behind a dropdown rendered in a portal outside the post element. We open the menu, find the item by its text in any of several languages, and click it. This is the most fragile part of the extension and the first thing to check when something stops working.

## Data flow

```
native DOM
  → harvest()            RawPost[]      raw strings and counts
  → classify()           PostKind       organic | promoted | social-proof | suggested | module
  → normalize()          Post           what the UI renders
  → store.ingest()                      merged by urn, LinkedIn's ordering preserved,
                                        our optimistic viewer state kept
  → visiblePosts         computed       filtered by settings
  → <PostCard>
```

`ingest` merges rather than replaces because a re-harvest fires on every LinkedIn mutation, including ones caused by our own click. Replacing wholesale would flip a like back a frame after the user pressed it.

## Failure handling

The host never throws into the UI. It returns `Result<T>` with one of:

| Code | Means |
|---|---|
| `SELECTOR_MISS` | the element we needed is not where we expected |
| `POST_GONE` | the post left the native DOM while we worked |
| `ACTION_TIMEOUT` | we clicked, LinkedIn never confirmed |
| `NOT_SUPPORTED` | this action is not available on this post |

Above that sits the kill switch: if `isReady()` is true (a feed container exists) but `harvest()` returns nothing, the store sets `brokenReason` and the UI replaces itself with an explanation plus a button that disables the extension. A user is never left staring at an empty screen wondering whether LinkedIn is down.

## Testing strategy

| Layer | How | Why |
|---|---|---|
| `classify`, `normalize`, counters | pure unit tests | the riskiest logic, and it runs in microseconds |
| `DomHost.harvest`, `doctor` | happy-dom over saved HTML fixtures | proves selectors match real markup without a LinkedIn account |
| `act`, `comments`, `loadMore` | manual checklist in CONTRIBUTING.md | needs a live session; fixtures cannot fake LinkedIn's confirmation behaviour |

Fixtures are captured with `copy(document.querySelector(…).outerHTML)` and scrubbed of names, URNs and profile URLs before being committed.

## What is deliberately not here

- No background service worker. Nothing needs to outlive the page.
- No composer. Writing a post opens LinkedIn's own.
- No profile, jobs or messaging surfaces. The feed is the whole product.
- No storage of post content. We hold posts in memory for the life of the tab and write nothing but settings.
