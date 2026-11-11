# String Matching Lab

단순 비교(Naive String Matching)와 Boyer-Moore(Bad Character + Good Suffix)를 단계별로 비교하는 React 웹 애플리케이션입니다.

## 주요 기능
- 5개의 미리 준비된 Text / Pattern 예제
- 문자열 최대 길이 10자
- 단계별 실행, 이전/다음, 자동 재생, 재생 속도 조절
- 문자 비교 위치와 일치/불일치 시각화
- Boyer-Moore Bad Character / Good Suffix 테이블 표시
- 두 이동 규칙의 이동 거리 계산 및 큰 값 선택
- 실제 문자 비교 횟수와 패턴 이동 횟수 비교
- 알고리즘 장단점 및 시간 복잡도 설명

## 로컬 실행

Node.js가 설치되어 있어야 합니다.

```bash
npm install
npm run dev
```

터미널에 표시되는 로컬 주소(보통 http://localhost:5173)를 브라우저에서 엽니다.

## 배포 전 빌드 확인

```bash
npm run build
```

## GitHub에 올리기

1. GitHub에서 새 Repository를 생성합니다.
2. 이 프로젝트 폴더 안의 파일을 Repository에 업로드합니다.
3. `node_modules` 폴더는 올리지 않습니다. (처음에는 생성되어 있지 않습니다.)

Git을 사용하는 경우:

```bash
git init
git add .
git commit -m "Initial String Matching Visualizer"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

## Vercel 배포

1. https://vercel.com 에서 GitHub 계정으로 로그인합니다.
2. Add New → Project를 선택합니다.
3. 방금 올린 GitHub Repository를 Import합니다.
4. Framework Preset은 Vite로 선택합니다.
5. Build Command는 `npm run build`, Output Directory는 `dist`인지 확인합니다.
6. Deploy를 누릅니다.

이후 GitHub의 main 브랜치에 Push할 때마다 Vercel이 자동으로 재배포합니다.
