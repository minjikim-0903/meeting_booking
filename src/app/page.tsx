"use client"

import { RoomSchedule } from "@/components/room-schedule"
import { SidebarNav } from "@/components/sidebar-nav"

export default function Home() {
  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden bg-white">
      <SidebarNav />

      <main className="flex min-h-0 w-full flex-1 flex-col gap-4 overflow-hidden px-8 py-6">
        <RoomSchedule />
      </main>
    </div>
  )
}
