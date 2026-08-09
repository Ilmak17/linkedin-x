import { describe, expect, it } from 'vitest'
import { classify, DEFAULT_SETTINGS, shouldShow, type PostKind } from '../src/filter/classify'
import type { RawPost } from '../src/host/types'

const post = (markers: Partial<RawPost['markers']>): RawPost => ({
  id: 'urn:li:activity:1',
  authorName: 'A',
  authorHeadline: '',
  authorUrl: '',
  avatarUrl: '',
  timeLabel: '1h',
  text: 'x',
  imageUrl: null,
  hasVideo: false,
  linkTitle: null,
  reactions: 0,
  comments: 0,
  reposts: 0,
  liked: false,
  reaction: '',
  markers: { hasSponsoredBadge: false, descriptionText: '', headerText: '', hasActionBar: true, ...markers },
})

describe('classify', () => {
  it('defaults to organic', () => {
    expect(classify(post({}))).toBe('organic')
  })

  it('catches the sponsored badge', () => {
    expect(classify(post({ hasSponsoredBadge: true }))).toBe('promoted')
  })

  it.each([
    ['Promoted', 'en'],
    ['Продвигается', 'ru'],
    ['Жарнама', 'kk'],
    ['Gesponsert', 'de'],
    ['Sponsorisé', 'fr'],
    ['Patrocinado', 'pt'],
  ])('catches "%s" (%s) as an ad', (word) => {
    expect(classify(post({ descriptionText: word }))).toBe('promoted')
  })

  it('prefers the ad verdict over everything else', () => {
    // An ad surfaced under a social-proof header is still an ad.
    expect(classify(post({ descriptionText: 'Promoted', headerText: 'Grace commented on this' }))).toBe('promoted')
  })

  it('treats a post with no reaction control as an injected module', () => {
    // Locale-independent: carousels and PYMK strips never carry an action bar.
    expect(classify(post({ hasActionBar: false, headerText: 'какой-то незнакомый заголовок' }))).toBe('module')
  })

  it.each([
    ['Grace commented on this', 'social-proof'],
    ['Игорю нравится это', 'social-proof'],
    ['People you may know', 'suggested'],
    ['Рекомендуем для вас', 'suggested'],
    ['Jobs for you', 'module'],
  ] as Array<[string, PostKind]>)('reads the header "%s" as %s', (header, kind) => {
    expect(classify(post({ headerText: header }))).toBe(kind)
  })
})

describe('shouldShow', () => {
  it('shows posts people wrote, and hides what LinkedIn injected', () => {
    // Social proof is shown by default: "X likes this" is a header we never
    // render, but the post underneath it is a real post by a real person.
    // Hiding those was filtering out most of a real feed.
    expect(shouldShow('organic', DEFAULT_SETTINGS)).toBe(true)
    expect(shouldShow('social-proof', DEFAULT_SETTINGS)).toBe(true)

    for (const kind of ['promoted', 'suggested', 'module'] as PostKind[]) {
      expect(shouldShow(kind, DEFAULT_SETTINGS)).toBe(false)
    }
  })

  it('lets social proof be hidden for anyone who does want it gone', () => {
    expect(shouldShow('social-proof', { ...DEFAULT_SETTINGS, showSocialProof: false })).toBe(false)
  })

  it('honours an opt-in', () => {
    expect(shouldShow('promoted', { ...DEFAULT_SETTINGS, showPromoted: true })).toBe(true)
  })
})
