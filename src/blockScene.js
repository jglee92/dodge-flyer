import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT, TEXT_RESOLUTION } from './constants.js'
import { t } from './i18n.js'

// 로켓/피싱 게임의 localStorage 키와 겹치지 않는 이 게임만의 별도 키.
const BLOCK_COINS_KEY = 'block-coins'
const BLOCK_BEST_KEY = 'block-best-score'

const GRID_SIZE = 8
const CELL = 42
const BOARD_ORIGIN_X = (GAME_WIDTH - GRID_SIZE * CELL) / 2
const BOARD_ORIGIN_Y = 120
const DRAG_LIFT = 60 // 드래그 중 손가락 위로 이만큼 띄워서 블록이 손에 가려지지 않게 한다
const TRAY_SLOTS = [
  { x: 80, y: 530 },
  { x: 200, y: 530 },
  { x: 320, y: 530 },
]
const TRAY_SCALE = 0.36

const PALETTE = [0xff6b4a, 0x4fc3f7, 0xffe066, 0x8fd3ff, 0xb388ff, 0x69f0ae, 0xff8a80, 0xffab40]

// 폴리오미노 오프셋 목록. 전부 (0,0)을 기준(최소 x/y)으로 정규화되어 있다.
const SHAPES = [
  [[0, 0]],
  [[0, 0], [1, 0]],
  [[0, 0], [0, 1]],
  [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [0, 1], [0, 2]],
  [[0, 0], [1, 0], [2, 0], [3, 0]],
  [[0, 0], [0, 1], [0, 2], [0, 3]],
  [[0, 0], [1, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [0, 1]],
  [[0, 0], [1, 0], [2, 0], [2, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 2]],
  [[0, 0], [0, 1], [0, 2], [1, 0]],
  [[0, 0], [1, 0], [1, 1], [2, 1]],
  [[1, 0], [2, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [1, 1]],
  [[1, 0], [0, 1], [1, 1], [2, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 1]],
  [[1, 0], [0, 1], [1, 1], [1, 2]],
  [[0, 0], [1, 0], [0, 1], [1, 1], [2, 0], [2, 1]],
  [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]],
]

export class BlockScene extends Phaser.Scene {
  constructor() {
    super('BlockScene')
  }

  create(data) {
    this.state = 'ready'
    this.totalCoins = Number(localStorage.getItem(BLOCK_COINS_KEY) || 0)
    this.bestScore = Number(localStorage.getItem(BLOCK_BEST_KEY) || 0)
    this.score = 0
    this.grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0))
    this.boardRects = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null))
    this.tray = [null, null, null]
    this.ghostRects = []
    this.draggingContainer = null

    this.cameras.main.setBackgroundColor('#050818')
    this.createUI()

    this.input.on('pointerdown', (pointer, currentlyOver) => {
      if (currentlyOver.some((obj) => obj.isUiButton)) return
      if (this.state === 'ready') this.startGame()
    })
    this.input.on('pointermove', (pointer) => this.handleDragMove(pointer))
    this.input.on('pointerup', () => this.handleDragEnd())
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
      .text(GAME_WIDTH / 2, 60, t('blockReadyTitle'), { ...textStyle, fontSize: '26px' })
      .setOrigin(0.5)
    this.readyDescText = this.add
      .text(GAME_WIDTH / 2, 150, t('blockReadyDesc', { coins: this.totalCoins, best: this.bestScore }), {
        ...textStyle,
        fontSize: '14px',
        align: 'center',
        lineSpacing: 6,
        wordWrap: { width: GAME_WIDTH - 60 },
      })
      .setOrigin(0.5)
    this.readyCtaText = this.add
      .text(GAME_WIDTH / 2, 220, t('blockReadyCta'), { ...textStyle, fontSize: '18px' })
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

    this.scoreText = this.add
      .text(GAME_WIDTH / 2, 95, '', { ...textStyle, fontSize: '18px' })
      .setOrigin(0.5)
      .setVisible(false)

    this.gridOutline = this.add.graphics().setVisible(false)
    this.gridOutline.lineStyle(1, 0x3a3a5a, 0.8)
    for (let i = 0; i <= GRID_SIZE; i++) {
      this.gridOutline.lineBetween(BOARD_ORIGIN_X, BOARD_ORIGIN_Y + i * CELL, BOARD_ORIGIN_X + GRID_SIZE * CELL, BOARD_ORIGIN_Y + i * CELL)
      this.gridOutline.lineBetween(BOARD_ORIGIN_X + i * CELL, BOARD_ORIGIN_Y, BOARD_ORIGIN_X + i * CELL, BOARD_ORIGIN_Y + GRID_SIZE * CELL)
    }

    this.gameOverTitleText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 70, '', { ...textStyle, fontSize: '18px', align: 'center' })
      .setOrigin(0.5)
      .setVisible(false)
    this.gameOverBestText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 38, '', { ...textStyle, fontSize: '15px' })
      .setOrigin(0.5)
      .setVisible(false)
    this.gameOverNewBestText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 12, t('blockNewBest'), { ...textStyle, fontSize: '15px', color: '#ffe066' })
      .setOrigin(0.5)
      .setVisible(false)
    this.gameOverCoinsText = this.add
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
    this.grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0))
    this.boardRects = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null))
    this.score = 0
    this.tray = [null, null, null]

    this.readyTitleText.setVisible(false)
    this.readyDescText.setVisible(false)
    this.readyCtaText.setVisible(false)
    this.hubButtonBg.setVisible(false)
    this.hubButtonText.setVisible(false)

    this.gridOutline.setVisible(true)
    this.scoreText.setText(t('blockScoreLabel', { score: 0 })).setVisible(true)

    this.fillTray()
  }

  buildShapeContainer(shapeDef, color) {
    const container = this.add.container(0, 0)
    const xs = shapeDef.map(([dx]) => dx)
    const ys = shapeDef.map(([, dy]) => dy)
    const maxX = Math.max(...xs)
    const maxY = Math.max(...ys)
    shapeDef.forEach(([dx, dy]) => {
      const rect = this.add.rectangle(dx * CELL, dy * CELL, CELL - 3, CELL - 3, color, 1).setStrokeStyle(1, 0xffffff, 0.5)
      container.add(rect)
    })
    container.shapeDef = shapeDef
    container.shapeColor = color
    container.maxX = maxX
    container.maxY = maxY
    const hitArea = new Phaser.Geom.Rectangle(-CELL / 2, -CELL / 2, (maxX + 1) * CELL, (maxY + 1) * CELL)
    container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains)
    container.on('pointerdown', () => this.startDrag(container))
    return container
  }

  fillTray() {
    TRAY_SLOTS.forEach((slot, i) => {
      const shapeDef = Phaser.Utils.Array.GetRandom(SHAPES)
      const color = Phaser.Utils.Array.GetRandom(PALETTE)
      const container = this.buildShapeContainer(shapeDef, color)
      container.setScale(TRAY_SCALE)
      container.trayX = slot.x - (container.maxX * CELL * TRAY_SCALE) / 2
      container.trayY = slot.y - (container.maxY * CELL * TRAY_SCALE) / 2
      container.trayScale = TRAY_SCALE
      container.traySlotIndex = i
      container.setPosition(container.trayX, container.trayY)
      this.tray[i] = container
    })
  }

  startDrag(container) {
    if (this.state !== 'playing' || this.draggingContainer) return
    this.draggingContainer = container
    container.setScale(1)
    container.setDepth(1000)
    // 살짝 반투명하게 해서 그 아래 배치 가능/불가능 하이라이트(초록/빨강)가 비쳐 보이게 한다 —
    // 안 그러면 드래그 중인 조각이 하이라이트를 완전히 가려서 배치 가능 여부를 놓기 전까지 알 수 없었다.
    container.setAlpha(0.82)
  }

  handleDragMove(pointer) {
    if (!this.draggingContainer || this.state !== 'playing') return
    const dc = this.draggingContainer
    const liftY = pointer.y - DRAG_LIFT
    dc.setPosition(pointer.x, liftY)

    const col0 = Math.round((pointer.x - BOARD_ORIGIN_X - CELL / 2) / CELL)
    const row0 = Math.round((liftY - BOARD_ORIGIN_Y - CELL / 2) / CELL)
    const cells = dc.shapeDef.map(([dx, dy]) => [col0 + dx, row0 + dy])
    const valid = cells.every(([c, r]) => c >= 0 && c < GRID_SIZE && r >= 0 && r < GRID_SIZE && this.grid[r][c] === 0)
    this.updateGhostHighlight(cells, valid)
    dc.pendingCells = valid ? cells : null
  }

  handleDragEnd() {
    if (!this.draggingContainer) return
    const dc = this.draggingContainer
    dc.setAlpha(1)
    this.clearGhostHighlight()
    if (dc.pendingCells) {
      this.commitPlacement(dc, dc.pendingCells)
    } else {
      this.tweens.add({ targets: dc, x: dc.trayX, y: dc.trayY, scaleX: dc.trayScale, scaleY: dc.trayScale, duration: 150 })
    }
    this.draggingContainer = null
  }

  updateGhostHighlight(cells, valid) {
    this.ghostRects.forEach((r) => r.destroy())
    this.ghostRects = cells
      .filter(([c, r]) => c >= 0 && c < GRID_SIZE && r >= 0 && r < GRID_SIZE)
      .map(([c, r]) =>
        this.add.rectangle(
          BOARD_ORIGIN_X + c * CELL + CELL / 2,
          BOARD_ORIGIN_Y + r * CELL + CELL / 2,
          CELL - 4,
          CELL - 4,
          valid ? 0x69f0ae : 0xff6b4a,
          0.5,
        ),
      )
  }

  clearGhostHighlight() {
    this.ghostRects.forEach((r) => r.destroy())
    this.ghostRects = []
  }

  commitPlacement(container, cells) {
    cells.forEach(([c, r]) => {
      this.grid[r][c] = container.shapeColor
      const rect = this.add
        .rectangle(BOARD_ORIGIN_X + c * CELL + CELL / 2, BOARD_ORIGIN_Y + r * CELL + CELL / 2, CELL - 3, CELL - 3, container.shapeColor, 1)
        .setStrokeStyle(1, 0xffffff, 0.5)
      this.boardRects[r][c] = rect
    })
    this.score += cells.length * 10
    this.tray[container.traySlotIndex] = null
    container.destroy()
    this.playPlaceSound()
    this.checkLineClears()
    this.scoreText.setText(t('blockScoreLabel', { score: this.score }))

    if (this.tray.every((s) => s === null)) this.fillTray()
    if (!this.canPlaceAnyShape()) this.endGame()
  }

  checkLineClears() {
    const fullRows = []
    const fullCols = []
    for (let r = 0; r < GRID_SIZE; r++) if (this.grid[r].every((c) => c !== 0)) fullRows.push(r)
    for (let c = 0; c < GRID_SIZE; c++) if (this.grid.every((row) => row[c] !== 0)) fullCols.push(c)
    const totalLines = fullRows.length + fullCols.length
    if (totalLines === 0) return

    const clearedCells = new Set()
    fullRows.forEach((r) => {
      for (let c = 0; c < GRID_SIZE; c++) clearedCells.add(`${r},${c}`)
    })
    fullCols.forEach((c) => {
      for (let r = 0; r < GRID_SIZE; r++) clearedCells.add(`${r},${c}`)
    })
    clearedCells.forEach((key) => {
      const [r, c] = key.split(',').map(Number)
      this.grid[r][c] = 0
      if (this.boardRects[r][c]) {
        this.boardRects[r][c].destroy()
        this.boardRects[r][c] = null
      }
    })

    const bonus = 100 * totalLines * totalLines
    this.score += bonus
    this.playClearSound()
    this.showFloatPopup(GAME_WIDTH / 2, BOARD_ORIGIN_Y - 10, `+${bonus}`, '#ffe066')
  }

  canPlaceAnyShape() {
    return this.tray.some((slot) => {
      if (!slot) return false
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const fits = slot.shapeDef.every(([dx, dy]) => {
            const cc = c + dx
            const rr = r + dy
            return cc >= 0 && cc < GRID_SIZE && rr >= 0 && rr < GRID_SIZE && this.grid[rr][cc] === 0
          })
          if (fits) return true
        }
      }
      return false
    })
  }

  endGame() {
    this.state = 'gameover'
    const coinsEarned = Math.floor(this.score / 10)
    this.totalCoins += coinsEarned
    localStorage.setItem(BLOCK_COINS_KEY, String(this.totalCoins))
    const isNewBest = this.score > this.bestScore
    if (isNewBest) {
      this.bestScore = this.score
      localStorage.setItem(BLOCK_BEST_KEY, String(this.bestScore))
    }

    this.gridOutline.setVisible(false)
    this.scoreText.setVisible(false)
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (this.boardRects[r][c]) {
          this.boardRects[r][c].destroy()
          this.boardRects[r][c] = null
        }
      }
    }
    this.tray.forEach((container) => {
      if (container) container.destroy()
    })
    this.tray = [null, null, null]

    this.gameOverTitleText.setText(t('blockGameOverTitle', { score: this.score })).setVisible(true)
    this.gameOverBestText.setText(t('blockGameOverBest', { best: this.bestScore })).setVisible(true)
    this.gameOverNewBestText.setVisible(isNewBest)
    this.gameOverCoinsText.setText(t('blockCoinsEarned', { coins: coinsEarned })).setVisible(true)
    this.restartYesText.setVisible(true)
    this.restartNoText.setVisible(true)
  }

  showFloatPopup(x, y, text, color = '#ffe066') {
    const popup = this.add
      .text(x, y, text, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color,
        stroke: '#000000',
        strokeThickness: 3,
        resolution: TEXT_RESOLUTION,
      })
      .setOrigin(0.5)
    this.tweens.add({
      targets: popup,
      y: y - 30,
      alpha: 0,
      duration: 700,
      ease: 'Cubic.easeOut',
      onComplete: () => popup.destroy(),
    })
  }

  ensureAudio() {
    if (!this.audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext
      this.audioCtx = new AC()
    }
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume()
    return this.audioCtx
  }

  playPlaceSound() {
    const ctx = this.ensureAudio()
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(300, now)
    osc.frequency.exponentialRampToValueAtTime(500, now + 0.06)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.15, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.12)
  }

  playClearSound() {
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
