#!/usr/bin/env node
// Builds the extension into dist/.
//
// Two separate Vite builds, because the content script must be a classic
// IIFE script while the popup is a normal HTML entry. Trying to do both in
// one Rollup pass produces a module bundle that MV3 refuses to run.

import { build } from 'vite'
import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const watch = process.argv.includes('--watch')

async function main() {
  await rm(dist, { recursive: true, force: true })
  await mkdir(dist, { recursive: true })

  await build({ configFile: join(root, 'vite.content.config.ts'), build: { watch: watch ? {} : null } })
  await build({ configFile: join(root, 'vite.popup.config.ts') })

  await cp(join(root, 'public'), dist, { recursive: true })

  if (existsSync(join(root, 'fonts'))) {
    await cp(join(root, 'fonts'), join(dist, 'fonts'), { recursive: true })
  } else {
    console.warn(
      '\n  fonts/ is empty. The extension will fall back to system fonts.\n' +
        '  Run `node scripts/fetch-fonts.mjs` to download them.\n',
    )
  }

  const files = await listFiles(dist)
  const total = (await Promise.all(files.map(async (f) => (await stat(f)).size))).reduce((a, b) => a + b, 0)
  console.log(`\n  dist/ built: ${files.length} files, ${(total / 1024).toFixed(1)} kB`)
  console.log('  Load it: chrome://extensions -> Developer mode -> Load unpacked -> dist/\n')
}

async function listFiles(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await listFiles(p)))
    else out.push(p)
  }
  return out
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
