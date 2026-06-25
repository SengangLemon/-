# Nonet — 9ⁿ 결정 그리드

3×3 타일을 누르면 그 안에서 다시 9개로 갈라지는 무한 줌인 결정 그리드.
정적 사이트(파일 1개). 빌드 불필요.

## Vercel 배포

### 방법 1 — 드래그&드롭 (가장 쉬움)
1. https://vercel.com 로그인
2. Add New → Project → 이 폴더를 통째로 드래그&드롭
   (또는 Deploy 화면에 폴더 업로드)
3. Framework Preset: **Other** (또는 자동감지), 빌드 설정 비움 → Deploy

### 방법 2 — CLI
```bash
npm i -g vercel
cd nonet-deploy
vercel          # 미리보기 배포
vercel --prod   # 운영 배포
```

### 방법 3 — GitHub 연동
1. 이 폴더를 깃 저장소로 push
2. Vercel에서 Import Git Repository → 선택 → Deploy

## 로컬 확인
그냥 index.html 더블클릭하면 열림. (서버 불필요)
