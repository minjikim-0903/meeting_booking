"use client"

import { useEffect, useMemo, useState } from "react"
import { Video } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { ALL_TEAMS, ParticipantPicker } from "@/components/participant-picker"
import { DateRangeNav } from "@/components/date-range-nav"
import {
  bookings as seedBookings,
  formatDayLabel,
  getDateRangeDays,
  getDefaultDateRange,
  getNextWeekdays,
  rooms,
  type Booking,
  type Room,
} from "@/lib/mock-data"
import {
  getAvailability,
  people,
  TEAM_COLOR,
  type AvailabilityStatus,
  type Person,
  type Role,
  type Team,
} from "@/lib/mock-participants"
import { MOCK_USER } from "@/lib/mock-session"
import {
  cancelBookingRequest,
  createBookingRequest,
  getActiveRequestsForRoom,
  getInviteesForRequest,
  STORE_UPDATED_EVENT,
  type MockBookingRequest,
} from "@/lib/mock-booking-store"

const AVAILABILITY_LABEL: Record<AvailabilityStatus, string> = {
  available: "가능",
  unavailable: "불가능",
  unknown: "미정",
}

const AVAILABILITY_BADGE_CLASS: Record<AvailabilityStatus, string> = {
  available:
    "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
  unavailable: "bg-destructive/10 text-destructive dark:bg-destructive/20",
  unknown: "bg-muted text-muted-foreground",
}

const TIME_SLOTS = Array.from({ length: 72 }, (_, i) => 480 + i * 10)

function minutesToLabel(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

function findBooking(
  bookingList: Booking[],
  roomId: string,
  date: string,
  minute: number
): Booking | undefined {
  return bookingList.find(
    (b) =>
      b.roomId === roomId &&
      b.date === date &&
      minute >= b.startMinutes &&
      minute < b.endMinutes
  )
}

function findActiveRequest(
  activeRequests: MockBookingRequest[],
  date: string,
  minute: number
): MockBookingRequest | undefined {
  return activeRequests.find(
    (r) => r.date === date && minute >= r.startMinutes && minute < r.endMinutes
  )
}

function getOrganizer(booking: Booking): Person | undefined {
  return people.find((p) => p.id === booking.organizerId)
}

/** Resolves a booking-request organizer's team by email — checks the mock roster, then the current mock user. */
function getOrganizerTeamByEmail(email: string): Team | undefined {
  return (
    people.find((p) => p.email === email)?.team ??
    (email === MOCK_USER.email ? MOCK_USER.team : undefined)
  )
}

function getAttendees(booking: Booking): Person[] {
  return booking.attendeeIds
    .map((id) => people.find((p) => p.id === id))
    .filter((p): p is Person => Boolean(p))
}

/** Parses an ISO date string ("YYYY-MM-DD") into a local Date, matching mock-data's date formatting. */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d)
}

/** Formats a Date as an ISO date string ("YYYY-MM-DD"), matching mock-data's internal toISODate. */
function formatLocalISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

const RESCHEDULE_DAY_END_MINUTES = 1200 // 20:00

type SlotSelection = {
  room: Room
  date: string
  dateLabel: string
  startMinutes: number
  endMinutes: number
}

/** A selectable invitee: either a mock `Person` or the synthetic "me" (current mock user), which has no `Team`/`Role`. */
type Invitee = Omit<Person, "team" | "role"> & { team?: Team; role?: Role }

export function RoomSchedule() {
  const [selectedRoomId, setSelectedRoomId] = useState(rooms[0]?.id)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() =>
    getDefaultDateRange()
  )
  const [selection, setSelection] = useState<SlotSelection | null>(null)
  const [bookingList, setBookingList] = useState<Booking[]>(() => seedBookings)
  const [infoBooking, setInfoBooking] = useState<Booking | null>(null)
  const [infoRequest, setInfoRequest] = useState<MockBookingRequest | null>(null)
  const [reschedulingBooking, setReschedulingBooking] = useState<Booking | null>(
    null
  )
  const [draftDate, setDraftDate] = useState<Date | undefined>(undefined)
  const [draftStartMinutes, setDraftStartMinutes] = useState<
    number | undefined
  >(undefined)
  const [coordinationMessage, setCoordinationMessage] = useState("")
  const [coordinationSubmitted, setCoordinationSubmitted] = useState(false)

  const [selectedTeam, setSelectedTeam] = useState<string>(ALL_TEAMS)
  const [participantSearch, setParticipantSearch] = useState("")
  // 예약자(나)는 항상 자신이 초대한 회의의 참석자이기도 하므로 기본 선택.
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<
    Set<string>
  >(() => new Set(["me"]))

  const selectedPeople = useMemo<Invitee[]>(() => {
    const selected: Invitee[] = people.filter((person) =>
      selectedParticipantIds.has(person.id)
    )
    // 예약자(나)는 항상 목록 최상단에 오도록 앞에 추가한다.
    if (selectedParticipantIds.has("me")) {
      selected.unshift({
        id: "me",
        name: MOCK_USER.name,
        email: MOCK_USER.email,
        role: MOCK_USER.role,
        team: MOCK_USER.team,
      })
    }
    return selected
  }, [selectedParticipantIds])

  const [requestSubmitting, setRequestSubmitting] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [meetingPurpose, setMeetingPurpose] = useState("")
  const [meetingVideoLink, setMeetingVideoLink] = useState("")

  function toggleParticipant(personId: string, checked: boolean) {
    setSelectedParticipantIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(personId)
      } else {
        next.delete(personId)
      }
      return next
    })
  }

  function handleTeamChange(team: string) {
    setSelectedTeam(team)
    // Picking a specific team should be enough on its own to see that
    // team's room availability — auto-select all of its members instead
    // of requiring each person to be checked individually.
    if (team !== ALL_TEAMS) {
      const teamMemberIds = people
        .filter((person) => person.team === team)
        .map((person) => person.id)
      setSelectedParticipantIds((prev) => new Set([...prev, ...teamMemberIds]))
    }
  }

  const room = rooms.find((r) => r.id === selectedRoomId) ?? rooms[0]

  // 응답 대기 중이거나 전원 수락되어 확정된 예약 요청을 달력에 표시한다.
  // (대기중이면 재요청을 막고, 확정되면 일반 예약처럼 보여준다.) localStorage
  // 기반 목업 스토어라 다른 탭/컴포넌트에서 바뀐 값을 반영하려면 커스텀
  // 이벤트를 구독해야 한다.
  const [activeRequests, setActiveRequests] = useState<MockBookingRequest[]>(
    []
  )
  useEffect(() => {
    function refresh() {
      setActiveRequests(getActiveRequestsForRoom(room.id))
    }
    refresh()
    window.addEventListener(STORE_UPDATED_EVENT, refresh)
    return () => window.removeEventListener(STORE_UPDATED_EVENT, refresh)
  }, [room.id])

  const weekdays = useMemo(() => {
    if (dateRange?.from && dateRange?.to) {
      return getDateRangeDays(dateRange.from, dateRange.to)
    }
    return getNextWeekdays()
  }, [dateRange])

  // 지난 날짜는 회의실 예약이 불가능하므로 비활성화 기준으로 쓴다.
  const todayISO = useMemo(() => formatLocalISODate(new Date()), [])

  // "전원 가능" highlighting is per time slot (not day-level): a free slot is
  // highlighted only when every selected participant is available at that
  // exact date + time.
  function isAllAvailable(date: string, minute: number): boolean {
    return (
      selectedPeople.length > 0 &&
      selectedPeople.every(
        (person) => getAvailability(person.id, date, minute) === "available"
      )
    )
  }

  const reschedulingDuration = reschedulingBooking
    ? reschedulingBooking.endMinutes - reschedulingBooking.startMinutes
    : 0
  const rescheduleTimeOptions = useMemo(
    () =>
      TIME_SLOTS.filter(
        (minute) => minute + reschedulingDuration <= RESCHEDULE_DAY_END_MINUTES
      ),
    [reschedulingDuration]
  )

  // Start-time choices: from the day start (or right after the nearest
  // earlier booking on that room/date) up to just before the current end.
  const selectionStartOptions = useMemo(() => {
    if (!selection) return []
    const minStart = bookingList
      .filter(
        (b) =>
          b.roomId === selection.room.id &&
          b.date === selection.date &&
          b.endMinutes <= selection.endMinutes
      )
      .reduce((max, b) => Math.max(max, b.endMinutes), TIME_SLOTS[0])
    const opts: number[] = []
    for (let m = minStart; m <= selection.endMinutes - 10; m += 10) {
      opts.push(m)
    }
    return opts
  }, [selection, bookingList])

  // End-time choices: from just after the current start up to (but not
  // overlapping) the next booking on that room/date.
  const selectionEndOptions = useMemo(() => {
    if (!selection) return []
    const maxEnd = bookingList
      .filter(
        (b) =>
          b.roomId === selection.room.id &&
          b.date === selection.date &&
          b.startMinutes > selection.startMinutes
      )
      .reduce((min, b) => Math.min(min, b.startMinutes), RESCHEDULE_DAY_END_MINUTES)
    const opts: number[] = []
    for (let m = selection.startMinutes + 10; m <= maxEnd; m += 10) {
      opts.push(m)
    }
    return opts
  }, [selection, bookingList])

  function handleBookedSlotClick(booking: Booking) {
    setInfoBooking(booking)
    setCoordinationMessage("")
    setCoordinationSubmitted(false)
  }

  function handleCancelBooking(bookingId: string) {
    setBookingList((prev) => prev.filter((b) => b.id !== bookingId))
    setInfoBooking(null)
  }

  function handleCancelRequest(requestId: string) {
    cancelBookingRequest(requestId)
    setActiveRequests((prev) => prev.filter((r) => r.id !== requestId))
    setInfoRequest(null)
  }

  /** "일정 변경": 기존 요청을 취소하고, 같은 값으로 예약 요청 화면을 다시 띄워 재요청하게 한다. */
  function handleEditRequest(request: MockBookingRequest) {
    const editRoom = rooms.find((r) => r.id === request.roomId)
    if (!editRoom) return

    const invitees = getInviteesForRequest(request.id)
    const ids = new Set<string>()
    for (const invitee of invitees) {
      if (invitee.email === MOCK_USER.email) {
        ids.add("me")
        continue
      }
      const person = people.find((p) => p.email === invitee.email)
      if (person) ids.add(person.id)
    }

    cancelBookingRequest(request.id)
    setActiveRequests((prev) => prev.filter((r) => r.id !== request.id))

    setSelectedRoomId(editRoom.id)
    setSelectedParticipantIds(ids)
    setMeetingPurpose(request.purpose)
    setMeetingVideoLink(request.videoLink ?? "")
    setRequestSubmitting(false)
    setRequestError(null)
    setInfoRequest(null)
    setSelection({
      room: editRoom,
      date: request.date,
      dateLabel: formatDayLabel(parseLocalDate(request.date)),
      startMinutes: request.startMinutes,
      endMinutes: request.endMinutes,
    })
  }

  function handleSubmitCoordinationRequest() {
    // Coordination requests aren't wired to a backend yet — this just
    // acknowledges the request locally, matching this app's other
    // "(준비 중)" placeholder actions.
    setCoordinationSubmitted(true)
  }

  function handleOpenReschedule(booking: Booking) {
    setInfoBooking(null)
    setReschedulingBooking(booking)
    setDraftDate(parseLocalDate(booking.date))
    setDraftStartMinutes(booking.startMinutes)
  }

  function handleConfirmReschedule() {
    if (!reschedulingBooking || !draftDate || draftStartMinutes === undefined) {
      return
    }
    const duration =
      reschedulingBooking.endMinutes - reschedulingBooking.startMinutes
    const newDate = formatLocalISODate(draftDate)
    setBookingList((prev) =>
      prev.map((b) =>
        b.id === reschedulingBooking.id
          ? {
              ...b,
              date: newDate,
              startMinutes: draftStartMinutes,
              endMinutes: draftStartMinutes + duration,
            }
          : b
      )
    )
    setReschedulingBooking(null)
  }

  function isOwnBooking(booking: Booking): boolean {
    return getOrganizer(booking)?.email === MOCK_USER.email
  }

  /** Earliest booking start after `afterMinute` for this room/date, capped at the day boundary — used to cap how long a new booking can run before it would overlap the next one. */
  function getMaxEndMinutes(roomId: string, date: string, afterMinute: number): number {
    return bookingList
      .filter(
        (b) => b.roomId === roomId && b.date === date && b.startMinutes > afterMinute
      )
      .reduce((min, b) => Math.min(min, b.startMinutes), RESCHEDULE_DAY_END_MINUTES)
  }

  function handleFreeSlotClick(room: Room, dateLabel: string, date: string, minute: number) {
    const maxEnd = getMaxEndMinutes(room.id, date, minute)
    setRequestSubmitting(false)
    setRequestError(null)
    setMeetingPurpose("")
    setMeetingVideoLink("")
    setSelection({
      room,
      date,
      dateLabel,
      startMinutes: minute,
      endMinutes: Math.min(minute + 30, maxEnd),
    })
  }

  function closeSelection() {
    setSelection(null)
    setRequestSubmitting(false)
    setRequestError(null)
  }

  async function handleSubmitBookingRequest() {
    const purpose = meetingPurpose.trim()
    if (!selection || selectedPeople.length === 0 || !purpose) return

    setRequestSubmitting(true)
    setRequestError(null)
    try {
      createBookingRequest({
        roomId: selection.room.id,
        roomName: selection.room.name,
        date: selection.date,
        startMinutes: selection.startMinutes,
        endMinutes: selection.endMinutes,
        title: `${selection.room.name} 예약 요청`,
        purpose,
        videoLink: meetingVideoLink,
        organizerEmail: MOCK_USER.email,
        organizerName: MOCK_USER.name,
        invitees: selectedPeople.map((person) => ({
          email: person.email,
          name: person.name,
        })),
      })
      closeSelection()
    } catch (err) {
      setRequestError(
        err instanceof Error ? err.message : "예약 요청을 보내지 못했습니다."
      )
    } finally {
      setRequestSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="grid w-full min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-10">
        <div className="flex h-full min-h-0 flex-col gap-4 lg:col-span-3">
          <h2 className="text-lg font-semibold tracking-tight">회의실 예약</h2>

          <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">회의실 선택</span>
              <Select
                value={room?.id}
                onValueChange={(value) => value && setSelectedRoomId(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="회의실 선택">
                    {(value: string) => {
                      const r = rooms.find((room) => room.id === value)
                      return r ? `${r.name} · ${r.capacity}인` : "회의실 선택"
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      <div className="flex w-full items-center justify-between gap-3">
                        <span>
                          {r.name} · {r.capacity}인
                        </span>
                        <Badge variant={r.hasMonitor ? "default" : "secondary"}>
                          모니터 {r.hasMonitor ? "있음" : "없음"}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3">
              <ParticipantPicker
                selectedTeam={selectedTeam}
                onTeamChange={handleTeamChange}
                search={participantSearch}
                onSearchChange={setParticipantSearch}
                selectedParticipantIds={selectedParticipantIds}
                onToggleParticipant={toggleParticipant}
              />
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-col lg:col-span-7">
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            {room ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <h2 className="text-lg font-semibold tracking-tight">스케줄 달력</h2>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="size-3 rounded-sm border border-border bg-background" />
                      예약 가능
                    </span>
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="size-3 rounded-sm bg-emerald-500/25" />
                      참석자 전원 가능
                    </span>
                  </div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col rounded-md border">
                  <div className="flex items-center justify-center border-b p-1.5">
                    <DateRangeNav dateRange={dateRange} onDateRangeChange={setDateRange} />
                  </div>

                  <ScrollArea className="min-h-0 w-full flex-1">
                    <div
                      className="grid w-max min-w-full"
                      style={{
                        gridTemplateColumns: `4.5rem repeat(${weekdays.length}, minmax(7rem, 1fr))`,
                      }}
                    >
                      {/* header row */}
                      <div className="sticky top-0 left-0 z-30 flex h-8 items-center justify-center border-r border-b bg-background text-xs font-medium text-muted-foreground">
                        시간
                      </div>
                      {weekdays.map((day) => (
                        <div
                          key={day.date}
                          className={cn(
                            "sticky top-0 z-20 flex h-8 items-center justify-center border-b bg-background text-xs font-medium",
                            day.date < todayISO && "text-muted-foreground/40"
                          )}
                        >
                          {day.label}
                        </div>
                      ))}

                    {/* time rows */}
                    {TIME_SLOTS.map((minute) => {
                      const showLabel = minute % 30 === 0
                      return (
                        <div key={`row-${minute}`} className="contents">
                          <div
                            className={cn(
                              "sticky left-0 z-10 flex h-5 items-center justify-end border-r bg-background pr-2 text-[10px]",
                              showLabel ? "text-muted-foreground" : "text-transparent"
                            )}
                          >
                            {minutesToLabel(minute)}
                          </div>
                          {weekdays.map((day) => {
                            const booking = findBooking(
                              bookingList,
                              room.id,
                              day.date,
                              minute
                            )

                            if (booking) {
                              const organizer = getOrganizer(booking)
                              const teamColor = organizer
                                ? TEAM_COLOR[organizer.team].block
                                : "bg-destructive/15 hover:bg-destructive/25"
                              const isFirstSlot = minute === booking.startMinutes
                              return (
                                <Tooltip key={`${day.date}-${minute}`}>
                                  <TooltipTrigger
                                    render={
                                      <button
                                        type="button"
                                        onClick={() => handleBookedSlotClick(booking)}
                                        className={cn(
                                          "relative h-5 border-r border-b border-border/60 transition-colors",
                                          teamColor
                                        )}
                                      >
                                        {isFirstSlot && (
                                          <span className="absolute inset-x-0 top-0 z-10 truncate px-1 text-left text-[9px] leading-[14px] font-medium text-foreground/80">
                                            {organizer?.team} {minutesToLabel(booking.startMinutes)}
                                            {"~"}
                                            {minutesToLabel(booking.endMinutes)}
                                          </span>
                                        )}
                                      </button>
                                    }
                                  />
                                  <TooltipContent>
                                    {booking.title} · {organizer?.team} · {organizer?.role}{" "}
                                    {organizer?.name} ·{" "}
                                    {minutesToLabel(booking.startMinutes)}
                                    {"~"}
                                    {minutesToLabel(booking.endMinutes)}
                                  </TooltipContent>
                                </Tooltip>
                              )
                            }

                            const activeRequest = findActiveRequest(
                              activeRequests,
                              day.date,
                              minute
                            )
                            if (activeRequest) {
                              const isFirstSlot =
                                minute === activeRequest.startMinutes
                              const requestTeam = getOrganizerTeamByEmail(
                                activeRequest.organizerEmail
                              )
                              const isPending = activeRequest.status === "pending"
                              const isMine =
                                activeRequest.organizerEmail === MOCK_USER.email
                              const cellClass = isPending
                                ? "bg-[repeating-linear-gradient(45deg,theme(colors.amber.400/25),theme(colors.amber.400/25)_4px,transparent_4px,transparent_8px)]"
                                : requestTeam
                                  ? isMine
                                    ? TEAM_COLOR[requestTeam].blockMine
                                    : TEAM_COLOR[requestTeam].block
                                  : "bg-destructive/15 hover:bg-destructive/25"
                              return (
                                <Tooltip key={`${day.date}-${minute}`}>
                                  <TooltipTrigger
                                    render={
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setInfoRequest(activeRequest)
                                        }
                                        className={cn(
                                          "relative h-5 border-r border-b border-border/60 transition-colors",
                                          cellClass
                                        )}
                                      >
                                        {isFirstSlot && (
                                          <span
                                            className={cn(
                                              "absolute inset-x-0 top-0 z-10 truncate px-1 text-left text-[9px] leading-[14px] font-medium",
                                              isPending
                                                ? "text-amber-800 dark:text-amber-300"
                                                : "text-foreground/80",
                                              isMine && "font-bold text-foreground"
                                            )}
                                          >
                                            {isPending ? "대기중 · " : ""}
                                            {isMine ? "내 예약" : requestTeam ?? activeRequest.organizerName}{" "}
                                            {minutesToLabel(activeRequest.startMinutes)}
                                            {"~"}
                                            {minutesToLabel(activeRequest.endMinutes)}
                                          </span>
                                        )}
                                      </button>
                                    }
                                  />
                                  <TooltipContent>
                                    {activeRequest.purpose} · {requestTeam}{" "}
                                    {activeRequest.organizerName} ·{" "}
                                    {isPending ? "응답 대기중" : "확정됨"} ·{" "}
                                    {minutesToLabel(activeRequest.startMinutes)}
                                    {"~"}
                                    {minutesToLabel(activeRequest.endMinutes)}
                                  </TooltipContent>
                                </Tooltip>
                              )
                            }

                            const allAvailable = isAllAvailable(day.date, minute)
                            const isPast = day.date < todayISO
                            return (
                              <button
                                key={`${day.date}-${minute}`}
                                type="button"
                                disabled={isPast}
                                title={isPast ? "지난 날짜는 예약할 수 없습니다" : undefined}
                                onClick={() =>
                                  handleFreeSlotClick(
                                    room,
                                    day.label,
                                    day.date,
                                    minute
                                  )
                                }
                                className={cn(
                                  "h-5 border-r border-b border-border/60 transition-colors",
                                  isPast
                                    ? "cursor-not-allowed bg-muted/50"
                                    : cn(
                                        "hover:bg-primary/10",
                                        allAvailable ? "bg-emerald-500/15" : "bg-background"
                                      )
                                )}
                              />
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
                </div>
              </>
            ) : (
              <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                조건에 맞는 회의실이 없습니다.
              </p>
            )}
          </div>
        </div>
      </div>

      <Dialog
        open={infoBooking !== null}
        onOpenChange={(open) => !open && setInfoBooking(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>예약 정보</DialogTitle>
          </DialogHeader>

          {infoBooking && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">{infoBooking.title}</span>
                <span className="text-sm text-muted-foreground">
                  {infoBooking.purpose}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-sm">
                <Badge variant="outline">{getOrganizer(infoBooking)?.team}</Badge>
                <span className="font-medium">{getOrganizer(infoBooking)?.name}</span>
                <span className="text-xs text-muted-foreground">예약자</span>
              </div>

              <p className="text-sm text-muted-foreground">
                {rooms.find((r) => r.id === infoBooking.roomId)?.name} ·{" "}
                {formatDayLabel(parseLocalDate(infoBooking.date))} ·{" "}
                {minutesToLabel(infoBooking.startMinutes)}
                {"~"}
                {minutesToLabel(infoBooking.endMinutes)}
              </p>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  참석자 (팀원)
                </span>
                <div className="flex flex-col gap-1 rounded-md border p-1.5">
                  {getAttendees(infoBooking).map((person) => (
                    <div
                      key={person.id}
                      className="flex items-center gap-2.5 rounded-md p-1.5"
                    >
                      <span className="flex flex-1 flex-col">
                        <span className="text-sm font-medium">{person.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {person.email}
                        </span>
                      </span>
                      <Badge variant="outline">{person.role}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {!isOwnBooking(infoBooking) && (
                <div className="flex flex-col gap-1.5 border-t pt-3">
                  <span className="text-xs font-medium text-muted-foreground">
                    타 팀 예약이므로 직접 취소/변경할 수 없습니다. 조율이 필요하면
                    예약자에게 요청을 보내세요.
                  </span>
                  {coordinationSubmitted ? (
                    <p className="text-sm text-primary">
                      조율 신청을 보냈습니다. (준비 중 — 실제 알림 발송은 추후
                      제공됩니다)
                    </p>
                  ) : (
                    <Textarea
                      placeholder="예: 같은 시간대에 급한 임원 보고가 있어 양해 부탁드립니다."
                      value={coordinationMessage}
                      onChange={(e) => setCoordinationMessage(e.target.value)}
                      rows={3}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {infoBooking && isOwnBooking(infoBooking) ? (
              <>
                <Button
                  variant="destructive"
                  onClick={() => handleCancelBooking(infoBooking.id)}
                >
                  예약 취소
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleOpenReschedule(infoBooking)}
                >
                  일정 변경
                </Button>
              </>
            ) : (
              !coordinationSubmitted && (
                <Button onClick={handleSubmitCoordinationRequest}>
                  예약 조율 신청
                </Button>
              )
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={infoRequest !== null}
        onOpenChange={(open) => !open && setInfoRequest(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {infoRequest?.status === "pending" ? "예약 요청 정보" : "예약 확정 정보"}
            </DialogTitle>
          </DialogHeader>

          {infoRequest && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">{infoRequest.purpose}</span>
                <span className="text-sm text-muted-foreground">
                  {infoRequest.status === "pending" ? "응답 대기중" : "예약 확정됨"}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-sm">
                {getOrganizerTeamByEmail(infoRequest.organizerEmail) && (
                  <Badge variant="outline">
                    {getOrganizerTeamByEmail(infoRequest.organizerEmail)}
                  </Badge>
                )}
                <span className="font-medium">{infoRequest.organizerName}</span>
                <span className="text-xs text-muted-foreground">예약자</span>
              </div>

              <p className="text-sm text-muted-foreground">
                {infoRequest.roomName} ·{" "}
                {formatDayLabel(parseLocalDate(infoRequest.date))} ·{" "}
                {minutesToLabel(infoRequest.startMinutes)}
                {"~"}
                {minutesToLabel(infoRequest.endMinutes)}
              </p>

              {infoRequest.videoLink && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  nativeButton={false}
                  render={
                    <a
                      href={infoRequest.videoLink}
                      target="_blank"
                      rel="noreferrer"
                    />
                  }
                >
                  <Video className="size-4" />
                  화상으로 참석
                </Button>
              )}

              {infoRequest.organizerEmail !== MOCK_USER.email && (
                <p className="text-xs text-muted-foreground">
                  다른 사람이 예약한 요청이라 직접 취소할 수 없습니다.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            {infoRequest && infoRequest.organizerEmail === MOCK_USER.email && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => handleCancelRequest(infoRequest.id)}
                >
                  {infoRequest.status === "pending" ? "요청 취소" : "예약 취소"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleEditRequest(infoRequest)}
                >
                  일정 변경
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={reschedulingBooking !== null}
        onOpenChange={(open) => !open && setReschedulingBooking(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>일정 변경</DialogTitle>
            <DialogDescription>
              {reschedulingBooking && (
                <>
                  {rooms.find((r) => r.id === reschedulingBooking.roomId)?.name} ·
                  현재: {formatDayLabel(parseLocalDate(reschedulingBooking.date))}{" "}
                  {minutesToLabel(reschedulingBooking.startMinutes)}
                  {"~"}
                  {minutesToLabel(reschedulingBooking.endMinutes)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {reschedulingBooking && (
            <div className="flex flex-col gap-4">
              <Calendar
                mode="single"
                selected={draftDate}
                onSelect={(date) => date && setDraftDate(date)}
                defaultMonth={parseLocalDate(reschedulingBooking.date)}
              />

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  새 시작 시간
                </span>
                <Select
                  value={
                    draftStartMinutes !== undefined
                      ? String(draftStartMinutes)
                      : undefined
                  }
                  onValueChange={(value) =>
                    value && setDraftStartMinutes(Number(value))
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue>
                      {(value: string) => minutesToLabel(Number(value))}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {rescheduleTimeOptions.map((minute) => (
                      <SelectItem key={minute} value={String(minute)}>
                        {minutesToLabel(minute)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>취소</DialogClose>
            <Button
              disabled={!draftDate || draftStartMinutes === undefined}
              onClick={handleConfirmReschedule}
            >
              변경 확정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={selection !== null}
        onOpenChange={(open) => !open && closeSelection()}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>예약 요청</DialogTitle>
            <DialogDescription>
              참석자에게 예약 요청을 보내고, 전원이 수락하면 예약이 확정됩니다.
            </DialogDescription>
          </DialogHeader>

          {selection && (
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1 rounded-md border bg-muted/40 p-2 text-sm">
                  <p>
                    회의실: <span className="font-semibold">{selection.room.name}</span>
                  </p>
                  <p>
                    날짜/시간:{" "}
                    <span className="font-semibold">
                      {selection.dateLabel} · {minutesToLabel(selection.startMinutes)}
                      {"~"}
                      {minutesToLabel(selection.endMinutes)}
                    </span>
                  </p>
                  <p>
                    예약자:{" "}
                    <span className="font-semibold">
                      {MOCK_USER.name} ({MOCK_USER.email})
                    </span>
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    회의 목적 <span className="text-destructive">*</span>
                  </span>
                  <Input
                    type="text"
                    placeholder="예: 주간 스프린트 회고 (필수)"
                    value={meetingPurpose}
                    onChange={(e) => setMeetingPurpose(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    화상 회의 링크 (선택)
                  </span>
                  <Input
                    type="url"
                    placeholder="예: https://meet.google.com/xxx-xxxx-xxx"
                    value={meetingVideoLink}
                    onChange={(e) => setMeetingVideoLink(e.target.value)}
                  />
                </div>

                <div className="flex items-end gap-2">
                  <div className="flex flex-1 flex-col gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      시작 시간
                    </span>
                    <Select
                      value={String(selection.startMinutes)}
                      onValueChange={(value) =>
                        value &&
                        setSelection((prev) =>
                          prev ? { ...prev, startMinutes: Number(value) } : prev
                        )
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {(value: string) => minutesToLabel(Number(value))}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {selectionStartOptions.map((minute) => (
                          <SelectItem key={minute} value={String(minute)}>
                            {minutesToLabel(minute)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <span className="pb-2 text-sm text-muted-foreground">~</span>

                  <div className="flex flex-1 flex-col gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      종료 시간
                    </span>
                    <Select
                      value={String(selection.endMinutes)}
                      onValueChange={(value) =>
                        value &&
                        setSelection((prev) =>
                          prev ? { ...prev, endMinutes: Number(value) } : prev
                        )
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {(value: string) => minutesToLabel(Number(value))}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {selectionEndOptions.map((minute) => (
                          <SelectItem key={minute} value={String(minute)}>
                            {minutesToLabel(minute)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <p className="text-sm font-medium">참석자 일정 확인</p>
                {selectedPeople.length === 0 ? (
                  <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                    좌측에서 참석자를 먼저 선택하세요.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1 rounded-md border p-1.5">
                    {selectedPeople.map((person) => {
                      const status = getAvailability(
                        person.id,
                        selection.date,
                        selection.startMinutes
                      )
                      return (
                        <div
                          key={person.id}
                          className="flex items-center gap-2.5 rounded-md p-1.5"
                        >
                          <span className="flex flex-1 flex-col">
                            <span className="flex items-center gap-1.5 text-sm font-medium">
                              {person.name}
                              {person.role && (
                                <Badge variant="outline">{person.role}</Badge>
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {person.email}
                            </span>
                          </span>
                          <Badge
                            className={cn(
                              "border-transparent",
                              AVAILABILITY_BADGE_CLASS[status]
                            )}
                          >
                            {AVAILABILITY_LABEL[status]}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                )}
                {requestError && (
                  <p className="text-sm text-destructive">{requestError}</p>
                )}
                {selectedPeople.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    참석자를 선택해야 요청을 보낼 수 있습니다.
                  </p>
                )}
              </div>
          )}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              취소
            </DialogClose>
            <Button
              disabled={
                selectedPeople.length === 0 ||
                !meetingPurpose.trim() ||
                requestSubmitting
              }
              onClick={handleSubmitBookingRequest}
            >
              {requestSubmitting ? "요청 보내는 중..." : "예약 요청"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
