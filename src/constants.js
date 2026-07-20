export const GAME_WIDTH = 400
export const GAME_HEIGHT = 600

// Phaser Text는 게임 전체의 resolution 설정을 자동으로 물려받지 않고, 스타일에 직접
// resolution을 안 주면 항상 1배로 그려진다 — 그래서 canvas 자체는 고해상도로 렌더링되는데도
// 글자만 유독 흐릿해 보였다. 모든 텍스트 스타일에 이 값을 넣어서 폰 고밀도 화면에서도 선명하게 한다.
// (참고: 이 값은 각 Text 객체 내부 텍스처의 안티에일리어싱 품질만 높여준다 — 캔버스 자체가
// CSS로 얼마나 확대되는지는 별도 문제이고, 그건 style.css의 #app max-width/max-height로 막는다.)
export const TEXT_RESOLUTION = Math.min(Math.max(window.devicePixelRatio || 1, 2), 3)
