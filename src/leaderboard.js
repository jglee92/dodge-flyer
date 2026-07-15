import { initializeApp } from 'firebase/app'
import { getFirestore, doc, getDoc, setDoc, increment, collection, query, orderBy, limit as fsLimit, getDocs } from 'firebase/firestore'
import { firebaseConfig, isFirebaseConfigured } from './firebaseConfig.js'

// 로그인 없이도 "이 기기"를 계속 같은 랭킹 항목으로 갱신할 수 있게, 한 번 생성한
// 임의 ID를 로컬에 저장해서 문서 ID로 쓴다. 닉네임은 언제든 바꿀 수 있지만
// 랭킹 항목 자체는 기기당 하나로 유지된다(계속 새 항목이 쌓이지 않게).
const DEVICE_ID_KEY = 'dodgeflyer-device-id'

let db = null

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

export function initLeaderboard() {
  if (!isFirebaseConfigured || db) return
  const app = initializeApp(firebaseConfig)
  db = getFirestore(app)
}

export function isLeaderboardEnabled() {
  return isFirebaseConfigured
}

// 최고 점수는 이전 기록보다 높을 때만 갱신하고(get 한 번 해서 비교), 총점/판수는
// increment()로 서버에서 누적시켜서 평균 점수/참여 횟수를 랭킹에 같이 보여줄 수 있게 한다.
// 로켓/불꽃 스킨 id도 같이 저장해서 랭킹에 "이 사람이 쓰는 로켓" 아이콘을 보여준다.
export async function submitScore(nickname, score, skinId, flameId) {
  if (!db) return
  const ref = doc(db, 'leaderboard', getDeviceId())
  const existing = await getDoc(ref)
  const prevBest = existing.exists() ? existing.data().bestScore || 0 : 0
  const bestScore = Math.max(prevBest, score)
  await setDoc(
    ref,
    {
      nickname,
      bestScore,
      skinId,
      flameId,
      totalScore: increment(score),
      gamesPlayed: increment(1),
      updatedAt: Date.now(),
    },
    { merge: true },
  )
}

export async function fetchTopScores(count = 10) {
  if (!db) return []
  const q = query(collection(db, 'leaderboard'), orderBy('bestScore', 'desc'), fsLimit(count))
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data())
}
