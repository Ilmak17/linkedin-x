/**
 * Fonts are bundled with the extension rather than loaded from a CDN: an
 * extension that phones home to Google on every LinkedIn page load is both a
 * privacy leak and a review problem.
 *
 * `scripts/fetch-fonts.mjs` downloads these. If a file is missing the browser
 * silently falls back to the stack declared in styles.css, so a fontless
 * checkout still runs.
 */

interface FontFile {
  family: string
  file: string
  weight: string
  style?: string
}

export const FONT_FILES: FontFile[] = [
  { family: 'General Sans', file: 'general-sans-400.woff2', weight: '400' },
  { family: 'General Sans', file: 'general-sans-500.woff2', weight: '500' },
  { family: 'General Sans', file: 'general-sans-600.woff2', weight: '600' },
  { family: 'Source Serif 4', file: 'source-serif-4-variable.woff2', weight: '200 900' },
  { family: 'Source Serif 4', file: 'source-serif-4-italic.woff2', weight: '200 900', style: 'italic' },
  { family: 'JetBrains Mono', file: 'jetbrains-mono-400.woff2', weight: '400' },
]

export function fontFaceCss(): string {
  const url = (file: string) =>
    typeof chrome !== 'undefined' && chrome.runtime?.getURL
      ? chrome.runtime.getURL(`fonts/${file}`)
      : `fonts/${file}`

  return FONT_FILES.map(
    (f) => `@font-face {
  font-family: '${f.family}';
  src: url('${url(f.file)}') format('woff2');
  font-weight: ${f.weight};
  font-style: ${f.style ?? 'normal'};
  font-display: swap;
}`,
  ).join('\n')
}
