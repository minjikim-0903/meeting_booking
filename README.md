# 미팅 예약 시스템 (Meeting Booking)

**배포 링크**: https://meeting-booking-zeta.vercel.app (로그인 없이 바로 사용해볼 수 있습니다)

6~8명 규모의 팀 미팅을 잡을 때 회의실 가용 현황과 참석자 일정을 한 화면에서 조율하고, 예약 요청 → 초대 응답까지 이어지는 흐름을 제공하는 사내 미팅룸 예약 웹앱입니다. 기획 배경과 전체 로드맵은 [docs/plan.md](docs/plan.md)에 정리되어 있습니다.

## 기술 스택

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS 4** + shadcn/ui 기반 컴포넌트 (`src/components/ui`)
- **Auth.js (NextAuth v5)** + **Prisma 7** + PostgreSQL(Supabase) 연동 코드는 존재하지만, 아직 실제 Google OAuth를 붙이지 않아 현재 화면에서는 사용되지 않음 (아래 "현재는 목업 우선 구현" 참고)
- 회의실 목록·참석자 명단은 `src/lib/mock-data.ts`, `src/lib/mock-participants.ts`의 목업 데이터 사용

## 현재는 목업 우선 구현

실제 로그인 없이도 예약 요청 → 받은 요청 → 수락/거절 흐름을 끝까지 확인할 수 있도록, DB/인증 대신 프론트엔드 목업 레이어로 동작 중입니다.

- [mock-session.ts](src/lib/mock-session.ts) — 로그인된 것처럼 보이게 하는 고정 `MOCK_USER` (실제 서버 요청은 인증시키지 않음, 화면 표시용)
- [mock-booking-store.ts](src/lib/mock-booking-store.ts) — 브라우저 `localStorage`를 "가짜 DB"로 쓰는 클라이언트 전용 스토어. 예약 요청 생성, 초대 응답(수락/거절), 요청 취소, 받은/응답한 초대 조회를 모두 여기서 처리
- `/api/booking-requests*` 라우트와 Prisma 스키마는 실제 로그인이 붙을 때 목업 스토어를 대체할 목적으로 남아 있는 상태 (현재 UI는 호출하지 않음)

## 주요 화면 및 기능

- **회의실 선택 (`/`)** — 회의실 카드 목록에서 회의실을 골라 예약 현황 페이지로 이동
- **회의실 예약 현황 (`/schedule/[roomId]`)** — 요일 × 시간대(10분 단위) 그리드로 특정 회의실의 예약 가능 여부를 보여주고, 팀/참석자를 선택하면 참석자 일정과 겹쳐서 확인 가능. 지난 날짜는 선택 불가, 대기중/확정 예약은 시각적으로 구분(줄무늬 vs 단색)되며 이미 요청이 걸린 슬롯은 재요청되지 않도록 막고, 내가 주최한 예약은 강조 표시. 빈 슬롯을 클릭하면 시작/종료 시간·회의 목적(필수)·화상회의 링크(선택)를 입력하는 예약 요청 다이얼로그로 진입 ([room-schedule.tsx](src/components/room-schedule.tsx))
- **참석자 선택 및 일정 확인** — 팀(서비스1~5팀) 선택 시 해당 팀원 전원이 참석자 목록에 자동 반영, 팀별 고유 색상으로 캘린더 예약 블록과 뱃지에 표시. 개인별 가용 여부를 참석자 체크리스트에서 바로 확인 ([participant-picker.tsx](src/components/participant-picker.tsx))
- **받은 요청 (`/requests`)** — "요청 온 미팅"(응답 대기)과 "지난 미팅"(이미 응답함) 섹션으로 분리해 목록 표시. 응답 대기 요청은 수락/거절(사유 선택) 처리하고, 이미 응답한 건은 다시 변경 가능. 화상회의 링크가 있는 수락된 요청은 "화상으로 참석" 버튼 노출
- **사이드바** — 받은 요청 메뉴에 미응답(unread) 건수 뱃지 표시, 팀별 색상 범례 및 로그인 사용자(목업) 정보 표시 ([sidebar-nav.tsx](src/components/sidebar-nav.tsx))

## API 라우트 (현재 미사용, 향후 실제 로그인 붙일 때 사용 예정)

- `GET/POST /api/booking-requests` — 예약 요청 생성/조회
- `GET /api/booking-requests/inbox` — 로그인한 사용자가 받은 초대 목록
- `/api/booking-requests/invitees/[inviteeId]` — 개별 초대 응답(수락/거절) 처리
- `/api/auth/[...nextauth]` — Auth.js 인증 핸들러

## 데이터 모델 (Prisma, 현재 미사용)

`prisma/schema.prisma`에 정의:

- `User` / `Account` / `Session` / `VerificationToken` — Auth.js 표준 스키마
- `BookingRequest` — 회의실·일시·목적·주최자 정보를 담은 예약 요청 (`pending` / `confirmed` / `rejected`)
- `BookingInvitee` — 요청별 초대 대상자와 응답 상태(`pending` / `accepted` / `rejected`, 거절 사유 포함)

## 현재 구현 범위 (MVP)

`docs/plan.md`의 로드맵 기준으로:

- ✅ 회의실 가용 현황 매트릭스, 참석자 일정 확인, 팀 선택 시 참석자 자동 반영, 예약 요청 생성/초대 응답(수락·거절) 흐름, 화상회의 링크 첨부 — 단 목업 세션 + `localStorage` 스토어 기반 (실제 로그인/DB 미연동)
- ⏳ 미구현: 실제 Google OAuth 로그인 및 DB 연동, 전원 동의 시 자동 확정 알림, HR 시스템 연동(연차/재택/외근 자동 표기), 일정 충돌 시 우선순위 조율, 회의록/요약 자동 생성

열린 질문(외부 캘린더 연동, 화상회의 연동 대상, 알림 채널 등)은 `docs/plan.md` 9장을 참고하세요.
