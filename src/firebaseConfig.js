// https://console.firebase.google.com 에서 프로젝트를 만들고 "웹 앱 추가"로 받은
// 설정 값을 아래 apiKey 등에 그대로 붙여넣으면 랭킹 기능이 켜진다.
// (이 값들은 비밀키가 아니라 공개돼도 되는 클라이언트 식별자라, 보안은
// Firestore 규칙 쪽에서 잡아준다 — 그대로 커밋해도 된다.)
export const firebaseConfig = {
  apiKey: 'AIzaSyAwsPGYZA9FTMWy9_co9MjKKivIIQhXan4',
  authDomain: 'close-rocket.firebaseapp.com',
  projectId: 'close-rocket',
  storageBucket: 'close-rocket.firebasestorage.app',
  messagingSenderId: '958764711407',
  appId: '1:958764711407:web:86f5f66af1c4f178978a1a',
}

export const isFirebaseConfigured = firebaseConfig.apiKey !== 'YOUR_API_KEY'
