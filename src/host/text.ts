/**
 * Reading text out of markup that gives us nothing to match on.
 *
 * Every host needs the same walk, and for a while every host had its own copy
 * of it — eight of them, and not identical: the feed's copy was written first
 * and never got the near-duplicate rule the other seven grew, so the feed
 * alone still carried LinkedIn's screen-reader repeats into the UI.
 */

export function normalizeWhitespace(s: string): string {
  return s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Every element's own text, in document order.
 *
 * Reads each element's direct child text nodes rather than the text of
 * childless elements: LinkedIn writes a post's age as `9h •` beside an icon in
 * the same span, so a "childless elements only" walk misses the timestamp.
 *
 * Two kinds of duplicate are dropped. Exact repeats, because LinkedIn prints
 * strings twice for screen readers. And near-repeats where one is a prefix of
 * the one before it — a verified job title appears as both "Senior Engineer
 * (Verified job)" and "Senior Engineer", and keeping both shifted every field
 * after it down a slot.
 */
export function leafTexts(root: Element, exclude?: Element | null): string[] {
  const out: string[] = []
  const seen = new Set<string>()

  for (const el of [root, ...root.querySelectorAll('*')]) {
    if (exclude && (exclude === el || exclude.contains(el))) continue

    const own = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent ?? '')
      .join(' ')

    const text = normalizeWhitespace(own)
    if (!text || seen.has(text)) continue

    const previous = out[out.length - 1]
    if (previous && (previous.startsWith(text) || text.startsWith(previous))) continue

    seen.add(text)
    out.push(text)
  }
  return out
}

/** The longest of a set of strings, which is usually the one that is prose. */
export const longest = (values: string[]): string =>
  values.slice().sort((a, b) => b.length - a.length)[0] ?? ''
