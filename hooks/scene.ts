// Pure pixel drawing: no `$` here, so it is testable and cheap to call per tick.
import { FRAMES, FRAMES24, PALETTE, SPRITE_H, SPRITE_W } from './sprites'
import type { FrameName } from './sprites'
import type { RickyMood } from '../types'

const DEFAULT = 0x01000000 // the terminal's own colour
const HALF_UPPER = 0x2580 // ▀
const HALF_LOWER = 0x2584 // ▄

// palette chars -> colours, once
const DECODED = {} as Record<FrameName, (number | null)[][]>
for (const name of Object.keys(FRAMES) as FrameName[]) {
  DECODED[name] = FRAMES[name].map(row => [...row].map(ch => PALETTE[ch] ?? null))
}
// the band's smaller 24x24 Ricky, same frame names
const BAND_SIZE = 24
const DECODED24 = {} as Record<FrameName, (number | null)[][]>
for (const name of Object.keys(FRAMES24) as FrameName[]) {
  DECODED24[name] = FRAMES24[name].map(row => [...row].map(ch => PALETTE[ch] ?? null))
}

export const BAND_ROWS = 12
const GOLD = 0xf5c542
const STAR_COLORS = [0xffe89a, 0xf4f0ff, 0xb79bff]

/** Which sprite frame a mood shows on a tick. */
export function frameFor(mood: RickyMood, tick: number): FrameName {
  switch (mood) {
    case 'think':
      return Math.floor(tick / 3) % 2 === 0 ? 'think' : 'think2'
    case 'fly':
      return tick % 2 === 0 ? 'idle' : 'idle2'
    case 'happy':
      return Math.floor(tick / 2) % 2 === 0 ? 'happy' : 'happy2'
    case 'shock':
      return 'shock'
    default:
      if (tick % 30 === 0) return 'blink'
      return Math.floor(tick / 4) % 2 === 0 ? 'idle' : 'idle2'
  }
}

/** A pixel canvas, `null` meaning see-through. */
type Canvas = { w: number; h: number; px: (number | null)[] }

function canvas(w: number, h: number, fill: number | null): Canvas {
  return { w, h, px: new Array(w * h).fill(fill) }
}

function put(c: Canvas, x: number, y: number, color: number | null | undefined) {
  if (color == null || x < 0 || y < 0 || x >= c.w || y >= c.h) return
  c.px[y * c.w + x] = color
}

function stamp(c: Canvas, img: (number | null)[][], x0: number, y0: number) {
  img.forEach((row, y) => row.forEach((color, x) => put(c, x0 + x, y0 + y, color)))
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/** Standard padded base64; the environment's own may be missing. */
export function base64(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0
    const b = bytes[i + 1] ?? 0
    const c = bytes[i + 2] ?? 0
    const n = (a << 16) | (b << 8) | c
    out += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]!
    out += i + 1 < bytes.length ? B64[(n >> 6) & 63]! : '='
    out += i + 2 < bytes.length ? B64[n & 63]! : '='
  }
  return out
}

/** Pack a canvas into Raster cells: two pixels per cell, upper over lower. */
export function toCells(c: Canvas): string {
  const rows = Math.ceil(c.h / 2)
  const words = new Uint32Array(c.w * rows * 3)
  let i = 0
  for (let r = 0; r < rows; r++) {
    for (let x = 0; x < c.w; x++) {
      const top = c.px[2 * r * c.w + x] ?? null
      const bottom = 2 * r + 1 < c.h ? (c.px[(2 * r + 1) * c.w + x] ?? null) : null
      if (top === null && bottom === null) {
        words.set([0x20, DEFAULT, DEFAULT], i)
      } else if (top === null) {
        words.set([HALF_LOWER, bottom as number, DEFAULT], i)
      } else {
        words.set([HALF_UPPER, top, bottom ?? DEFAULT], i)
      }
      i += 3
    }
  }
  return base64(new Uint8Array(words.buffer))
}

// deterministic stars per size
function stars(w: number, h: number) {
  let seed = w * 7919 + h * 104729
  const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
  const n = Math.max(6, Math.floor((w * h) / 45))
  return Array.from({ length: n }, () => ({
    x: Math.floor(rand() * w),
    y: Math.floor(rand() * h),
    color: STAR_COLORS[Math.floor(rand() * STAR_COLORS.length)] ?? GOLD,
    phase: Math.floor(rand() * 12),
  }))
}

/** The pane's night sky with Ricky in the middle, `cols` wide, `rows` cells tall. */
export function paneScene(cols: number, rows: number, mood: RickyMood, tick: number): string {
  const w = cols
  const h = rows * 2
  const c = canvas(w, h, 0)
  // gradient sky
  for (let y = 0; y < h; y++) {
    const t = y / Math.max(1, h - 1)
    const r = Math.round(0x0d + (0x2a - 0x0d) * t)
    const g = Math.round(0x06 + (0x12 - 0x06) * t)
    const b = Math.round(0x20 + (0x55 - 0x20) * t)
    for (let x = 0; x < w; x++) c.px[y * w + x] = (r << 16) | (g << 8) | b
  }
  // twinkling stars
  for (const s of stars(w, h)) {
    if ((tick + s.phase) % 12 < 9) put(c, s.x, s.y, s.color)
    if ((tick + s.phase) % 12 === 0) {
      put(c, s.x - 1, s.y, s.color)
      put(c, s.x + 1, s.y, s.color)
    }
  }
  // crescent moon, top right
  const mx = w - 7
  const MOON: [number, number][] = [[1, 0], [2, 0], [0, 1], [0, 2], [0, 3], [1, 4], [2, 4], [1, 1], [1, 3]]
  for (const [dx, dy] of MOON) {
    put(c, mx + dx, 2 + dy, dx === 0 ? GOLD : 0xffe89a)
  }
  // Ricky
  const bob = mood === 'fly' ? Math.round(Math.sin(tick / 1.5) * 2) : Math.round(Math.sin(tick / 4) * 1)
  const jitter = mood === 'shock' ? (tick % 2 === 0 ? -1 : 1) : 0
  const x0 = Math.floor((w - SPRITE_W) / 2) + jitter
  const y0 = Math.floor((h - SPRITE_H) / 2) + bob + 1
  if (mood === 'fly') {
    // sparkle trail under the wings
    for (let k = 0; k < 4; k++) {
      const sy = y0 + SPRITE_H - 2 + ((tick + k) % 4)
      put(c, x0 + 3 + k * 2, sy, k % 2 ? GOLD : 0xb8f4ff)
      put(c, x0 + SPRITE_W - 4 - k * 2, sy, k % 2 ? 0xb8f4ff : GOLD)
    }
  }
  stamp(c, DECODED[frameFor(mood, tick)], x0, y0)
  return toCells(c)
}

/** The band: a see-through ribbon `cols` wide with the 24px Ricky; she flies across while working. */
export function bandScene(cols: number, mood: RickyMood, tick: number): string {
  const w = cols
  const h = BAND_ROWS * 2
  const c = canvas(w, h, null)
  const span = Math.max(0, w - BAND_SIZE - 2)
  let x = 1
  if ((mood === 'fly' || mood === 'think') && span > 0) {
    const p = tick % (span * 2)
    const forward = p < span
    x = 1 + (forward ? p : span * 2 - p) // fly back and forth
    const tail = forward ? x - 2 : x + BAND_SIZE + 1
    const behind = forward ? -1 : 1
    for (let k = 0; k < 8; k++) {
      // a trail of sparkles behind her
      if ((tick + k) % 3 === 0) continue
      put(c, tail + behind * k * 2, 10 + ((k * 5 + tick) % 10), k % 2 ? GOLD : 0xb79bff)
    }
  } else if (mood === 'shock') {
    x = 1 + (tick % 2)
  }
  stamp(c, DECODED24[frameFor(mood, tick)], x, 0)
  return toCells(c)
}
