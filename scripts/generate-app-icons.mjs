import sharp from 'sharp'
import { mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// 실제 게임 안에서 쓰는 drawRocketTexture()와 똑같은 도형(불꽃 2겹 삼각형, 타원 몸통,
// 위/아래 지느러미 삼각형, 원형 창문)을 그대로 재현한다 — 파비콘의 단순화된 모양 대신
// 진짜 인게임 로켓과 동일한 실루엣을 쓴다. flameLen=16으로 좌표가 0 밑으로 안 내려가게 맞춤.
const SKINS = {
  default: { body: '#d8d8e2', nose: '#d23c3c', fin: '#b52e2e', flameOuter: '#ffb347', flameInner: '#fff176' },
  diamond: { body: '#eaf6ff', nose: '#3a6fa8', fin: '#ffffff', flameOuter: '#bfe9ff', flameInner: '#ffffff' },
}

// 각 삼각형에 같은 색 stroke + linejoin="round"을 줘서 뾰족한 모서리를 살짝 둥글려준다
// (필오묘 없이 실루엣/비율은 실제 인게임 로켓과 동일하게 유지하면서 "너무 직선적"인
// 느낌만 완화 — 형태 자체를 바꾸면 실제 로켓이랑 이질적으로 보일 수 있어서 이 정도로 절충).
function rocketNative(skinKey) {
  const s = SKINS[skinKey]
  const round = (fill) => `fill="${fill}" stroke="${fill}" stroke-width="3.4" stroke-linejoin="round"`
  return `
    <polygon points="16,5 16,19 0,12" ${round(s.flameOuter)}/>
    <polygon points="16,9 16,15 7.2,12" ${round(s.flameInner)}/>
    <ellipse cx="30" cy="12" rx="15" ry="9" fill="${s.body}"/>
    <polygon points="42,4 42,20 54,12" ${round(s.nose)}/>
    <polygon points="18,2 28,10 12,10" ${round(s.fin)}/>
    <polygon points="18,22 28,14 12,14" ${round(s.fin)}/>
    <circle cx="28" cy="12" r="5" fill="#4fc3f7" stroke="#263238" stroke-width="1"/>
  `
}

const ROCKET_ANGLE = -73 // 표지 로고에서 쓰는 회전각(-90+0.3rad)과 통일

async function renderTrimmedRocket(skinKey, targetSize) {
  // 회전 후 바운딩 박스를 직접 계산하는 대신, 넉넉한 캔버스에 그려서 sharp.trim()으로
  // 실제 로켓 실루엣 경계만 잘라낸다 — 삼각함수 손계산 없이 항상 정확히 중앙에 맞출 수 있다.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-30 -30 116 84" width="600" height="440">
    <g transform="rotate(${ROCKET_ANGLE} 28 12)">${rocketNative(skinKey)}</g>
  </svg>`
  const raw = await sharp(Buffer.from(svg), { density: 384 }).png().toBuffer()
  const trimmed = await sharp(raw).trim({ threshold: 5 }).toBuffer()
  return sharp(trimmed).resize(targetSize, targetSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
}

const STARS = `
  <g fill="#ffe066">
    <path d="M14 12 l1.6 3.4 3.6.5 -2.6 2.6 0.6 3.7 -3.2 -1.8 -3.2 1.8 0.6 -3.7 -2.6 -2.6 3.6 -0.5 Z"/>
    <path d="M72 16 l1.1 2.3 2.4.3 -1.7 1.7 0.4 2.5 -2.2 -1.2 -2.2 1.2 0.4 -2.5 -1.7 -1.7 2.4 -0.3 Z"/>
    <path d="M74 68 l1 2.1 2.2.3 -1.6 1.6 0.4 2.3 -2 -1.1 -2 1.1 0.4 -2.3 -1.6 -1.6 2.2 -0.3 Z"/>
  </g>
`

// 인게임 스타필드처럼 작은 점을 흩뿌려서 배경 자체가 반짝이는 느낌을 준다.
const STARFIELD_DOTS = [
  [10, 20, 1.4, 0.9], [24, 8, 1, 0.6], [40, 14, 1.6, 0.8], [58, 6, 1.2, 0.7], [70, 10, 1, 0.5],
  [92, 18, 1.4, 0.8], [100, 30, 1, 0.6], [6, 45, 1.2, 0.7], [96, 50, 1.6, 0.9], [88, 80, 1, 0.6],
  [14, 70, 1.3, 0.7], [30, 92, 1, 0.6], [50, 100, 1.4, 0.8], [66, 96, 1, 0.5], [80, 100, 1.2, 0.7],
  [4, 90, 1.1, 0.6], [100, 90, 1, 0.5], [46, 50, 1, 0.4], [20, 40, 1.1, 0.5], [62, 60, 1, 0.4],
]

function starfieldDotsSvgTile(size) {
  const dots = STARFIELD_DOTS.map(([x, y, r, o]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff" opacity="${o}"/>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="${size}" height="${size}">${dots}</svg>`
}

// 점이 타원으로 늘어나지 않게, 정사각형으로 그린 다음 목표 비율에 맞게 이어붙여서(tile)
// 가운데 부분만 잘라 쓴다 — 원(circle)은 항상 원으로 남는다.
async function starfieldBackground(w, h) {
  const size = Math.max(w, h)
  const tile = await sharp(Buffer.from(starfieldDotsSvgTile(size))).png().toBuffer()
  const cols = Math.ceil(w / size)
  const rows = Math.ceil(h / size)
  const canvas = sharp({ create: { width: size * cols, height: size * rows, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  const composites = []
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      composites.push({ input: tile, left: cx * size, top: cy * size })
    }
  }
  const tiled = await canvas.composite(composites).png().toBuffer()
  return sharp(tiled).extract({ left: 0, top: 0, width: w, height: h }).png().toBuffer()
}

// 별 장식 뒤에 같은 모양을 흐릿하게 깔아서(글로우) 반짝이는 느낌을 더한다.
async function starsWithGlow(size) {
  const starsSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 84 84" width="${size}" height="${size}">${STARS}</svg>`
  const sharpStars = await sharp(Buffer.from(starsSvg)).png().toBuffer()
  const glow = await sharp(Buffer.from(starsSvg))
    .blur(Math.max(2, size * 0.035))
    .modulate({ brightness: 1.3 })
    .png()
    .toBuffer()
  const canvas = sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  return canvas.composite([{ input: glow }, { input: sharpStars }]).png().toBuffer()
}

function bgGradientDefs(id) {
  return `<radialGradient id="${id}" cx="32%" cy="26%" r="80%">
    <stop offset="0%" stop-color="#3d3d82"/>
    <stop offset="55%" stop-color="#15152e"/>
    <stop offset="100%" stop-color="#050818"/>
  </radialGradient>`
}

// 실행 후 이 폴더 안의 파일을 android/app/src/main/res 관련 폴더들에 직접 복사해 넣는다.
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'out')
mkdirSync(OUT, { recursive: true })

async function makeIconCanvas(skinKey, size, { rocketFrac, includeStars }) {
  const bg = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><defs>${bgGradientDefs('bg')}</defs><rect width="${size}" height="${size}" fill="url(#bg)"/></svg>`))
    .composite([{ input: await starfieldBackground(size, size) }])
    .png()
    .toBuffer()
  const rocketSize = Math.round(size * rocketFrac)
  const rocketBuf = await renderTrimmedRocket(skinKey, rocketSize)
  const composites = [{ input: rocketBuf, gravity: 'center' }]
  if (includeStars) {
    const starsBuf = await starsWithGlow(size)
    composites.unshift({ input: starsBuf, gravity: 'center' })
  }
  return sharp(bg).composite(composites).png().toBuffer()
}

async function makeTransparentForeground(skinKey, size) {
  // adaptive icon safe zone(66/108)에 맞춰 로켓을 조금 작게, 별도 포함
  const rocketSize = Math.round(size * 0.56)
  const rocketBuf = await renderTrimmedRocket(skinKey, rocketSize)
  const starsBuf = await starsWithGlow(size)
  const canvas = sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  return canvas.composite([{ input: starsBuf, gravity: 'center' }, { input: rocketBuf, gravity: 'center' }]).png().toBuffer()
}

const mode = process.argv[2] || 'preview'

async function preview() {
  const a = await makeIconCanvas('default', 512, { rocketFrac: 0.62, includeStars: true })
  const b = await makeIconCanvas('diamond', 512, { rocketFrac: 0.62, includeStars: true })
  await sharp(a).toFile(`${OUT}/preview2_default.png`)
  await sharp(b).toFile(`${OUT}/preview2_diamond.png`)
  console.log('PREVIEW_DONE')
}

async function full(skinKey) {
  const densities = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 }
  const legacyDensities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 }

  for (const [name, size] of Object.entries(densities)) {
    const bg = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><defs>${bgGradientDefs('bg')}</defs><rect width="${size}" height="${size}" fill="url(#bg)"/></svg>`)).png().toBuffer()
    await sharp(bg).toFile(`${OUT}/ic_launcher_background_${name}.png`)
    const fg = await makeTransparentForeground(skinKey, size)
    await sharp(fg).toFile(`${OUT}/ic_launcher_foreground_${name}.png`)
  }

  for (const [name, size] of Object.entries(legacyDensities)) {
    const full = await makeIconCanvas(skinKey, size, { rocketFrac: 0.74, includeStars: true })
    await sharp(full).toFile(`${OUT}/ic_launcher_${name}.png`)
    const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`)
    await sharp(full).composite([{ input: mask, blend: 'dest-in' }]).png().toFile(`${OUT}/ic_launcher_round_${name}.png`)
  }

  const store = await makeIconCanvas(skinKey, 512, { rocketFrac: 0.74, includeStars: true })
  await sharp(store).toFile(`${OUT}/playstore_icon_512.png`)

  const splashSizes = {
    'drawable-port-mdpi': [320, 480],
    'drawable-port-hdpi': [480, 800],
    'drawable-port-xhdpi': [720, 1280],
    'drawable-port-xxhdpi': [960, 1600],
    'drawable-port-xxxhdpi': [1280, 1920],
    'drawable-land-mdpi': [480, 320],
    'drawable-land-hdpi': [800, 480],
    'drawable-land-xhdpi': [1280, 720],
    'drawable-land-xxhdpi': [1600, 960],
    'drawable-land-xxxhdpi': [1920, 1280],
    drawable: [480, 320],
  }

  for (const [name, [w, h]] of Object.entries(splashSizes)) {
    const bgBuf = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs>${bgGradientDefs('bgSplash')}</defs><rect width="${w}" height="${h}" fill="url(#bgSplash)"/></svg>`))
      .composite([{ input: await starfieldBackground(w, h) }])
      .png()
      .toBuffer()
    const contentSize = Math.round(Math.min(w, h) * 0.5)
    const rocketBuf = await renderTrimmedRocket(skinKey, Math.round(contentSize * 0.85))
    const starsBuf = await starsWithGlow(contentSize)
    await sharp(bgBuf)
      .composite([
        { input: starsBuf, gravity: 'center' },
        { input: rocketBuf, gravity: 'center' },
      ])
      .png()
      .toFile(`${OUT}/splash_${name}.png`)
  }

  console.log('FULL_DONE')
}

if (mode === 'preview') {
  preview().catch((e) => {
    console.error(e)
    process.exit(1)
  })
} else {
  full(mode).catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
