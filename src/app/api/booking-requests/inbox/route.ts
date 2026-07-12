import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }

  const invitees = await prisma.bookingInvitee.findMany({
    where: { email: session.user.email, status: "pending" },
    include: { request: true },
    orderBy: { request: { createdAt: "desc" } },
  })

  return NextResponse.json(invitees)
}
