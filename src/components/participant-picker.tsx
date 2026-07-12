"use client"

import { useMemo } from "react"
import { useSession } from "next-auth/react"

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
import { people, type Team } from "@/lib/mock-participants"

export const ALL_TEAMS = "전체"

const TEAMS: Team[] = ["프로덕트오너", "개발자", "데이터분석가", "디자이너"]

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
  const { data: session } = useSession()

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

  // "나 (현재 로그인 계정)" is a synthetic entry (id "me") for the signed-in
  // session user, not part of the mock `people` roster. It's never filtered
  // out by team (it has no `Team`), only by search text.
  const meEntry = useMemo(() => {
    if (!session?.user) return null
    const query = search.trim().toLowerCase()
    const name = session.user.name ?? session.user.email ?? "나"
    const email = session.user.email ?? ""
    if (
      query &&
      !name.toLowerCase().includes(query) &&
      !email.toLowerCase().includes(query)
    ) {
      return null
    }
    return { name, email }
  }, [session, search])

  return (
    <div className="flex flex-col gap-3 rounded-md border p-4">
      <h3 className="text-sm font-semibold">참석자 선택</h3>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">팀 선택</span>
        <Select
          value={selectedTeam}
          onValueChange={(value) => value && onTeamChange(value as string)}
        >
          <SelectTrigger className="w-full">
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
        <span className="text-xs font-medium text-muted-foreground">검색</span>
        <Input
          type="text"
          placeholder="이름 또는 이메일 검색"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            참석자 체크리스트
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            선택된 참석자 {selectedParticipantIds.size}명
          </span>
        </div>

        <ScrollArea className="max-h-80 rounded-md border">
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
                      <span className="text-sm font-medium">{meEntry.name}</span>
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
                      <span className="text-sm font-medium">{person.name}</span>
                      <Badge variant="outline">{person.team}</Badge>
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
