# linkedin-x: surfaces and behaviour

**Date:** 2026-08-09
**Status:** approved, in progress

## What this is

An extension that replaces LinkedIn's own screens with x.com-shaped ones, reading
LinkedIn's page and driving LinkedIn's own controls. The feed shipped first; this
spec covers taking it from one screen to a coherent product.

## The problem this design solves

Four screens were built one after another, each hand-rolling its own list row,
avatar, button and empty state. They drifted, and every round of feedback was a
screenshot saying the design was bad. Patching per screenshot does not converge
when the screens share no vocabulary.

## Decisions

**A component kit owns density.** `src/ui/kit/` holds Row, Avatar, Button, Chip,
Tabs, FilterBar, SearchBox, EmptyState, Skeleton. `kit.css` decides padding,
gutter, divider, hover and focus once. Surfaces compose primitives and set no
spacing of their own. This is what makes the remaining surfaces cheap and
automatically consistent.

**A surface router, one host per surface.** A path maps to a surface; each brings
its own reader and view. Adding one touches neither the router nor the surfaces
already there.

**Dark only, x's palette, Inter.** Chirp is proprietary and cannot be
redistributed or fetched — the extension makes no network requests. The stack
asks for Chirp first so a machine that has it gets the real thing.

**We never call LinkedIn's API.** Every action clicks the control a person would
have clicked. This is detectable (a synthesised click carries `isTrusted: false`
and no extension can forge it) and it is the honest trade: reading is
effectively undetectable, acting is not.

## Surfaces

| Surface | Path | Reader | State |
|---|---|---|---|
| Feed | `/feed` | `DomHost` | done |
| Search | `/search/results/*` | `DomHost`, same markup | done |
| Jobs | `/jobs/search*`, `/jobs/collections/*` | `JobsHost`, two generations | done |
| Network | `/mynetwork/*` | `NetworkHost` | done |
| Thread | `/feed` overlay | `DomHost.comments` | this spec |
| Notifications | `/notifications` | `NotificationsHost` | done |
| Messaging | `/messaging` | `MessagingHost` | list done, populated row unverified |

## Remaining work

**Thread view.** A post opens into a dedicated view in the centre column: back
control, the post at reading size, the composer, then the comments. Replaces
the inline expansion, which buried the thread inside a row and made long
threads unreadable. Comments are already read; this is presentation and routing.

**Job detail.** Selecting a job shows its detail beside the list instead of
handing the user to LinkedIn's pane. Requires reading LinkedIn's detail markup,
which has not been surveyed yet — that survey gates the work.

**Network invitations.** A tab for incoming invitations with accept and ignore
through LinkedIn's own buttons. Gated on the test account having invitations to
read.

## What is blocked, and why it stays blocked

Notifications and messaging are the legacy Ember markup, and both are empty on
the account available for testing. Their populated structure cannot be observed,
and a reader written against unobserved markup is exactly what produced a first
feed reader that matched nothing. They ship when there is data to read.

## Testing

Pure logic (classification, counters, filters, unit parsing) is unit-tested.
Readers are tested against HTML fixtures captured from the live site and scrubbed.
Anything involving LinkedIn confirming an action is verified by hand in a browser,
and the report says which items were actually exercised.
