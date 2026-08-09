/**
 * Which LinkedIn path maps to which of our screens.
 *
 * Extracted from the content script so it can be tested. It was inline, and
 * an inline pattern shipped a bug nobody could catch without a browser:
 * messaging matched only `/messaging`, while LinkedIn redirects an empty
 * inbox to `/messaging/thread/new/` and any open conversation to
 * `/messaging/thread/<id>/`. The overlay never mounted on the page it claimed
 * to own.
 */

export type SurfaceName =
  | 'feed'
  | 'jobs'
  | 'network'
  | 'profile'
  | 'company'
  | 'saved'
  | 'notifications'
  | 'messaging'

export const SURFACES: Array<{ name: SurfaceName; match: RegExp }> = [
  { name: 'feed', match: /^\/feed\/?$/ },
  // A shared post link and a search result page both render the feed's own
  // post markup, so they are read by the feed surface.
  { name: 'feed', match: /^\/feed\/update\// },
  { name: 'feed', match: /^\/search\/results\// },

  { name: 'jobs', match: /^\/jobs\/(search|search-results|collections)/ },
  { name: 'network', match: /^\/mynetwork\// },
  { name: 'profile', match: /^\/in\/[^/]+/ },
  { name: 'company', match: /^\/company\/[^/]+/ },
  { name: 'saved', match: /^\/my-items\// },
  { name: 'notifications', match: /^\/notifications\// },
  // The inbox, and the composer an empty inbox is redirected to — but not an
  // open conversation. We can render the list; we cannot render a thread, so
  // covering one would replace something that works with something that does
  // not. `/messaging/thread/new/` is the exception because there is no
  // conversation there to hide.
  { name: 'messaging', match: /^\/messaging(?!\/thread\/(?!new))/ },
]

export function surfaceFor(pathname: string): SurfaceName | null {
  return SURFACES.find((s) => s.match.test(pathname))?.name ?? null
}
