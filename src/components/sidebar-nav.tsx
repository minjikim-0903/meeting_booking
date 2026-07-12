"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Building2,
  CalendarClock,
  DoorOpen,
  Inbox,
  Settings,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getInboxForEmail, STORE_UPDATED_EVENT } from "@/lib/mock-booking-store"
import { MOCK_USER } from "@/lib/mock-session"

type MenuItem = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  disabled?: boolean
}

const MENU_ITEMS: MenuItem[] = [
  { label: "회의실 예약", href: "/", icon: DoorOpen },
  { label: "받은 요청", href: "/requests", icon: Inbox },
  { label: "예약 내역", href: "#", icon: CalendarClock, disabled: true },
  { label: "팀 관리", href: "#", icon: Users, disabled: true },
  { label: "회의실 관리", href: "#", icon: Building2, disabled: true },
  { label: "설정", href: "#", icon: Settings, disabled: true },
]

export function SidebarNav() {
  const pathname = usePathname()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    function refresh() {
      setPendingCount(getInboxForEmail(MOCK_USER.email).length)
    }
    refresh()
    window.addEventListener(STORE_UPDATED_EVENT, refresh)
    return () => window.removeEventListener(STORE_UPDATED_EVENT, refresh)
  }, [])

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col gap-1 overflow-hidden border-r bg-background p-4">
      <p className="px-2 pb-3 text-sm font-semibold tracking-tight">
        미팅 예약 시스템
      </p>

      <nav className="flex flex-col gap-1">
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href

          if (item.disabled) {
            return (
              <span
                key={item.label}
                className="flex cursor-not-allowed items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground/50"
              >
                <span className="flex items-center gap-2">
                  <Icon className="size-4" />
                  {item.label}
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  준비 중
                </Badge>
              </span>
            )
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted",
                active
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="size-4" />
              <span className="flex-1">{item.label}</span>
              {item.label === "받은 요청" && pendingCount > 0 && (
                <span className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-white">
                  {pendingCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto border-t pt-3">
        <div className="flex items-center gap-2 px-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {MOCK_USER.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium">{MOCK_USER.name}</span>
            <span className="truncate text-xs text-muted-foreground">
              {MOCK_USER.email}
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}
