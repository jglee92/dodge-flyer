import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT, TEXT_RESOLUTION } from './constants.js'
import { t, toggleLang } from './i18n.js'

// key: null인 항목은 아직 만들지 않은 미니게임의 "준비중" 자리표시자 카드다.
const HUB_GAMES = [
  { key: 'RocketScene', titleKey: 'hubGameRocketTitle', descKey: 'hubGameRocketDesc', enabled: true },
  { key: 'FishingScene', titleKey: 'hubGameFishingTitle', descKey: 'hubGameFishingDesc', enabled: true },
  { key: 'CandyScene', titleKey: 'hubGameCandyTitle', descKey: 'hubGameCandyDesc', enabled: true },
  { key: 'BlockScene', titleKey: 'hubGameBlockTitle', descKey: 'hubGameBlockDesc', enabled: true },
]

export class HubScene extends Phaser.Scene {
  constructor() {
    super('HubScene')
  }

  create() {
    this.cameras.main.setBackgroundColor('#050818')

    const textStyle = {
      fontFamily: 'system-ui, sans-serif',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      resolution: TEXT_RESOLUTION,
    }

    this.add.text(GAME_WIDTH / 2, 60, t('hubTitle'), { ...textStyle, fontSize: '26px' }).setOrigin(0.5)
    this.add
      .text(GAME_WIDTH / 2, 92, t('hubSubtitle'), { ...textStyle, fontSize: '13px', color: '#9a9ab0' })
      .setOrigin(0.5)

    // 언어 토글 (다른 씬과 같은 스타일/위치). 여긴 restart()가 이 씬 자체를 새로 그리는 것뿐이라
    // 로켓 씬의 restart-지연 패턴과 달리 별도 delayedCall 없이 바로 restart해도 안전하다.
    const langButtonBg = this.add
      .rectangle(GAME_WIDTH - 40, 20, 72, 28, 0x1a1a2e, 0.85)
      .setStrokeStyle(2, 0x8fe3ff)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        toggleLang()
        this.scene.restart()
      })
    this.add.text(GAME_WIDTH - 40, 20, t('langToggleLabel'), { ...textStyle, fontSize: '12px' }).setOrigin(0.5)

    // 게임이 4개로 늘어나서 카드 하나당 높이/간격을 줄여 400x600 화면 안에 다 들어가게 한다.
    let cursorY = 128
    const cardW = GAME_WIDTH - 60
    const cardH = 80
    const cardGap = 12

    HUB_GAMES.forEach((game) => {
      const centerY = cursorY + cardH / 2
      const bg = this.add
        .rectangle(GAME_WIDTH / 2, centerY, cardW, cardH, 0x1a1a2e, game.enabled ? 0.9 : 0.5)
        .setStrokeStyle(2, game.enabled ? 0x4fc3f7 : 0x555566)
      this.add
        .text(GAME_WIDTH / 2, cursorY + 26, t(game.titleKey), {
          ...textStyle,
          fontSize: '18px',
          color: game.enabled ? '#ffffff' : '#888899',
        })
        .setOrigin(0.5)
      this.add
        .text(GAME_WIDTH / 2, cursorY + 54, t(game.descKey), {
          ...textStyle,
          fontSize: '12px',
          color: '#c8c8da',
          align: 'center',
          wordWrap: { width: cardW - 24 },
        })
        .setOrigin(0.5)

      if (game.enabled) {
        bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.start(game.key))
      }

      cursorY += cardH + cardGap
    })
  }
}
