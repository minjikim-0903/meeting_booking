export type Room = {
  id: string
  name: string
  capacity: number
  location: string
  hasVideoEquipment: boolean
  /** A monitor is only meaningful for video calls, so this can't be true when `hasVideoEquipment` is false. */
  hasMonitor: boolean
}

export type Booking = {
  id: string
  roomId: string
  /** ISO date string, e.g. "2026-07-13" */
  date: string
  /** minutes from 00:00, 10-minute aligned */
  startMinutes: number
  /** minutes from 00:00, 10-minute aligned, exclusive */
  endMinutes: number
  title: string
  /** 회의 목적 */
  purpose: string
  /** References a Person.id from mock-participants.ts's `people` array */
  organizerId: string
  /** References Person.id's from mock-participants.ts's `people` array */
  attendeeIds: string[]
}

export const rooms: Room[] = [
  {
    id: "room-1",
    name: "3층 회의실 A",
    capacity: 8,
    location: "3층",
    hasVideoEquipment: true,
    hasMonitor: true,
  },
  {
    id: "room-2",
    name: "3층 회의실 B",
    capacity: 4,
    location: "3층",
    hasVideoEquipment: false,
    hasMonitor: false,
  },
  {
    id: "room-3",
    name: "5층 대회의실",
    capacity: 12,
    location: "5층",
    hasVideoEquipment: true,
    hasMonitor: true,
  },
  {
    id: "room-4",
    name: "5층 소회의실",
    capacity: 6,
    location: "5층",
    hasVideoEquipment: false,
    hasMonitor: false,
  },
  {
    id: "room-5",
    name: "7층 회의실",
    capacity: 10,
    location: "7층",
    hasVideoEquipment: true,
    hasMonitor: false,
  },
]

export type WeekDay = { date: string; label: string }

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"]

/** Formats a date as e.g. "7/13 (월)", matching the grid's day-column label style. */
export function formatDayLabel(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()} (${WEEKDAY_LABELS[d.getDay()]})`
}

function getThisWeekMonday(): Date {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0(Sun) ~ 6(Sat)
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

  const thisMonday = new Date(today)
  thisMonday.setDate(today.getDate() + mondayOffset)

  return thisMonday
}

/**
 * Returns the current week's Monday-Friday (5 weekdays) relative to today,
 * so "today" (and any earlier days in the same week) are visible by default
 * — needed for the calendar's past-date graying to actually show up on load
 * instead of only after navigating back a week.
 */
export function getCurrentWeekdays(): WeekDay[] {
  const monday = getThisWeekMonday()

  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return { date: toISODate(d), label: formatDayLabel(d) }
  })
}

/** Default date range (Mon-Fri of the current week) used to seed the date-range picker. */
export function getDefaultDateRange(): { from: Date; to: Date } {
  const monday = getThisWeekMonday()
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  return { from: monday, to: friday }
}

/** Returns every date (inclusive) between `from` and `to`, labeled like `getCurrentWeekdays()`. */
export function getDateRangeDays(from: Date, to: Date): WeekDay[] {
  const days: WeekDay[] = []
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate())

  while (cursor <= end) {
    days.push({ date: toISODate(cursor), label: formatDayLabel(cursor) })
    cursor.setDate(cursor.getDate() + 1)
  }

  return days
}

const weekdays = getCurrentWeekdays()

export const bookings: Booking[] = [
  { id: "b1", roomId: "room-1", date: weekdays[0].date, startMinutes: 540, endMinutes: 600, title: "주간 스탠드업", purpose: "주간 진행 상황 공유", organizerId: "p3", attendeeIds: ["p3", "p4", "p1"] },
  { id: "b2", roomId: "room-1", date: weekdays[0].date, startMinutes: 780, endMinutes: 840, title: "PO 싱크업", purpose: "제품 우선순위 조율", organizerId: "p1", attendeeIds: ["p1", "p2"] },
  { id: "b3", roomId: "room-1", date: weekdays[2].date, startMinutes: 600, endMinutes: 660, title: "스프린트 플래닝", purpose: "다음 스프린트 작업 범위 확정", organizerId: "p1", attendeeIds: ["p1", "p3", "p4", "p2"] },
  { id: "b4", roomId: "room-1", date: weekdays[3].date, startMinutes: 900, endMinutes: 960, title: "디자인 리뷰", purpose: "신규 화면 디자인 검토", organizerId: "p7", attendeeIds: ["p7", "p8", "p1"] },
  { id: "b5", roomId: "room-1", date: weekdays[4].date, startMinutes: 480, endMinutes: 510, title: "얼리버드 1:1", purpose: "1:1 면담", organizerId: "p2", attendeeIds: ["p2", "p3"] },
  { id: "b6", roomId: "room-2", date: weekdays[0].date, startMinutes: 660, endMinutes: 690, title: "채용 인터뷰", purpose: "백엔드 개발자 채용 면접", organizerId: "p3", attendeeIds: ["p3", "p4"] },
  { id: "b7", roomId: "room-2", date: weekdays[1].date, startMinutes: 540, endMinutes: 570, title: "데일리 체크인", purpose: "일일 이슈 점검", organizerId: "p4", attendeeIds: ["p4", "p3"] },
  { id: "b8", roomId: "room-2", date: weekdays[2].date, startMinutes: 780, endMinutes: 810, title: "1:1 면담", purpose: "분기 성과 리뷰", organizerId: "p1", attendeeIds: ["p1", "p5"] },
  { id: "b9", roomId: "room-2", date: weekdays[4].date, startMinutes: 1020, endMinutes: 1080, title: "회고 미팅", purpose: "스프린트 회고", organizerId: "p3", attendeeIds: ["p3", "p4", "p1", "p7"] },
  { id: "b10", roomId: "room-3", date: weekdays[0].date, startMinutes: 600, endMinutes: 720, title: "분기 전체 회의", purpose: "분기 실적 및 계획 공유", organizerId: "p1", attendeeIds: ["p1", "p2", "p5", "p7"] },
  { id: "b11", roomId: "room-3", date: weekdays[1].date, startMinutes: 840, endMinutes: 900, title: "신규 기능 킥오프", purpose: "신규 기능 개발 착수", organizerId: "p2", attendeeIds: ["p2", "p3", "p4", "p7"] },
  { id: "b12", roomId: "room-3", date: weekdays[3].date, startMinutes: 540, endMinutes: 600, title: "데이터 분석 공유회", purpose: "사용자 행동 데이터 분석 결과 공유", organizerId: "p5", attendeeIds: ["p5", "p6", "p1"] },
  { id: "b13", roomId: "room-3", date: weekdays[4].date, startMinutes: 660, endMinutes: 720, title: "타 팀 협업 미팅", purpose: "디자인-개발 협업 방안 논의", organizerId: "p7", attendeeIds: ["p7", "p3", "p4"] },
  { id: "b14", roomId: "room-4", date: weekdays[1].date, startMinutes: 600, endMinutes: 630, title: "QA 회고", purpose: "QA 프로세스 개선 논의", organizerId: "p4", attendeeIds: ["p4", "p3"] },
  { id: "b15", roomId: "room-4", date: weekdays[2].date, startMinutes: 900, endMinutes: 930, title: "온보딩 세션", purpose: "신규 입사자 온보딩", organizerId: "p2", attendeeIds: ["p2", "p1"] },
  { id: "b16", roomId: "room-4", date: weekdays[3].date, startMinutes: 1080, endMinutes: 1140, title: "야근 조율 회의", purpose: "일정 지연 대응 방안 논의", organizerId: "p1", attendeeIds: ["p1", "p3", "p4"] },
  { id: "b17", roomId: "room-5", date: weekdays[0].date, startMinutes: 720, endMinutes: 780, title: "점심 세미나", purpose: "기술 트렌드 공유 세미나", organizerId: "p6", attendeeIds: ["p6", "p5", "p3"] },
  { id: "b18", roomId: "room-5", date: weekdays[2].date, startMinutes: 990, endMinutes: 1050, title: "프로덕트 리뷰", purpose: "출시 전 제품 최종 검토", organizerId: "p1", attendeeIds: ["p1", "p2", "p7", "p8"] },
  { id: "b19", roomId: "room-5", date: weekdays[4].date, startMinutes: 480, endMinutes: 540, title: "임원 보고", purpose: "분기 실적 임원 보고", organizerId: "p2", attendeeIds: ["p2", "p1"] },
]
