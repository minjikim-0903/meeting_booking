/** 개인별 직무 — 참석자 체크리스트 뱃지에 표시된다. */
export type Role = "프로덕트 오너" | "개발자" | "데이터 분석가" | "프로덕트 디자이너"

/** 직무와 무관한 소속 조직 팀(토스식 "OO팀" 네이밍) — '팀 선택' 필터 기준. */
export type Team = "그로스팀" | "리스크팀" | "결제팀" | "인증팀"

/** Distinct accent color per team, used for calendar booking blocks and legend. */
export const TEAM_COLOR: Record<Team, { dot: string; badge: string; block: string }> = {
  그로스팀: {
    dot: "bg-sky-500",
    badge: "border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-300",
    block: "bg-sky-500/20 hover:bg-sky-500/30",
  },
  리스크팀: {
    dot: "bg-violet-500",
    badge: "border-transparent bg-violet-500/15 text-violet-700 dark:text-violet-300",
    block: "bg-violet-500/20 hover:bg-violet-500/30",
  },
  결제팀: {
    dot: "bg-amber-500",
    badge: "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300",
    block: "bg-amber-500/20 hover:bg-amber-500/30",
  },
  인증팀: {
    dot: "bg-rose-500",
    badge: "border-transparent bg-rose-500/15 text-rose-700 dark:text-rose-300",
    block: "bg-rose-500/20 hover:bg-rose-500/30",
  },
}

export const ALL_TEAM_NAMES = Object.keys(TEAM_COLOR) as Team[]

export type Person = {
  id: string
  name: string
  email: string
  role: Role
  team: Team
}

export const people: Person[] = [
  { id: "p1", name: "김도윤", email: "dowoon.kim@company.com", role: "프로덕트 오너", team: "그로스팀" },
  { id: "p2", name: "박서연", email: "seoyeon.park@company.com", role: "프로덕트 오너", team: "리스크팀" },
  { id: "p3", name: "이준호", email: "junho.lee@company.com", role: "개발자", team: "그로스팀" },
  { id: "p4", name: "최민지", email: "minji.choi@company.com", role: "개발자", team: "리스크팀" },
  { id: "p5", name: "정하늘", email: "haneul.jung@company.com", role: "데이터 분석가", team: "결제팀" },
  { id: "p6", name: "강태양", email: "taeyang.kang@company.com", role: "데이터 분석가", team: "인증팀" },
  { id: "p7", name: "윤소희", email: "sohee.yoon@company.com", role: "프로덕트 디자이너", team: "결제팀" },
  { id: "p8", name: "한지훈", email: "jihoon.han@company.com", role: "프로덕트 디자이너", team: "인증팀" },
]

export type AvailabilityStatus = "available" | "unavailable" | "unknown"

/** Tiny deterministic string hash (djb2-ish), used to derive stable mock availability. */
function hashSeed(str: string): number {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = (h * 33) ^ str.charCodeAt(i)
  }
  return h >>> 0
}

/**
 * Deterministic mock lookup: person's availability at a given ISO date +
 * time-of-day. Granularity is hourly (all 10-min slots within the same hour
 * share a status) so the calendar reads as believable meeting-sized blocks
 * rather than day-long lumps or per-minute noise. Seeded by person+date+hour,
 * so it works for any date (including weeks navigated via the date-range
 * nav), not just a hardcoded "next week" window.
 */
export function getAvailability(
  personId: string,
  date: string,
  minute: number = 480
): AvailabilityStatus {
  const hourBlock = Math.floor(minute / 60)
  const bucket = hashSeed(`${personId}-${date}-${hourBlock}`) % 10
  if (bucket < 6) return "available"
  if (bucket < 8) return "unavailable"
  return "unknown"
}
