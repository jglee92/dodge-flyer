import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT, TEXT_RESOLUTION } from './constants.js'
import { t } from './i18n.js'

// 로켓/피싱/블록 게임의 localStorage 키와 겹치지 않는 이 게임만의 별도 키.
const CANDY_COINS_KEY = 'candy-coins'
const CANDY_BEST_KEY = 'candy-best-score'

const GRID_SIZE = 8
const CELL = 42
const BOARD_ORIGIN_X = (GAME_WIDTH - GRID_SIZE * CELL) / 2
const BOARD_ORIGIN_Y = 110
const MOVES_PER_ROUND = 20

// 이 게임 세계관 아이콘으로 타일을 채운다(캔디크러쉬 그림 대신 우리 그림). 배 게임이
// 생기면 이 배열에 'boat' 하나만 추가하면 된다.
const TILE_TYPES = ['rocket', 'fish', 'coin', 'shield', 'star']

export class CandyScene extends Phaser.Scene {
  constructor() {
    super('CandyScene')
  }

  create(data) {
    this.state = 'ready'
    this.totalCoins = Number(localStorage.getItem(CANDY_COINS_KEY) || 0)
    this.bestScore = Number(localStorage.getItem(CANDY_BEST_KEY) || 0)
    this.score = 0
    this.movesLeft = MOVES_PER_ROUND
    this.grid = []
    this.tileSprites = []
    this.selected = null
    this.selectHighlight = null
    this.locked = false

    this.cameras.main.setBackgroundColor('#1a1030')
    this.createUI()

    this.input.on('pointerdown', (pointer, currentlyOver) => {
      if (currentlyOver.some((obj) => obj.isUiButton)) return
      if (this.state === 'ready') this.startGame()
    })
    this.input.keyboard.on('keydown-SPACE', () => {
      if (this.state === 'ready') this.startGame()
    })

    if (data && data.autoStart) this.startGame()
  }

  createUI() {
    const textStyle = {
      fontFamily: 'system-ui, sans-serif',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      resolution: TEXT_RESOLUTION,
    }

    this.readyTitleText = this.add
      .text(GAME_WIDTH / 2, 60, t('candyReadyTitle'), { ...textStyle, fontSize: '26px' })
      .setOrigin(0.5)
    this.readyDescText = this.add
      .text(GAME_WIDTH / 2, 155, t('candyReadyDesc', { moves: MOVES_PER_ROUND, coins: this.totalCoins, best: this.bestScore }), {
        ...textStyle,
        fontSize: '14px',
        align: 'center',
        lineSpacing: 6,
        wordWrap: { width: GAME_WIDTH - 60 },
      })
      .setOrigin(0.5)
    this.readyCtaText = this.add
      .text(GAME_WIDTH / 2, 235, t('candyReadyCta'), { ...textStyle, fontSize: '18px' })
      .setOrigin(0.5)

    this.hubButtonBg = this.add
      .rectangle(40, 20, 72, 28, 0x1a1a2e, 0.85)
      .setStrokeStyle(2, 0xff8a4f)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (this.state !== 'ready') return
        this.scene.start('HubScene')
      })
    this.hubButtonBg.isUiButton = true
    this.hubButtonText = this.add.text(40, 20, t('hubButtonLabel'), { ...textStyle, fontSize: '12px' }).setOrigin(0.5)

    this.movesText = this.add
      .text(GAME_WIDTH / 2 - 70, 90, '', { ...textStyle, fontSize: '15px' })
      .setOrigin(0.5)
      .setVisible(false)
    this.scoreText = this.add
      .text(GAME_WIDTH / 2 + 70, 90, '', { ...textStyle, fontSize: '15px' })
      .setOrigin(0.5)
      .setVisible(false)

    this.roundOverTitleText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 70, '', { ...textStyle, fontSize: '18px', align: 'center' })
      .setOrigin(0.5)
      .setVisible(false)
    this.roundOverBestText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 38, '', { ...textStyle, fontSize: '15px' })
      .setOrigin(0.5)
      .setVisible(false)
    this.roundOverNewBestText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 12, t('candyNewBest'), { ...textStyle, fontSize: '15px', color: '#ffe066' })
      .setOrigin(0.5)
      .setVisible(false)
    this.roundOverCoinsText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 14, '', { ...textStyle, fontSize: '15px', color: '#8fe3ff' })
      .setOrigin(0.5)
      .setVisible(false)
    this.restartYesText = this.add
      .text(GAME_WIDTH / 2 - 45, GAME_HEIGHT / 2 + 80, t('restartYes'), { ...textStyle, fontSize: '18px' })
      .setOrigin(0.5)
      .setVisible(false)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.time.delayedCall(0, () => this.scene.restart({ autoStart: true })))
    this.restartYesText.isUiButton = true
    this.restartNoText = this.add
      .text(GAME_WIDTH / 2 + 45, GAME_HEIGHT / 2 + 80, t('restartNo'), { ...textStyle, fontSize: '18px' })
      .setOrigin(0.5)
      .setVisible(false)
      .setInteractive({ useHandCursor: true })
      // autoStart:false를 명시해야 한다 — 인자 없이 restart()를 부르면 이전
      // restart({autoStart:true}) 호출의 settings.data를 그대로 재사용해버린다.
      .on('pointerdown', () => this.time.delayedCall(0, () => this.scene.restart({ autoStart: false })))
    this.restartNoText.isUiButton = true
  }

  startGame() {
    if (this.state !== 'ready') return
    this.state = 'playing'
    this.score = 0
    this.movesLeft = MOVES_PER_ROUND
    this.selected = null
    this.locked = false

    this.readyTitleText.setVisible(false)
    this.readyDescText.setVisible(false)
    this.readyCtaText.setVisible(false)
    this.hubButtonBg.setVisible(false)
    this.hubButtonText.setVisible(false)

    this.movesText.setVisible(true)
    this.scoreText.setVisible(true)

    this.generateBoard()
    this.renderBoardFresh()
    this.updateHud()
  }

  // 생성 시점에 이미 3매치가 있는 배치가 나오지 않게 왼쪽/위쪽 두 칸을 검사하며 뽑는다.
  generateBoard() {
    this.grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0))
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        let type
        do {
          type = Phaser.Math.Between(0, TILE_TYPES.length - 1)
        } while (
          (c >= 2 && this.grid[r][c - 1] === type && this.grid[r][c - 2] === type) ||
          (r >= 2 && this.grid[r - 1][c] === type && this.grid[r - 2][c] === type)
        )
        this.grid[r][c] = type
      }
    }
  }

  renderBoardFresh() {
    this.tileSprites.forEach((row) =>
      row.forEach((sprite) => {
        if (!sprite) return
        this.tweens.killTweensOf(sprite)
        sprite.destroy()
      }),
    )
    this.tileSprites = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null))
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        this.tileSprites[r][c] = this.createTileSprite(r, c, this.grid[r][c])
      }
    }
  }

  createTileSprite(r, c, type) {
    const x = BOARD_ORIGIN_X + c * CELL + CELL / 2
    const y = BOARD_ORIGIN_Y + r * CELL + CELL / 2
    const key = this.ensureTileTexture(TILE_TYPES[type])
    const img = this.add.image(x, y, key).setInteractive({ useHandCursor: true })
    img.row = r
    img.col = c
    img.on('pointerdown', () => this.handleTileTap(img.row, img.col))
    return img
  }

  handleTileTap(r, c) {
    if (this.state !== 'playing' || this.locked) return
    if (!this.selected) {
      this.selected = { r, c }
      this.highlightSelected()
      return
    }
    if (this.selected.r === r && this.selected.c === c) {
      this.selected = null
      this.clearHighlight()
      return
    }
    const isAdjacent = Math.abs(this.selected.r - r) + Math.abs(this.selected.c - c) === 1
    if (!isAdjacent) {
      this.selected = { r, c }
      this.highlightSelected()
      return
    }
    const a = this.selected
    this.selected = null
    this.clearHighlight()
    this.attemptSwap(a, { r, c })
  }

  highlightSelected() {
    this.clearHighlight()
    const x = BOARD_ORIGIN_X + this.selected.c * CELL + CELL / 2
    const y = BOARD_ORIGIN_Y + this.selected.r * CELL + CELL / 2
    this.selectHighlight = this.add.rectangle(x, y, CELL - 4, CELL - 4).setStrokeStyle(3, 0xffe066, 1)
  }

  clearHighlight() {
    if (this.selectHighlight) {
      this.selectHighlight.destroy()
      this.selectHighlight = null
    }
  }

  attemptSwap(a, b) {
    this.locked = true
    const tmp = this.grid[a.r][a.c]
    this.grid[a.r][a.c] = this.grid[b.r][b.c]
    this.grid[b.r][b.c] = tmp

    const matches = this.findMatches()
    if (matches.size === 0) {
      this.grid[b.r][b.c] = this.grid[a.r][a.c]
      this.grid[a.r][a.c] = tmp
      this.bounceInvalidSwap(a, b)
      this.locked = false
      return
    }

    this.movesLeft -= 1
    this.refreshBoardVisuals()
    this.playSwapSound()
    this.resolveMatches()
  }

  bounceInvalidSwap(a, b) {
    ;[this.tileSprites[a.r][a.c], this.tileSprites[b.r][b.c]].forEach((sprite) => {
      this.tweens.add({ targets: sprite, scaleX: 1.15, scaleY: 1.15, duration: 90, yoyo: true })
    })
  }

  findMatches() {
    const matched = new Set()
    for (let r = 0; r < GRID_SIZE; r++) {
      let runStart = 0
      for (let c = 1; c <= GRID_SIZE; c++) {
        if (c < GRID_SIZE && this.grid[r][c] === this.grid[r][runStart]) continue
        if (c - runStart >= 3) {
          for (let k = runStart; k < c; k++) matched.add(`${r},${k}`)
        }
        runStart = c
      }
    }
    for (let c = 0; c < GRID_SIZE; c++) {
      let runStart = 0
      for (let r = 1; r <= GRID_SIZE; r++) {
        if (r < GRID_SIZE && this.grid[r][c] === this.grid[runStart][c]) continue
        if (r - runStart >= 3) {
          for (let k = runStart; k < r; k++) matched.add(`${k},${c}`)
        }
        runStart = r
      }
    }
    return matched
  }

  collapseColumns() {
    for (let c = 0; c < GRID_SIZE; c++) {
      const survivors = []
      for (let r = GRID_SIZE - 1; r >= 0; r--) {
        if (this.grid[r][c] !== -1) survivors.push(this.grid[r][c])
      }
      while (survivors.length < GRID_SIZE) survivors.push(Phaser.Math.Between(0, TILE_TYPES.length - 1))
      for (let r = GRID_SIZE - 1; r >= 0; r--) {
        this.grid[r][c] = survivors[GRID_SIZE - 1 - r]
      }
    }
  }

  resolveMatches() {
    this.locked = true
    let combo = 0
    let matches = this.findMatches()
    while (matches.size > 0) {
      combo += 1
      this.score += matches.size * 10 * combo
      matches.forEach((key) => {
        const [r, c] = key.split(',').map(Number)
        this.grid[r][c] = -1
      })
      this.collapseColumns()
      matches = this.findMatches()
    }
    if (combo > 0) this.playMatchSound()
    this.refreshBoardVisuals()
    this.updateHud()
    this.locked = false
    if (this.movesLeft <= 0) this.endRound()
  }

  // 매치/캐스케이드 전체 결과를 한 번에 계산한 뒤, 값이 바뀐 칸만 뒤집히듯 트윈하며
  // 새 텍스처로 바꾼다 — 조각별 낙하 애니메이션 대신 이 코드베이스의 다른 팝업들처럼
  // 가볍게 트윈 한 번으로 "즉시 뚝 바뀌지 않는다"는 느낌만 준다(1차 버전 단순화).
  refreshBoardVisuals() {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const sprite = this.tileSprites[r][c]
        const key = this.ensureTileTexture(TILE_TYPES[this.grid[r][c]])
        if (sprite.texture.key !== key) {
          this.tweens.add({
            targets: sprite,
            scaleX: 0,
            scaleY: 0,
            duration: 90,
            yoyo: true,
            onYoyo: () => {
              if (sprite.active) sprite.setTexture(key)
            },
          })
        }
      }
    }
  }

  updateHud() {
    this.movesText.setText(t('candyMovesLeft', { moves: this.movesLeft }))
    this.scoreText.setText(t('candyScoreLabel', { score: this.score }))
  }

  endRound() {
    this.state = 'roundOver'
    const isNewBest = this.score > this.bestScore
    if (isNewBest) {
      this.bestScore = this.score
      localStorage.setItem(CANDY_BEST_KEY, String(this.bestScore))
    }
    const coinsEarned = Math.floor(this.score / 20)
    this.totalCoins += coinsEarned
    localStorage.setItem(CANDY_COINS_KEY, String(this.totalCoins))

    this.movesText.setVisible(false)
    this.scoreText.setVisible(false)
    this.clearHighlight()
    this.tileSprites.forEach((row) =>
      row.forEach((sprite) => {
        if (!sprite) return
        this.tweens.killTweensOf(sprite)
        sprite.destroy()
      }),
    )
    this.tileSprites = []

    this.roundOverTitleText.setText(t('candyRoundOverTitle', { score: this.score })).setVisible(true)
    this.roundOverBestText.setText(t('candyRoundOverBest', { best: this.bestScore })).setVisible(true)
    this.roundOverNewBestText.setVisible(isNewBest)
    this.roundOverCoinsText.setText(t('candyCoinsEarned', { coins: coinsEarned })).setVisible(true)
    this.restartYesText.setVisible(true)
    this.restartNoText.setVisible(true)
  }

  starPoints(cx, cy, outerR, innerR, spikes) {
    const pts = []
    const step = Math.PI / spikes
    let rot = -Math.PI / 2
    for (let i = 0; i < spikes; i++) {
      pts.push({ x: cx + Math.cos(rot) * outerR, y: cy + Math.sin(rot) * outerR })
      rot += step
      pts.push({ x: cx + Math.cos(rot) * innerR, y: cy + Math.sin(rot) * innerR })
      rot += step
    }
    return pts
  }

  // 캔디크러쉬 그림 대신, 이 게임 세계관의 아이콘(로켓/물고기/코인/실드/별)을 로켓/피싱과
  // 같은 방식(Graphics로 그려서 텍스처로 굽고 캐시)으로 직접 그린다.
  ensureTileTexture(type) {
    const key = `candy-${type}`
    if (this.textures.exists(key)) return key
    const size = 40
    const cx = size / 2
    const cy = size / 2
    const g = this.add.graphics()

    if (type === 'rocket') {
      g.fillStyle(0xff8a4f, 1)
      g.fillTriangle(cx - 4, cy + 12, cx + 4, cy + 12, cx, cy + 19)
      g.fillStyle(0xd8d8e2, 1)
      g.fillEllipse(cx, cy, 13, 24)
      g.fillStyle(0xd23c3c, 1)
      g.fillTriangle(cx - 6, cy - 11, cx + 6, cy - 11, cx, cy - 19)
      g.fillStyle(0xb52e2e, 1)
      g.fillTriangle(cx - 6, cy + 6, cx - 12, cy + 13, cx - 6, cy + 11)
      g.fillTriangle(cx + 6, cy + 6, cx + 12, cy + 13, cx + 6, cy + 11)
      g.fillStyle(0x4fc3f7, 1)
      g.fillCircle(cx, cy - 3, 3)
    } else if (type === 'fish') {
      g.fillStyle(0xd4a017, 1)
      g.fillTriangle(cx - 13, cy, cx - 6, cy - 6, cx - 6, cy + 6)
      g.fillStyle(0xffe066, 1)
      g.fillEllipse(cx + 3, cy, 20, 13)
      g.fillStyle(0x0a0a0a, 1)
      g.fillCircle(cx + 9, cy - 2, 1.6)
    } else if (type === 'coin') {
      g.fillStyle(0xd4a017, 1)
      g.fillCircle(cx, cy, 16)
      g.fillStyle(0xffe066, 1)
      g.fillCircle(cx, cy, 12)
      g.fillStyle(0xffffff, 0.8)
      g.fillTriangle(cx - 3, cy - 8, cx, cy - 2, cx - 7, cy - 2)
    } else if (type === 'shield') {
      g.fillStyle(0x1b6ca8, 1)
      g.fillPoints(
        [
          { x: cx, y: cy - 16 },
          { x: cx + 12, y: cy - 10 },
          { x: cx + 12, y: cy + 2 },
          { x: cx, y: cy + 17 },
          { x: cx - 12, y: cy + 2 },
          { x: cx - 12, y: cy - 10 },
        ],
        true,
      )
      g.fillStyle(0x8fe3ff, 1)
      g.fillRect(cx - 2, cy - 9, 4, 16)
      g.fillRect(cx - 8, cy - 2, 16, 4)
    } else {
      g.fillStyle(0xffd700, 1)
      g.fillPoints(this.starPoints(cx, cy, 17, 7, 5), true)
    }

    g.generateTexture(key, size, size)
    g.destroy()
    return key
  }

  ensureAudio() {
    if (!this.audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext
      this.audioCtx = new AC()
    }
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume()
    return this.audioCtx
  }

  playSwapSound() {
    const ctx = this.ensureAudio()
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(400, now)
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.08)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.15, now + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.14)
  }

  playMatchSound() {
    const ctx = this.ensureAudio()
    const now = ctx.currentTime
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((freq, i) => {
      const start = now + i * 0.06
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, start)
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.15)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.16)
    })
  }
}
