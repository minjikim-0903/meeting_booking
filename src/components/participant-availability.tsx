"use client"

import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { WeekDay } from "@/lib/mock-data"
import {
  getAvailability,
  people,
  type AvailabilityStatus,
  type Person,
  type Team,
} from "@/lib/mock-participants"
import { cn } from "@/lib/utils"

const ALL_TEAMS = "전체"

const TEAMS: Team[] = ["프로덕트오너", "개발자", "데이터분석가", "디자이너"]

const AVAILABILITY_LABEL: Record<AvailabilityStatus, string> = {
  available: "가능",
  unavailable: "불가능",
  unknown: "미정",
}

const AVAILABILITY_BADGE_CLASS: Record<AvailabilityStatus, string> = {
  available: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
  unavailable: "bg-destructive/10 text-destructive dark:bg-destructive/20",
  unknown: "bg-muted text-muted-foreground",
}

type ParticipantAvailabilityProps = {
  weekdays: WeekDay[]
}

export function ParticipantAvailability({
  weekdays,
}: ParticipantAvailabilityProps) {
  const [selectedTeam, setSelectedTeam] = useState<string>(ALL_TEAMS)
  const [selectedPersonIds, setSelectedPersonIds] = useState<Set<string>>(
    () => new Set()
  )

  const filteredPeople = useMemo(
    () =>
      selectedTeam === ALL_TEAMS
        ? people
        : people.filter((person) => person.team === selectedTeam),
    [selectedTeam]
  )

  const selectedPeople = useMemo(
    () => people.filter((person) => selectedPersonIds.has(person.id)),
    [selectedPersonIds]
  )

  function togglePerson(person: Person, checked: boolean) {
    setSelectedPersonIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(person.id)
      } else {
        next.delete(person.id)
      }
      return next
    })
  }

  const triggerLabel =
    selectedPersonIds.size > 0
      ? `참석자 선택 (${selectedPersonIds.size}명)`
      : "참석자 선택"

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4 rounded-md border p-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            팀 선택
          </span>
          <Select value={selectedTeam} onValueChange={(value) => value && setSelectedTeam(value as string)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_TEAMS}>전체</SelectItem>
              {TEAMS.map((team) => (
                <SelectItem key={team} value={team}>
                  {team}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            참석자 선택
          </span>
          <Popover>
            <PopoverTrigger
              render={
                <Button type="button" variant="outline" className="justify-start">
                  {triggerLabel}
                </Button>
              }
            />
            <PopoverContent className="w-72 p-2">
              {filteredPeople.length === 0 ? (
                <p className="p-2 text-sm text-muted-foreground">
                  해당 팀에 소속된 인원이 없습니다.
                </p>
              ) : (
                <div className="flex flex-col gap-1">
                  {filteredPeople.map((person) => (
                    <label
                      key={person.id}
                      className="flex cursor-pointer items-center gap-2.5 rounded-md p-1.5 hover:bg-muted"
                    >
                      <Checkbox
                        checked={selectedPersonIds.has(person.id)}
                        onCheckedChange={(checked) =>
                          togglePerson(person, checked === true)
                        }
                      />
                      <span className="flex flex-1 flex-col">
                        <span className="text-sm font-medium">{person.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {person.email}
                        </span>
                      </span>
                      <Badge variant="outline">{person.team}</Badge>
                    </label>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {selectedPeople.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          참석자를 선택하면 날짜별 가능 여부를 확인할 수 있습니다.
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>참석자</TableHead>
                {weekdays.map((day) => (
                  <TableHead key={day.date} className="text-center">
                    {day.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedPeople.map((person) => (
                <TableRow key={person.id}>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="flex items-center gap-1.5 text-sm font-medium">
                        {person.name}
                        <Badge variant="outline">{person.team}</Badge>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {person.email}
                      </span>
                    </div>
                  </TableCell>
                  {weekdays.map((day) => {
                    const status = getAvailability(person.id, day.date)
                    return (
                      <TableCell key={day.date} className="text-center">
                        <Badge
                          className={cn(
                            "border-transparent",
                            AVAILABILITY_BADGE_CLASS[status]
                          )}
                        >
                          {AVAILABILITY_LABEL[status]}
                        </Badge>
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
