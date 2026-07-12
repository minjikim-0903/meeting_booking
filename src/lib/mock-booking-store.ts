/**
 * 로그인을 아직 붙이지 않은 상태에서도 예약 요청 → 받은 요청 → 수락/거절
 * 흐름을 끝까지 확인할 수 있도록, 실제 서버 API 대신 브라우저
 * localStorage를 "가짜 DB"로 쓰는 클라이언트 전용 목업 스토어.
 * 실제 로그인이 붙으면 이 파일 대신 /api/booking-requests* 라우트를 다시
 * 쓰도록 교체하면 된다.
 */

export type MockInviteeStatus = "pending" | "accepted" | "rejected"
export type MockRequestStatus = "pending" | "confirmed" | "rejected"

export type MockBookingRequest = {
  id: string
  roomId: string
  roomName: string
  date: string
  startMinutes: number
  endMinutes: number
  title: string
  purpose: string
  organizerEmail: string
  organizerName: string
  status: MockRequestStatus
  createdAt: string
}

export type MockInvitee = {
  id: string
  requestId: string
  email: string
  name: string
  status: MockInviteeStatus
  rejectReason: string | null
  respondedAt: string | null
}

export type InboxItem = MockInvitee & { request: MockBookingRequest }

type Store = {
  requests: MockBookingRequest[]
  invitees: MockInvitee[]
}

const STORAGE_KEY = "mock-booking-store-v1"

function readStore(): Store {
  if (typeof window === "undefined") return { requests: [], invitees: [] }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { requests: [], invitees: [] }
    return JSON.parse(raw) as Store
  } catch {
    return { requests: [], invitees: [] }
  }
}

export const STORE_UPDATED_EVENT = "mock-booking-store-updated"

function writeStore(store: Store) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  // Same-tab listeners (e.g. the sidebar's unread badge) can't rely on the
  // native "storage" event, which only fires in *other* tabs — so notify
  // locally too.
  window.dispatchEvent(new Event(STORE_UPDATED_EVENT))
}

function makeId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function createBookingRequest(input: {
  roomId: string
  roomName: string
  date: string
  startMinutes: number
  endMinutes: number
  title: string
  purpose: string
  organizerEmail: string
  organizerName: string
  invitees: { email: string; name: string }[]
}): MockBookingRequest {
  const store = readStore()
  const request: MockBookingRequest = {
    id: makeId(),
    roomId: input.roomId,
    roomName: input.roomName,
    date: input.date,
    startMinutes: input.startMinutes,
    endMinutes: input.endMinutes,
    title: input.title,
    purpose: input.purpose,
    organizerEmail: input.organizerEmail,
    organizerName: input.organizerName,
    status: "pending",
    createdAt: new Date().toISOString(),
  }
  const invitees: MockInvitee[] = input.invitees.map((inv) => ({
    id: makeId(),
    requestId: request.id,
    email: inv.email,
    name: inv.name,
    status: "pending",
    rejectReason: null,
    respondedAt: null,
  }))

  store.requests.push(request)
  store.invitees.push(...invitees)
  writeStore(store)
  return request
}

function toInboxItems(
  store: Store,
  invitees: MockInvitee[]
): InboxItem[] {
  return invitees
    .map((inv) => {
      const request = store.requests.find((r) => r.id === inv.requestId)
      return request ? { ...inv, request } : null
    })
    .filter((item): item is InboxItem => item !== null)
}

/** Pending invites addressed to `email` (awaiting a response), newest first. */
export function getInboxForEmail(email: string): InboxItem[] {
  const store = readStore()
  const pending = store.invitees.filter(
    (inv) => inv.email === email && inv.status === "pending"
  )
  return toInboxItems(store, pending).sort((a, b) =>
    b.request.createdAt.localeCompare(a.request.createdAt)
  )
}

/** Already-responded (accepted/rejected) invites addressed to `email`, most recently responded first. */
export function getRespondedInvitesForEmail(email: string): InboxItem[] {
  const store = readStore()
  const responded = store.invitees.filter(
    (inv) => inv.email === email && inv.status !== "pending"
  )
  return toInboxItems(store, responded).sort((a, b) =>
    (b.respondedAt ?? "").localeCompare(a.respondedAt ?? "")
  )
}

/**
 * Pending or confirmed requests for a room (rejected ones are excluded, since
 * they shouldn't block or occupy the slot). Used to render "예약 대기중" /
 * confirmed blocks on the calendar and to stop the slot from being
 * re-requested while it's awaiting responses.
 */
export function getActiveRequestsForRoom(roomId: string): MockBookingRequest[] {
  const store = readStore()
  return store.requests.filter(
    (r) => r.roomId === roomId && r.status !== "rejected"
  )
}

/** Organizer cancels their own request (pending or confirmed) — removes it and its invitees. */
export function cancelBookingRequest(requestId: string) {
  const store = readStore()
  store.requests = store.requests.filter((r) => r.id !== requestId)
  store.invitees = store.invitees.filter((i) => i.requestId !== requestId)
  writeStore(store)
}

/** All invitees for a request — used to re-populate the participant picker when editing. */
export function getInviteesForRequest(requestId: string): MockInvitee[] {
  const store = readStore()
  return store.invitees.filter((i) => i.requestId === requestId)
}

export function respondToInvitee(
  inviteeId: string,
  status: "accepted" | "rejected",
  rejectReason?: string
) {
  const store = readStore()
  const invitee = store.invitees.find((i) => i.id === inviteeId)
  if (!invitee) return

  invitee.status = status
  invitee.rejectReason = status === "rejected" ? rejectReason ?? null : null
  invitee.respondedAt = new Date().toISOString()

  const request = store.requests.find((r) => r.id === invitee.requestId)
  if (request) {
    const siblings = store.invitees.filter((i) => i.requestId === request.id)
    if (siblings.some((i) => i.status === "rejected")) {
      request.status = "rejected"
    } else if (siblings.every((i) => i.status === "accepted")) {
      request.status = "confirmed"
    }
  }

  writeStore(store)
}
