"use client"

import { useEffect, useState } from "react"
import { Video } from "lucide-react"

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
import {
  getInboxForEmail,
  getRespondedInvitesForEmail,
  respondToInvitee,
  type InboxItem,
} from "@/lib/mock-booking-store"
import { MOCK_USER } from "@/lib/mock-session"

const REJECT_REASONS = [
  "다른 일정과 겹침",
  "회의 목적과 맞지 않음",
  "직접 참석이 어려움",
  "기타",
]

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
  // localStorage 목업 데이터는 서버에 없으므로, 초기값은 빈 배열로 두고
  // 마운트 이후(useEffect)에 클라이언트에서만 채운다 — 그렇지 않으면 서버
  // 렌더링(빈 목록)과 클라이언트 첫 렌더링(실제 값) 결과가 달라 hydration
  // 오류가 난다.
  const [invites, setInvites] = useState<InboxItem[]>([])
  const [pastInvites, setPastInvites] = useState<InboxItem[]>([])
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState<string>("")

  function handleRefresh() {
    setInvites(getInboxForEmail(MOCK_USER.email))
    setPastInvites(getRespondedInvitesForEmail(MOCK_USER.email))
  }

  useEffect(() => {
    // localStorage는 클라이언트에만 존재하므로 마운트 후 한 번만 읽어온다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    handleRefresh()
  }, [])

  function respond(
    inviteeId: string,
    body: { status: "accepted" | "rejected"; rejectReason?: string }
  ) {
    respondToInvitee(inviteeId, body.status, body.rejectReason)
    setInvites((prev) => prev.filter((invite) => invite.id !== inviteeId))
    setPastInvites(getRespondedInvitesForEmail(MOCK_USER.email))
    setRejectingId(null)
    setRejectReason("")
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-lg font-semibold tracking-tight">받은 요청</h1>
        <Button variant="outline" onClick={handleRefresh}>
          새로고침
        </Button>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          요청 온 미팅
        </h2>

        {invites.length === 0 && (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            응답을 기다리는 요청이 없습니다.
          </p>
        )}

        <div className="flex flex-col gap-3">
          {invites.map((invite) => {
            const { request } = invite
            const isRejecting = rejectingId === invite.id

            return (
              <div
                key={invite.id}
                className="flex flex-col gap-2 rounded-md border p-4"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-base font-semibold">
                    {request.purpose}
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
                  예약자: {request.organizerName} ({request.organizerEmail})
                </p>
                {request.videoLink && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    nativeButton={false}
                    render={
                      <a href={request.videoLink} target="_blank" rel="noreferrer" />
                    }
                  >
                    <Video className="size-4" />
                    화상으로 참석
                  </Button>
                )}

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
                      disabled={!rejectReason}
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
                      onClick={() => respond(invite.id, { status: "accepted" })}
                    >
                      수락
                    </Button>
                    <Button
                      variant="outline"
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
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          지난 미팅
        </h2>

        {pastInvites.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            수락하거나 거절한 요청이 없습니다.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {pastInvites.map((invite) => {
              const { request } = invite
              const isRejecting = rejectingId === invite.id
              return (
                <div
                  key={invite.id}
                  className="flex flex-col gap-2 rounded-md border p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-base font-semibold">
                        {request.purpose}
                      </span>
                      <Badge variant="outline">{request.roomName}</Badge>
                      <Badge
                        variant={
                          invite.status === "accepted" ? "default" : "secondary"
                        }
                      >
                        {invite.status === "accepted" ? "수락함" : "거절함"}
                      </Badge>
                    </div>

                    {!isRejecting &&
                      (invite.status === "accepted" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRejectingId(invite.id)
                            setRejectReason("")
                          }}
                        >
                          거절로 변경
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            respond(invite.id, { status: "accepted" })
                          }
                        >
                          수락으로 변경
                        </Button>
                      ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDayLabel(parseLocalDate(request.date))} ·{" "}
                    {minutesToLabel(request.startMinutes)}
                    {"~"}
                    {minutesToLabel(request.endMinutes)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    예약자: {request.organizerName} ({request.organizerEmail})
                  </p>
                  {request.videoLink && invite.status === "accepted" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-fit"
                      nativeButton={false}
                      render={
                        <a
                          href={request.videoLink}
                          target="_blank"
                          rel="noreferrer"
                        />
                      }
                    >
                      <Video className="size-4" />
                      화상으로 참석
                    </Button>
                  )}
                  {invite.status === "rejected" && invite.rejectReason && (
                    <p className="text-sm text-muted-foreground">
                      거절 사유: {invite.rejectReason}
                    </p>
                  )}

                  {isRejecting && (
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
                        disabled={!rejectReason}
                        onClick={() =>
                          respond(invite.id, {
                            status: "rejected",
                            rejectReason,
                          })
                        }
                      >
                        거절로 변경 확정
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
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
