"use client"

import { useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import type { DateRange } from "react-day-picker"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
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

function getOrganizer(booking: Booking): Person | undefined {
  return people.find((p) => p.id === booking.organizerId)
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
  timeLabel: string
  startMinutes: number
  endMinutes: number
}

/** A selectable invitee: either a mock `Person` or the synthetic "me" (logged-in session user), which has no `Team`/`Role`. */
type Invitee = Omit<Person, "team" | "role"> & { team?: Team; role?: Role }

export function RoomSchedule() {
  const { data: session } = useSession()
  const [selectedRoomId, setSelectedRoomId] = useState(rooms[0]?.id)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() =>
    getDefaultDateRange()
  )
  const [selection, setSelection] = useState<SlotSelection | null>(null)
  const [bookingList, setBookingList] = useState<Booking[]>(() => seedBookings)
  const [infoBooking, setInfoBooking] = useState<Booking | null>(null)
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
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<
    Set<string>
  >(() => new Set())

  const selectedPeople = useMemo<Invitee[]>(() => {
    const selected: Invitee[] = people.filter((person) =>
      selectedParticipantIds.has(person.id)
    )
    if (selectedParticipantIds.has("me") && session?.user) {
      selected.push({
        id: "me",
        name: session.user.name ?? session.user.email ?? "나",
        email: session.user.email ?? "",
      })
    }
    return selected
  }, [selectedParticipantIds, session])

  const [requestSubmitting, setRequestSubmitting] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [requestSent, setRequestSent] = useState(false)

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

  const weekdays = useMemo(() => {
    if (dateRange?.from && dateRange?.to) {
      return getDateRangeDays(dateRange.from, dateRange.to)
    }
    return getNextWeekdays()
  }, [dateRange])

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

  function handleBookedSlotClick(booking: Booking) {
    setInfoBooking(booking)
    setCoordinationMessage("")
    setCoordinationSubmitted(false)
  }

  function handleCancelBooking(bookingId: string) {
    setBookingList((prev) => prev.filter((b) => b.id !== bookingId))
    setInfoBooking(null)
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
    if (!session?.user?.email) return false
    return getOrganizer(booking)?.email === session.user.email
  }

  function handleFreeSlotClick(room: Room, dateLabel: string, date: string, minute: number) {
    const timeLabel = `${minutesToLabel(minute)} ~ ${minutesToLabel(minute + 10)}`
    setRequestSubmitting(false)
    setRequestError(null)
    setRequestSent(false)
    setSelection({
      room,
      date,
      dateLabel,
      timeLabel,
      startMinutes: minute,
      endMinutes: minute + 10,
    })
  }

  function closeSelection() {
    setSelection(null)
    setRequestSubmitting(false)
    setRequestError(null)
    setRequestSent(false)
  }

  async function handleSubmitBookingRequest() {
    if (!selection || !session?.user || selectedPeople.length === 0) return

    setRequestSubmitting(true)
    setRequestError(null)
    try {
      const res = await fetch("/api/booking-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: selection.room.id,
          roomName: selection.room.name,
          date: selection.date,
          startMinutes: selection.startMinutes,
          endMinutes: selection.endMinutes,
          title: `${selection.room.name} 예약 요청`,
          purpose: "회의",
          invitees: selectedPeople.map((person) => ({
            email: person.email,
            name: person.name,
          })),
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(
          (data as { error?: string } | null)?.error ??
            "예약 요청을 보내지 못했습니다."
        )
      }

      setRequestSent(true)
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
                        <span className="flex items-center gap-1">
                          <Badge variant={r.hasMonitor ? "default" : "secondary"}>
                            모니터 {r.hasMonitor ? "있음" : "없음"}
                          </Badge>
                          <Badge variant={r.hasVideoEquipment ? "default" : "secondary"}>
                            화상 {r.hasVideoEquipment ? "가능" : "불가"}
                          </Badge>
                        </span>
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
                          className="sticky top-0 z-20 flex h-8 items-center justify-center border-b bg-background text-xs font-medium"
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

                            const allAvailable = isAllAvailable(day.date, minute)
                            return (
                              <button
                                key={`${day.date}-${minute}`}
                                type="button"
                                onClick={() =>
                                  handleFreeSlotClick(
                                    room,
                                    day.label,
                                    day.date,
                                    minute
                                  )
                                }
                                className={cn(
                                  "h-5 border-r border-b border-border/60 transition-colors hover:bg-primary/10",
                                  allAvailable ? "bg-emerald-500/15" : "bg-background"
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
              {selection && (
                <>
                  {selection.room.name} · {selection.dateLabel} · {selection.timeLabel}
                  <br />
                  참석자에게 예약 요청을 보내고, 전원이 수락하면 예약이 확정됩니다.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selection && requestSent ? (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-primary">
              예약 요청을 보냈습니다.
            </p>
          ) : (
            selection && (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">
                  {session?.user
                    ? `예약자: ${session.user.name} (${session.user.email})`
                    : "예약자: 로그인이 필요합니다"}
                </p>
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
                {!(session?.user && selectedPeople.length > 0) && (
                  <p className="text-xs text-muted-foreground">
                    로그인하고 참석자를 선택해야 요청을 보낼 수 있습니다.
                  </p>
                )}
              </div>
            )
          )}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              {requestSent ? "닫기" : "취소"}
            </DialogClose>
            {!requestSent && (
              <Button
                disabled={
                  !session?.user ||
                  selectedPeople.length === 0 ||
                  requestSubmitting
                }
                onClick={handleSubmitBookingRequest}
              >
                {requestSubmitting ? "요청 보내는 중..." : "예약 요청"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
