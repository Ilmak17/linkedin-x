#!/usr/bin/env node
// Draws the extension icons: an amber cross on a near-black rounded square.
//
// Written by hand rather than pulled from a design file so the mark stays in
// version control as code. No dependencies: PNG is a container around a zlib
// stream, and we only need one colour type.

import { deflateSync } from 'node:zlib'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'icons')

const BG = [0x0e, 0x0e, 0x10]
const ACCENT = [0xe8, 0xa3, 0x3d]
const SIZES = [16, 48, 128]

function draw(size) {
  const px = new Uint8Array(size * size * 4)
  const radius = size * 0.22
  const inset = size * 0.26
  const stroke = size * 0.115

  const a = [inset, inset]
  const b = [size - inset, size - inset]
  const c = [size - inset, inset]
  const d = [inset, size - inset]

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = x + 0.5
      const cy = y + 0.5
      const i = (y * size + x) * 4

      const inside = roundedRectCoverage(cx, cy, size, radius)
      if (inside <= 0) continue

      const dist = Math.min(distToSegment(cx, cy, a, b), distToSegment(cx, cy, c, d))
      const onStroke = clamp01(stroke / 2 + 0.5 - dist)

      const r = mix(BG[0], ACCENT[0], onStroke)
      const g = mix(BG[1], ACCENT[1], onStroke)
      const bl = mix(BG[2], ACCENT[2], onStroke)

      px[i] = r
      px[i + 1] = g
      px[i + 2] = bl
      px[i + 3] = Math.round(inside * 255)
    }
  }
  return px
}

const clamp01 = (v) => Math.max(0, Math.min(1, v))
const mix = (from, to, t) => Math.round(from + (to - from) * t)

function distToSegment(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax
  const dy = by - ay
  const t = clamp01(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

/** Antialiased coverage of a rounded square filling the canvas. */
function roundedRectCoverage(x, y, size, r) {
  const qx = Math.abs(x - size / 2) - (size / 2 - r)
  const qy = Math.abs(y - size / 2) - (size / 2 - r)
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
  return clamp01(0.5 - outside)
}

// --- PNG encoding --------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = -1
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // truecolour with alpha
  // 10..12 stay zero: deflate, adaptive filtering, no interlace

  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0 // filter: none
    Buffer.from(rgba.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

await mkdir(outDir, { recursive: true })
for (const size of SIZES) {
  const file = join(outDir, `icon-${size}.png`)
  await writeFile(file, encodePng(size, draw(size)))
  console.log(`  wrote ${file}`)
}
