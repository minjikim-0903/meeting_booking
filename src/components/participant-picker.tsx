"use client"

import { useMemo } from "react"
import { Plus, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  selectedTeams: string[]
  search: string
  selectedParticipantIds: Set<string>
}

type ParticipantPickerProps = {
  /** Empty array = 전체 (no team filter). Multiple teams can be selected at once, e.g. for a cross-team meeting. */
  selectedTeams: string[]
  onTeamsChange: (teams: string[]) => void
  search: string
  onSearchChange: (search: string) => void
  selectedParticipantIds: Set<string>
  onToggleParticipant: (personId: string, checked: boolean) => void
}

export function ParticipantPicker({
  selectedTeams,
  onTeamsChange,
  search,
  onSearchChange,
  selectedParticipantIds,
  onToggleParticipant,
}: ParticipantPickerProps) {
  const filteredPeople = useMemo(() => {
    const query = search.trim().toLowerCase()
    return people.filter((person) => {
      if (selectedTeams.length > 0 && !selectedTeams.includes(person.team)) {
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
  }, [selectedTeams, search])

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

  function teamSelectValue(value: string) {
    return value === ALL_TEAMS ? (
      ALL_TEAMS
    ) : (
      <span className="flex items-center gap-1.5">
        <span className={cn("size-2 rounded-full", TEAM_COLOR[value as Team].dot)} />
        {value}
      </span>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">팀 선택</span>

        <div className="flex items-center gap-1.5">
          <Select
            value={selectedTeams[0] ?? ALL_TEAMS}
            onValueChange={(value) => {
              if (!value) return
              if (value === ALL_TEAMS) {
                onTeamsChange([])
              } else {
                onTeamsChange([value, ...selectedTeams.slice(1)])
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue>{teamSelectValue}</SelectValue>
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

          {selectedTeams.length > 0 && selectedTeams.length < TEAMS.length && (
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              title="팀 추가"
              onClick={() => {
                const nextTeam = TEAMS.find((t) => !selectedTeams.includes(t))
                if (nextTeam) onTeamsChange([...selectedTeams, nextTeam])
              }}
            >
              <Plus />
            </Button>
          )}
        </div>

        {selectedTeams.slice(1).map((team, i) => {
          const idx = i + 1
          const otherSelected = selectedTeams.filter((_, j) => j !== idx)
          return (
            <div key={idx} className="flex items-center gap-1.5">
              <Select
                value={team}
                onValueChange={(value) => {
                  if (!value) return
                  const next = [...selectedTeams]
                  next[idx] = value
                  onTeamsChange(next)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{teamSelectValue}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TEAMS.filter((t) => !otherSelected.includes(t)).map((t) => (
                    <SelectItem key={t} value={t}>
                      <span className="flex items-center gap-1.5">
                        <span className={cn("size-2 rounded-full", TEAM_COLOR[t].dot)} />
                        {t}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                title="팀 제거"
                onClick={() =>
                  onTeamsChange(selectedTeams.filter((_, j) => j !== idx))
                }
              >
                <X />
              </Button>
            </div>
          )
        })}
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
