"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatDayLabel } from "@/lib/mock-data"

const REJECT_REASONS = [
  "다른 일정과 겹침",
  "회의 목적과 맞지 않음",
  "직접 참석이 어려움",
  "기타",
]

type InboxInvitee = {
  id: string
  requestId: string
  email: string
  name: string
  status: string
  rejectReason: string | null
  respondedAt: string | null
  request: {
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
    status: string
    createdAt: string
  }
}

function minutesToLabel(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

/** Parses an ISO date string ("YYYY-MM-DD") into a local Date, matching mock-data's date formatting. */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export default function RequestsPage() {
  const { status } = useSession()
  const [invites, setInvites] = useState<InboxInvitee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState<string>("")

  // No setState before the first `await` here, so this is safe to call
  // directly from the mount effect below (as well as from the manual
  // refresh button).
  const fetchInbox = useCallback(async () => {
    try {
      const res = await fetch("/api/booking-requests/inbox")
      if (!res.ok) {
        throw new Error("받은 요청을 불러오지 못했습니다.")
      }
      const data = (await res.json()) as InboxInvitee[]
      setInvites(data)
      setError(null)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "받은 요청을 불러오지 못했습니다."
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status !== "authenticated") return

    let ignore = false
    async function loadInbox() {
      try {
        const res = await fetch("/api/booking-requests/inbox")
        if (!res.ok) {
          throw new Error("받은 요청을 불러오지 못했습니다.")
        }
        const data = (await res.json()) as InboxInvitee[]
        if (!ignore) {
          setInvites(data)
          setError(null)
        }
      } catch (err) {
        if (!ignore) {
          setError(
            err instanceof Error ? err.message : "받은 요청을 불러오지 못했습니다."
          )
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    loadInbox()

    return () => {
      ignore = true
    }
  }, [status])

  function handleRefresh() {
    setLoading(true)
    fetchInbox()
  }

  async function respond(
    inviteeId: string,
    body: { status: "accepted" | "rejected"; rejectReason?: string }
  ) {
    setRespondingId(inviteeId)
    setError(null)
    try {
      const res = await fetch(
        `/api/booking-requests/invitees/${inviteeId}/respond`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      )
      if (!res.ok) {
        throw new Error("응답을 처리하지 못했습니다.")
      }
      setInvites((prev) => prev.filter((invite) => invite.id !== inviteeId))
      setRejectingId(null)
      setRejectReason("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "응답을 처리하지 못했습니다.")
    } finally {
      setRespondingId(null)
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-8 py-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-muted-foreground">
              미팅 예약 시스템
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">받은 요청</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="outline">← 회의실 선택</Button>
            </Link>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={loading || status !== "authenticated"}
            >
              새로고침
            </Button>
          </div>
        </header>

        {status === "loading" && (
          <p className="text-sm text-muted-foreground">불러오는 중...</p>
        )}

        {status === "unauthenticated" && (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            로그인이 필요합니다.
          </p>
        )}

        {status === "authenticated" && (
          <>
            {error && <p className="text-sm text-destructive">{error}</p>}

            {!loading && invites.length === 0 && !error && (
              <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                받은 요청이 없습니다.
              </p>
            )}

            <div className="flex flex-col gap-3">
              {invites.map((invite) => {
                const { request } = invite
                const isBusy = respondingId === invite.id
                const isRejecting = rejectingId === invite.id

                return (
                  <div
                    key={invite.id}
                    className="flex flex-col gap-2 rounded-md border p-4"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold">
                        {request.title}
                      </span>
                      <Badge variant="outline">{request.roomName}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDayLabel(parseLocalDate(request.date))} ·{" "}
                      {minutesToLabel(request.startMinutes)}
                      {"~"}
                      {minutesToLabel(request.endMinutes)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      목적: {request.purpose}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      예약자: {request.organizerName} ({request.organizerEmail})
                    </p>

                    {isRejecting ? (
                      <div className="flex flex-wrap items-center gap-2 border-t pt-2">
                        <Select
                          value={rejectReason || undefined}
                          onValueChange={(value) =>
                            value && setRejectReason(value as string)
                          }
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="거절 사유 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {REJECT_REASONS.map((reason) => (
                              <SelectItem key={reason} value={reason}>
                                {reason}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="destructive"
                          disabled={!rejectReason || isBusy}
                          onClick={() =>
                            respond(invite.id, {
                              status: "rejected",
                              rejectReason,
                            })
                          }
                        >
                          거절 확정
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setRejectingId(null)
                            setRejectReason("")
                          }}
                        >
                          취소
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 border-t pt-2">
                        <Button
                          disabled={isBusy}
                          onClick={() => respond(invite.id, { status: "accepted" })}
                        >
                          수락
                        </Button>
                        <Button
                          variant="outline"
                          disabled={isBusy}
                          onClick={() => {
                            setRejectingId(invite.id)
                            setRejectReason("")
                          }}
                        >
                          거절
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
