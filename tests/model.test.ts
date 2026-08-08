import { describe, expect, it } from 'vitest'
import { parseCount, firstTimeToken } from '../src/host/dom-host'
import { formatCount, initialsOf } from '../src/model/post'
import { permalinkFrom } from '../src/host/selectors'

describe('parseCount', () => {
  it.each([
    ['', 0],
    ['0', 0],
    ['7', 7],
    ['1,248', 1248],
    ['1 248', 1248],
    ['1.2K', 1200],
    ['12K', 12000],
    ['3.4M', 3_400_000],
    ['31 comments', 31],
    ['12 тыс.', 12000],
    ['nonsense', 0],
  ])('parses %s as %i', (input, expected) => {
    expect(parseCount(input)).toBe(expected)
  })
})

describe('formatCount', () => {
  it.each([
    [0, ''],
    [7, '7'],
    [999, '999'],
    [1000, '1k'],
    [1240, '1.2k'],
    [12400, '12k'],
    [3_400_000, '3.4m'],
  ])('formats %i as "%s"', (input, expected) => {
    expect(formatCount(input)).toBe(expected)
  })
})

describe('firstTimeToken', () => {
  it('keeps only the age', () => {
    expect(firstTimeToken('3h • Edited • Visible to anyone')).toBe('3h')
    expect(firstTimeToken('1 нед. · Изменено')).toBe('1 нед.')
    expect(firstTimeToken('2d')).toBe('2d')
  })
})

describe('initialsOf', () => {
  it.each([
    ['Ada Example', 'AE'],
    ['Ada', 'A'],
    ['Ada Byron Lovelace', 'AL'],
    ['', '·'],
  ])('turns "%s" into "%s"', (name, expected) => {
    expect(initialsOf(name)).toBe(expected)
  })
})

describe('permalinkFrom', () => {
  it('builds a feed update URL from a legacy activity urn', () => {
    expect(permalinkFrom('urn:li:activity:7123')).toBe(
      'https://www.linkedin.com/feed/update/urn:li:activity:7123/',
    )
  })

  it('returns null for a server-driven componentkey token, which encodes no activity id', () => {
    expect(permalinkFrom('vYsP5XCgoiWwJX_PzgmqWospNGAL20BAh')).toBeNull()
  })
})
