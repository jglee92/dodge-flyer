import { defineConfig } from 'vite'

// jglee92.github.io는 GitHub Pages "유저 사이트" 저장소라 루트 경로(/)에서 서빙된다.
// (프로젝트 사이트였다면 /<repo>/ 하위 경로라 base를 그에 맞춰야 했다.)
export default defineConfig({
  base: '/',
})
