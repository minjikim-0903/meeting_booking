import { getNextWeekdays } from "@/lib/mock-data"

export type Team = "프로덕트오너" | "개발자" | "데이터분석가" | "디자이너"

export type Person = {
  id: string
  name: string
  email: string
  team: Team
}

export const people: Person[] = [
  { id: "p1", name: "김도윤", email: "dowoon.kim@company.com", team: "프로덕트오너" },
  { id: "p2", name: "박서연", email: "seoyeon.park@company.com", team: "프로덕트오너" },
  { id: "p3", name: "이준호", email: "junho.lee@company.com", team: "개발자" },
  { id: "p4", name: "최민지", email: "minji.choi@company.com", team: "개발자" },
  { id: "p5", name: "정하늘", email: "haneul.jung@company.com", team: "데이터분석가" },
  { id: "p6", name: "강태양", email: "taeyang.kang@company.com", team: "데이터분석가" },
  { id: "p7", name: "윤소희", email: "sohee.yoon@company.com", team: "디자이너" },
  { id: "p8", name: "한지훈", email: "jihoon.han@company.com", team: "디자이너" },
]

export type AvailabilityStatus = "available" | "unavailable" | "unknown"

const nextWeekdays = getNextWeekdays()

/**
 * Hardcoded availability per person, indexed by the 5 dates returned by
 * `getNextWeekdays()` (Mon-Fri of next week). A believable mix of all three
 * statuses across people/days. Dates outside this mocked range fall back to
 * "unknown", matching the room-booking mock data's accepted limitation.
 */
const AVAILABILITY_TABLE: Record<string, AvailabilityStatus[]> = {
  p1: ["available", "available", "unavailable", "available", "unknown"],
  p2: ["available", "unknown", "available", "available", "unavailable"],
  p3: ["unavailable", "available", "available", "unknown", "available"],
  p4: ["available", "available", "unknown", "unavailable", "available"],
  p5: ["unknown", "unavailable", "available", "available", "available"],
  p6: ["available", "available", "available", "unknown", "unavailable"],
  p7: ["unavailable", "unknown", "available", "available", "available"],
  p8: ["available", "unavailable", "available", "unknown", "available"],
}

/** Deterministic mock lookup: person's availability on a given ISO date. */
export function getAvailability(
  personId: string,
  date: string
): AvailabilityStatus {
  const dayIndex = nextWeekdays.findIndex((day) => day.date === date)
  if (dayIndex === -1) return "unknown"

  const statuses = AVAILABILITY_TABLE[personId]
  if (!statuses) return "unknown"

  return statuses[dayIndex] ?? "unknown"
}
