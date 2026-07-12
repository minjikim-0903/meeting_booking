"use client"

import Link from "next/link"
import { signIn, signOut, useSession } from "next-auth/react"

import { Button } from "@/components/ui/button"

export function UserMenu() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <div className="h-8 w-24" />
  }

  if (!session?.user) {
    return (
      <Button onClick={() => signIn("google")}>Google로 로그인</Button>
    )
  }

  const { name, email, image } = session.user

  return (
    <div className="flex items-center gap-2">
      <Link href="/requests">
        <Button variant="ghost" size="sm">
          받은 요청
        </Button>
      </Link>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={name ?? email ?? "사용자"}
          className="size-8 rounded-full"
        />
      ) : (
        <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
          {(name ?? email ?? "?").slice(0, 1).toUpperCase()}
        </div>
      )}
      <span className="text-sm font-medium">{name ?? email}</span>
      <Button variant="outline" size="sm" onClick={() => signOut()}>
        로그아웃
      </Button>
    </div>
  )
}
