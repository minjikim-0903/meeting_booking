import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

type CreateBookingRequestBody = {
  roomId: string
  roomName: string
  date: string
  startMinutes: number
  endMinutes: number
  title: string
  purpose: string
  invitees: { email: string; name: string }[]
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }

  const body = (await request.json()) as Partial<CreateBookingRequestBody>
  const {
    roomId,
    roomName,
    date,
    startMinutes,
    endMinutes,
    title,
    purpose,
    invitees,
  } = body

  if (
    !roomId ||
    !roomName ||
    !date ||
    typeof startMinutes !== "number" ||
    typeof endMinutes !== "number" ||
    !title ||
    !purpose ||
    !Array.isArray(invitees) ||
    invitees.length === 0
  ) {
    return NextResponse.json(
      { error: "요청 데이터가 올바르지 않습니다." },
      { status: 400 }
    )
  }

  const bookingRequest = await prisma.bookingRequest.create({
    data: {
      roomId,
      roomName,
      date,
      startMinutes,
      endMinutes,
      title,
      purpose,
      organizerEmail: session.user.email,
      organizerName: session.user.name ?? session.user.email,
      invitees: {
        create: invitees.map((invitee) => ({
          email: invitee.email,
          name: invitee.name,
        })),
      },
    },
    include: { invitees: true },
  })

  return NextResponse.json(bookingRequest, { status: 201 })
}
