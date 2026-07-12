# 미팅 예약 시스템 (Meeting Booking)

6~8명 규모의 팀 미팅을 잡을 때 회의실 가용 현황과 참석자 일정을 한 화면에서 조율하고, 예약 요청 → 초대 응답까지 이어지는 흐름을 제공하는 사내 미팅룸 예약 웹앱입니다. 기획 배경과 전체 로드맵은 [docs/plan.md](docs/plan.md)에 정리되어 있습니다.

## 기술 스택

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS 4** + shadcn/ui 기반 컴포넌트 (`src/components/ui`)
- **Auth.js (NextAuth v5)** — Google OAuth 로그인, Prisma 어댑터로 세션 저장
- **Prisma 7** + PostgreSQL (Supabase) — 예약 요청/초대 데이터 영속화
- 회의실 목록·기존 예약·참석자 명단은 아직 `src/lib/mock-data.ts`, `src/lib/mock-participants.ts`의 목업 데이터 사용

## 주요 화면 및 기능

- **회의실 선택 (`/`)** — 회의실 카드 목록에서 회의실을 골라 예약 현황 페이지로 이동
- **회의실 예약 현황 (`/schedule/[roomId]`)** — 요일 × 시간대(10분 단위) 그리드로 특정 회의실의 예약 가능 여부를 보여주고, 팀/참석자를 선택하면 참석자 일정과 겹쳐서 확인 가능. 빈 슬롯을 클릭하면 예약 요청 다이얼로그로 진입 ([room-schedule.tsx](src/components/room-schedule.tsx))
- **받은 요청 (`/requests`)** — 로그인한 사용자가 초대받은 예약 요청 목록을 확인하고 수락/거절(사유 선택) 응답
- **참석자 일정 확인** — 팀 선택 시 해당 팀원 전원이 참석자 목록에 자동 반영, 개인별 가용 여부 패널로 표시 ([participant-availability.tsx](src/components/participant-availability.tsx), [participant-picker.tsx](src/components/participant-picker.tsx))

## API 라우트

- `GET/POST /api/booking-requests` — 예약 요청 생성/조회
- `GET /api/booking-requests/inbox` — 로그인한 사용자가 받은 초대 목록
- `/api/booking-requests/invitees/[inviteeId]` — 개별 초대 응답(수락/거절) 처리
- `/api/auth/[...nextauth]` — Auth.js 인증 핸들러

## 데이터 모델 (Prisma)

`prisma/schema.prisma`에 정의:

- `User` / `Account` / `Session` / `VerificationToken` — Auth.js 표준 스키마
- `BookingRequest` — 회의실·일시·목적·주최자 정보를 담은 예약 요청 (`pending` / `confirmed` / `rejected`)
- `BookingInvitee` — 요청별 초대 대상자와 응답 상태(`pending` / `accepted` / `rejected`, 거절 사유 포함)

## 시작하기

### 1. 환경 변수 설정

`.env.local`을 참고해 다음 값을 채웁니다.

- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — [Google Cloud Console](https://console.cloud.google.com/apis/credentials)에서 발급 (리다이렉트 URI: `http://localhost:3000/api/auth/callback/google`)
- `AUTH_SECRET` — `npx auth secret` 또는 `openssl rand -base64 33`
- `DATABASE_URL` / `DIRECT_URL` — Supabase Postgres 연결 문자열 (풀링/다이렉트 각각)

### 2. 의존성 설치 및 DB 마이그레이션

```bash
npm install
npx prisma migrate dev
```

### 3. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인합니다.

## 현재 구현 범위 (MVP)

`docs/plan.md`의 로드맵 기준으로:

- ✅ 회의실 가용 현황 매트릭스, 참석자 일정 확인, 팀 선택 시 참석자 자동 반영, 예약 요청 생성/초대 응답(수락·거절) 흐름
- ⏳ 미구현: 전원 동의 시 자동 확정, HR 시스템 연동(연차/재택/외근 자동 표기), 일정 충돌 시 우선순위 조율, 화상회의 링크 연동, 회의록/요약 자동 생성

열린 질문(외부 캘린더 연동, 화상회의 연동 대상, 알림 채널 등)은 `docs/plan.md` 9장을 참고하세요.
