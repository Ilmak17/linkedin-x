import type { RawPost } from '../host/types'

/**
 * What kind of thing LinkedIn put in the feed.
 *
 * This is the riskiest logic in the project, because LinkedIn deliberately
 * makes ads look like posts, and the wording differs per locale. So it is a
 * pure function over markers the host already extracted: no DOM, no globals,
 * no async. That makes it testable against saved fixtures in milliseconds,
 * which is the only way this stays correct as LinkedIn changes.
 */
export type PostKind =
  | 'organic' // a person posted something
  | 'promoted' // an ad
  | 'social-proof' // surfaced because a connection reacted or commented
  | 'suggested' // "people you may know", "recommended for you"
  | 'module' // a carousel, poll module, job list, newsletter card

export interface Settings {
  showPromoted: boolean
  showSocialProof: boolean
  showSuggested: boolean
  showModules: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  showPromoted: false,
  showSocialProof: false,
  showSuggested: false,
  showModules: false,
}

// Localised markers. LinkedIn serves the UI in the member's locale, so a
// selector-only approach silently fails for everyone outside English.
// Add your locale here and send a PR; each list is matched case-insensitively
// as a substring, so partial stems are fine.
const PROMOTED = [
  'promoted',
  'sponsored',
  'продвигается',
  'реклама',
  'жарнама',
  'gesponsert',
  'anzeige',
  'sponsorisé',
  'promocionado',
  'patrocinado',
  'sponsorizzato',
  'sponsorlu',
  'गुज',
]

const SOCIAL_PROOF = [
  'likes this',
  'liked this',
  'commented on',
  'reacted to',
  'follows',
  'follow this page',
  'reposted this',
  'shared this',
  'репостнул',
  'поделился этим',
  'other connections',
  'other connection',
  'нравится',
  'прокомментировал',
  'отреагировал',
  'подписан',
  'ұнатады',
  'gefällt das',
  'kommentierte',
  'aime',
  'a commenté',
  'le gusta',
  'comentó',
]

const SUGGESTED = [
  'suggested',
  'recommended for you',
  'people you may know',
  'you might like',
  'based on your',
  'рекомендуем',
  'возможно, вы знакомы',
  'может понравиться',
  'ұсынылады',
  'vorgeschlagen',
  'suggéré',
  'sugerido',
]

const MODULE = [
  'jobs for you',
  'hiring',
  'newsletter',
  'course',
  'poll',
  'вакансии для вас',
  'рассылка',
  'опрос',
  'курс',
]

const hasAny = (haystack: string, needles: string[]): boolean => {
  const s = haystack.toLowerCase()
  return needles.some((n) => s.includes(n))
}

export function classify(post: RawPost): PostKind {
  const { markers } = post

  // Ads first: a promoted post also carries a normal action bar, so every
  // other check would happily call it organic.
  if (markers.hasSponsoredBadge) return 'promoted'
  if (hasAny(markers.descriptionText, PROMOTED)) return 'promoted'
  if (hasAny(markers.headerText, PROMOTED)) return 'promoted'

  // Anything without a reaction control is a module LinkedIn injected, not a
  // post a person wrote. Carousels, PYMK strips and job lists all land here,
  // in every locale, without needing a word list.
  if (!markers.hasActionBar) return 'module'
  if (hasAny(markers.headerText, MODULE)) return 'module'

  if (hasAny(markers.headerText, SUGGESTED)) return 'suggested'
  if (hasAny(markers.headerText, SOCIAL_PROOF)) return 'social-proof'

  return 'organic'
}

export function shouldShow(kind: PostKind, settings: Settings): boolean {
  switch (kind) {
    case 'organic':
      return true
    case 'promoted':
      return settings.showPromoted
    case 'social-proof':
      return settings.showSocialProof
    case 'suggested':
      return settings.showSuggested
    case 'module':
      return settings.showModules
  }
}
