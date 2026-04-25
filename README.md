# I WANT NAVI

분당풍림아이원플러스 방문자를 위한 길안내 웹앱입니다.

입력한 동/호수를 기준으로 코어(엘리베이터) 추천과 세대 간 이동 경로를 안내합니다.

## 기술 스택

- Next.js 16 (App Router)
- TypeScript 5
- Tailwind CSS 4
- TanStack React Query 5

## 로컬 실행

```bash
pnpm install
pnpm dev
```

기본 개발 서버 주소:

- Local: http://localhost:3000
- Network: http://내-PC-IP:3000

## 외부 기기(IP) 접속 개발

IP로 접속해 개발할 때는 허용 오리진을 환경변수로 지정합니다.

`.env.local` 예시:

```env
NEXT_ALLOWED_DEV_ORIGINS=localhost,127.0.0.1,192.168.0.10
```

변경 후 개발 서버를 재시작하세요.

## 주요 스크립트

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm typecheck
```

## 프로젝트 구조

```text
src/
  app/         # page layer
  feature/     # feature layer
  gateway/     # server action api layer
  components/  # ui layer
  hook/
  lib/
  provider/
  utils/
  types/
```
