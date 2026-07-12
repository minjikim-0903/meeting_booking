"use client"

import { useMemo } from "react"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { people, TEAM_COLOR, type Team } from "@/lib/mock-participants"
import { MOCK_USER } from "@/lib/mock-session"

export const ALL_TEAMS = "전체"

const TEAMS = Object.keys(TEAM_COLOR) as Team[]

export type ParticipantSelection = {
  selectedTeam: string
  search: string
  selectedParticipantIds: Set<string>
}

type ParticipantPickerProps = {
  selectedTeam: string
  onTeamChange: (team: string) => void
  search: string
  onSearchChange: (search: string) => void
  selectedParticipantIds: Set<string>
  onToggleParticipant: (personId: string, checked: boolean) => void
}

export function ParticipantPicker({
  selectedTeam,
  onTeamChange,
  search,
  onSearchChange,
  selectedParticipantIds,
  onToggleParticipant,
}: ParticipantPickerProps) {
  const filteredPeople = useMemo(() => {
    const query = search.trim().toLowerCase()
    return people.filter((person) => {
      if (selectedTeam !== ALL_TEAMS && person.team !== selectedTeam) {
        return false
      }
      if (
        query &&
        !person.name.toLowerCase().includes(query) &&
        !person.email.toLowerCase().includes(query)
      ) {
        return false
      }
      return true
    })
  }, [selectedTeam, search])

  // "나 (현재 로그인 계정)" is a synthetic entry (id "me") for the current
  // (mock) user, not part of the mock `people` roster. It's never filtered
  // out by team (it has no `Team`), only by search text.
  const meEntry = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (
      query &&
      !MOCK_USER.name.toLowerCase().includes(query) &&
      !MOCK_USER.email.toLowerCase().includes(query)
    ) {
      return null
    }
    return { name: MOCK_USER.name, email: MOCK_USER.email }
  }, [search])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">팀 선택</span>
        <Select
          value={selectedTeam}
          onValueChange={(value) => value && onTeamChange(value as string)}
        >
          <SelectTrigger className="w-full">
            <SelectValue>
              {(value: string) =>
                value === ALL_TEAMS ? (
                  ALL_TEAMS
                ) : (
                  <span className="flex items-center gap-1.5">
                    <span
                      className={cn("size-2 rounded-full", TEAM_COLOR[value as Team].dot)}
                    />
                    {value}
                  </span>
                )
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_TEAMS}>전체</SelectItem>
            {TEAMS.map((team) => (
              <SelectItem key={team} value={team}>
                <span className="flex items-center gap-1.5">
                  <span className={cn("size-2 rounded-full", TEAM_COLOR[team].dot)} />
                  {team}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">검색</span>
        <Input
          type="text"
          placeholder="이름 또는 이메일 검색"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            참석자 체크리스트
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            선택된 참석자 {selectedParticipantIds.size}명
          </span>
        </div>

        <ScrollArea className="h-full min-h-40 rounded-md border">
          {filteredPeople.length === 0 && !meEntry ? (
            <p className="p-4 text-sm text-muted-foreground">
              조건에 맞는 참석자가 없습니다.
            </p>
          ) : (
            <div className="flex flex-col gap-1 p-2">
              {meEntry && (
                <label className="flex cursor-pointer items-start gap-2.5 rounded-md p-1.5 hover:bg-muted">
                  <Checkbox
                    className="mt-0.5"
                    checked={selectedParticipantIds.has("me")}
                    onCheckedChange={(checked) =>
                      onToggleParticipant("me", checked === true)
                    }
                  />
                  <span className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          TEAM_COLOR[MOCK_USER.team].dot
                        )}
                        title={MOCK_USER.team}
                      />
                      <span className="text-sm font-medium">{meEntry.name}</span>
                      <Badge variant="outline">{MOCK_USER.role}</Badge>
                      <Badge variant="default">나</Badge>
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {meEntry.email}
                    </span>
                  </span>
                </label>
              )}
              {filteredPeople.map((person) => (
                <label
                  key={person.id}
                  className="flex cursor-pointer items-start gap-2.5 rounded-md p-1.5 hover:bg-muted"
                >
                  <Checkbox
                    className="mt-0.5"
                    checked={selectedParticipantIds.has(person.id)}
                    onCheckedChange={(checked) =>
                      onToggleParticipant(person.id, checked === true)
                    }
                  />
                  <span className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn("size-2 shrink-0 rounded-full", TEAM_COLOR[person.team].dot)}
                        title={person.team}
                      />
                      <span className="text-sm font-medium">{person.name}</span>
                      <Badge variant="outline">{person.role}</Badge>
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {person.email}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}
