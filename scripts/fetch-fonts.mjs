#!/usr/bin/env node
// Downloads the three font families into fonts/ so the built extension never
// talks to a font CDN at runtime.
//
// All three are freely redistributable:
//   General Sans   — ITF Free Font License (Fontshare)
//   Source Serif 4 — SIL Open Font License 1.1
//   JetBrains Mono — SIL Open Font License 1.1
// See fonts/LICENSES.md.

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'fonts')

// A modern UA is required or Google serves ttf instead of woff2.
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

const SOURCES = [
  {
    out: 'general-sans-400.woff2',
    css: 'https://api.fontshare.com/v2/css?f[]=general-sans@400&display=swap',
    pick: (urls) => urls[0],
  },
  {
    out: 'general-sans-500.woff2',
    css: 'https://api.fontshare.com/v2/css?f[]=general-sans@500&display=swap',
    pick: (urls) => urls[0],
  },
  {
    out: 'general-sans-600.woff2',
    css: 'https://api.fontshare.com/v2/css?f[]=general-sans@600&display=swap',
    pick: (urls) => urls[0],
  },
  {
    out: 'source-serif-4-variable.woff2',
    css: 'https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,200..900&display=swap',
    pick: (urls) => urls[urls.length - 1], // latin subset is emitted last
  },
  {
    out: 'source-serif-4-italic.woff2',
    css: 'https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@1,8..60,200..900&display=swap',
    pick: (urls) => urls[urls.length - 1],
  },
  {
    out: 'jetbrains-mono-400.woff2',
    css: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400&display=swap',
    pick: (urls) => urls[urls.length - 1],
  },
]

async function get(url, asText) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`)
  return asText ? res.text() : Buffer.from(await res.arrayBuffer())
}

await mkdir(outDir, { recursive: true })

let failures = 0
for (const source of SOURCES) {
  try {
    const css = await get(source.css, true)
    // Google emits absolute URLs; Fontshare emits protocol-relative ones.
    const urls = [...css.matchAll(/url\(['"]?((?:https:)?\/\/[^)'"]+\.woff2)['"]?\)/g)].map((m) =>
      m[1].startsWith('//') ? `https:${m[1]}` : m[1],
    )
    if (urls.length === 0) throw new Error('no woff2 URL in the CSS response')

    const font = await get(source.pick(urls), false)
    await writeFile(join(outDir, source.out), font)
    console.log(`  ${source.out.padEnd(32)} ${(font.length / 1024).toFixed(1)} kB`)
  } catch (err) {
    failures++
    console.warn(`  ${source.out.padEnd(32)} FAILED: ${err.message}`)
  }
}

if (failures > 0) {
  console.warn(`\n  ${failures} font(s) missing. The extension falls back to system fonts for those.`)
}
