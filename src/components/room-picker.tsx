"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Minus, Plus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { rooms } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

type VideoFilter = "all" | "yes" | "no"

const VIDEO_FILTER_LABEL: Record<VideoFilter, string> = {
  all: "전체",
  yes: "있음",
  no: "없음",
}

const MAX_CAPACITY = Math.max(...rooms.map((room) => room.capacity))

export function RoomPicker() {
  const router = useRouter()
  const [videoFilter, setVideoFilter] = useState<VideoFilter>("all")
  const [minCapacity, setMinCapacity] = useState(1)

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      if (room.capacity < minCapacity) return false
      if (videoFilter === "yes" && !room.hasVideoEquipment) return false
      if (videoFilter === "no" && room.hasVideoEquipment) return false
      return true
    })
  }, [videoFilter, minCapacity])

  function goToRoom(roomId: string) {
    router.push(`/schedule/${roomId}`)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4 rounded-md border p-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            최소 수용인원
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={minCapacity <= 1}
              onClick={() => setMinCapacity((v) => Math.max(1, v - 1))}
            >
              <Minus />
            </Button>
            <span className="w-8 text-center text-sm font-medium tabular-nums">
              {minCapacity}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={minCapacity >= MAX_CAPACITY}
              onClick={() => setMinCapacity((v) => Math.min(MAX_CAPACITY, v + 1))}
            >
              <Plus />
            </Button>
            <span className="text-sm text-muted-foreground">명 이상</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">화상장비</span>
          <Select
            value={videoFilter}
            onValueChange={(value) => value && setVideoFilter(value as VideoFilter)}
          >
            <SelectTrigger className="w-28">
              <SelectValue>
                {(value: VideoFilter) => VIDEO_FILTER_LABEL[value]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="yes">있음</SelectItem>
              <SelectItem value="no">없음</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredRooms.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          조건에 맞는 회의실이 없습니다.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRooms.map((room) => (
            <div
              key={room.id}
              role="button"
              tabIndex={0}
              onClick={() => goToRoom(room.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  goToRoom(room.id)
                }
              }}
              className={cn(
                "flex cursor-pointer flex-col gap-2 rounded-md border p-3 transition-colors hover:bg-muted/50"
              )}
            >
              <span className="text-sm font-semibold">{room.name}</span>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">수용인원 {room.capacity}인</Badge>
                <Badge variant="outline">위치 {room.location}</Badge>
                <Badge variant={room.hasVideoEquipment ? "default" : "secondary"}>
                  화상장비 {room.hasVideoEquipment ? "있음" : "없음"}
                </Badge>
                <Badge variant={room.hasMonitor ? "default" : "secondary"}>
                  모니터 {room.hasMonitor ? "있음" : "없음"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
