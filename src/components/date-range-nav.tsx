"use client"

import { useState } from "react"
import { addDays } from "date-fns"
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import type { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { formatDayLabel } from "@/lib/mock-data"

function formatRangeLabel(range: DateRange | undefined): string {
  if (!range?.from || !range?.to) return "날짜를 선택하세요"
  return `${formatDayLabel(range.from)} ~ ${formatDayLabel(range.to)}`
}

function shiftRange(
  range: DateRange | undefined,
  days: number
): DateRange | undefined {
  if (!range?.from || !range?.to) return range
  return { from: addDays(range.from, days), to: addDays(range.to, days) }
}

type DateRangeNavProps = {
  dateRange: DateRange | undefined
  onDateRangeChange: (range: DateRange | undefined) => void
}

export function DateRangeNav({ dateRange, onDateRangeChange }: DateRangeNavProps) {
  // The calendar's own selection (including the mid-selection state where
  // only the start date has been picked) is tracked locally so the grid's
  // day columns only update once a full range is committed. Reset to the
  // committed range each time the popover opens.
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(dateRange)

  function handlePopoverOpenChange(open: boolean) {
    if (open) {
      setDraftRange(dateRange)
    }
  }

  function handleCalendarSelect(next: DateRange | undefined) {
    setDraftRange(next)
    if (next?.from && next?.to) {
      onDateRangeChange(next)
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        title="1주일 전"
        aria-label="1주일 전"
        onClick={() => onDateRangeChange(shiftRange(dateRange, -7))}
      >
        <ChevronsLeft />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        title="1일 전"
        aria-label="1일 전"
        onClick={() => onDateRangeChange(shiftRange(dateRange, -1))}
      >
        <ChevronLeft />
      </Button>

      <Popover onOpenChange={handlePopoverOpenChange}>
        <PopoverTrigger
          render={
            <Button type="button" variant="ghost" className="justify-start">
              <CalendarIcon />
              {formatRangeLabel(dateRange)}
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="range"
            selected={draftRange}
            onSelect={handleCalendarSelect}
            defaultMonth={dateRange?.from}
          />
        </PopoverContent>
      </Popover>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        title="1일 후"
        aria-label="1일 후"
        onClick={() => onDateRangeChange(shiftRange(dateRange, 1))}
      >
        <ChevronRight />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        title="1주일 후"
        aria-label="1주일 후"
        onClick={() => onDateRangeChange(shiftRange(dateRange, 7))}
      >
        <ChevronsRight />
      </Button>
    </div>
  )
}
