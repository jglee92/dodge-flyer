// 공개 랭킹에 그대로 노출되는 닉네임이라, 심한 욕설/비속어는 걸러낸다.
// (앱스토어 심사에서도 사용자 생성 텍스트에 대한 최소한의 필터링을 기대한다.)
// 목록을 평문으로 그대로 두면 소스만 봐도 불쾌한 단어 나열이 되니 base64로 인코딩해둔다 —
// 이건 난독화일 뿐 보안 목적이 아니라서, 완벽하게 우회를 막지는 못한다(캐주얼 게임 수준의
// 상식적인 필터링이 목표).
const BANNED_B64 = [
  '7JSo67Cc',
  '7JSo7YyU',
  '7Iuc67Cc',
  '7Iuc7YyU',
  '6rCc7IOI64G8',
  '6rCc7IOI6riw',
  '67OR7Iug',
  '67iF7Iug',
  '7KKG',
  '7KKD',
  '7KeA656E',
  '66+47Lmc64aI',
  '66+47Lmc64WE',
  '6rG466CI',
  '7JS5',
  '7KG064KY',
  '7KG064uI',
  '7LC964WA',
  '7IOI64G8',
  '7J6Q7KeA',
  '67O07KeA',
  '7IqI67Cc',
  '44WF44WC',
  '44WE',
  '7KGw7IS87KeV',
  '7Kex6rmo',
  '7Kex6rCc',
  '44WC44WF',
  '44WI44S0',
  '44WG44WC',
  '44Sy44WI',
  '7I2F',
  '7IyN64aI',
  '7IyN64WE',
  '7J6h64WE',
  '7J6h64aI',
  '7ZuE66CI7J6Q7Iud',
  '7ZuE66CI7IOI64G8',
  '64uI7JWg66+4',
  '64uI7JWg67mE',
  '64qQ6riI66eI',
  '64qQ6re47JWE67aA7KeA',
  '65Kk7KC46528',
  '65KI7KC4',
  '7Kq967CU66as',
  '7Jmc64aI',
  '7Kex6ry06528',
  '7Z2R7ZiV',
  '7YuA65Sx',
  '6riJ7Iud7Lap',
  '66eY7Lap',
  '7ZWc64Ko',
  '7ZWc64WA',
  '66mU6rCI',
  '7J2867Kg',
  '7Iut7IOI',
  '7Iut7YOx',
  '7JS57IOI64G8',
  '7JS57LmY64WA',
  'ZnVjaw==',
  'c2hpdA==',
  'Yml0Y2g=',
  'YXNzaG9sZQ==',
  'bmlnZ2Vy',
  'bmlnZ2E=',
  'Y3VudA==',
  'd2hvcmU=',
  'ZmFnZ290',
  'cmV0YXJk',
  'ZGljaw==',
  'cHVzc3k=',
  'c2x1dA==',
  'YmFzdGFyZA==',
  'cmFwZQ==',
  'Y29jaw==',
]

let bannedWords = null
function getBannedWords() {
  if (!bannedWords) {
    bannedWords = BANNED_B64.map((b64) => atob(b64))
  }
  return bannedWords
}

function normalize(text) {
  return text.toLowerCase().replace(/[\s._\-!@#$%^&*()+=]/g, '')
}

export function containsBannedWord(text) {
  const normalized = normalize(text)
  return getBannedWords().some((word) => normalized.includes(word))
}
