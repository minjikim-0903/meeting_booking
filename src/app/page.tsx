import { RoomPicker } from "@/components/room-picker"
import { UserMenu } from "@/components/user-menu"

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="flex w-full flex-1 flex-col gap-6 px-8 py-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-muted-foreground">미팅 예약 시스템</p>
            <h1 className="text-2xl font-semibold tracking-tight">회의실 선택</h1>
          </div>
          <UserMenu />
        </header>

        <RoomPicker />
      </main>
    </div>
  )
}
