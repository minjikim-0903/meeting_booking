"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CalendarClock,
  DoorOpen,
  Inbox,
  Settings,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

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
  { label: "설정", href: "#", icon: Settings, disabled: true },
]

export function SidebarNav() {
  const pathname = usePathname()

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
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
