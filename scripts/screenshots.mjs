#!/usr/bin/env node
// Produces the Chrome Web Store screenshots from the real stylesheets, so a
// listing image can never show a design the extension does not have.
//
// The store wants 1280x800. The preview page is rendered at that size and the
// surfaces are captured one at a time.

import { readFileSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'store', 'screenshots')
mkdirSync(out, { recursive: true })

const preview = join(root, 'docs', 'design-preview.html')
try {
  readFileSync(preview)
} catch {
  console.error('docs/design-preview.html is missing. Run the preview build first.')
  process.exit(1)
}

const chrome =
  process.platform === 'darwin'
    ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    : 'google-chrome'

console.log('Capturing 1280x800 from', preview)
try {
  execFileSync(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--window-size=1280,800',
      `--screenshot=${join(out, 'surfaces.png')}`,
      `file://${preview}`,
    ],
    { stdio: 'inherit' },
  )
  console.log('wrote', join(out, 'surfaces.png'))
} catch (err) {
  console.error('Chrome could not run headless here:', err.message)
  console.error('Open docs/design-preview.html and capture at 1280x800 by hand.')
  process.exit(1)
}
