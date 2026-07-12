"use client"

import Link from "next/link"
import { useParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { RoomSchedule } from "@/components/room-schedule"
import { UserMenu } from "@/components/user-menu"
import { rooms } from "@/lib/mock-data"

export default function SchedulePage() {
  const { roomId } = useParams<{ roomId: string }>()
  const room = rooms.find((r) => r.id === roomId)

  if (!room) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-black">
        <p className="text-sm text-muted-foreground">회의실을 찾을 수 없습니다.</p>
        <Link href="/">
          <Button variant="outline">회의실 선택으로 돌아가기</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="flex w-full flex-1 flex-col gap-6 px-8 py-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-muted-foreground">미팅 예약 시스템</p>
            <h1 className="text-2xl font-semibold tracking-tight">{room.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="outline">← 회의실 변경</Button>
            </Link>
            <UserMenu />
          </div>
        </header>

        <RoomSchedule room={room} />
      </main>
    </div>
  )
}
