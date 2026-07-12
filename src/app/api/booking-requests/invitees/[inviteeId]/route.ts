import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

type RespondBody = {
  status: "accepted" | "rejected"
  rejectReason?: string
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ inviteeId: string }> }
) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }

  const { inviteeId } = await params
  const body = (await request.json()) as Partial<RespondBody>
  const { status, rejectReason } = body

  if (status !== "accepted" && status !== "rejected") {
    return NextResponse.json(
      { error: "요청 데이터가 올바르지 않습니다." },
      { status: 400 }
    )
  }

  const invitee = await prisma.bookingInvitee.findUnique({
    where: { id: inviteeId },
  })

  if (!invitee) {
    return NextResponse.json(
      { error: "초대 정보를 찾을 수 없습니다." },
      { status: 404 }
    )
  }

  if (invitee.email !== session.user.email) {
    return NextResponse.json(
      { error: "다른 사람의 요청에 응답할 수 없습니다." },
      { status: 403 }
    )
  }

  const updatedInvitee = await prisma.bookingInvitee.update({
    where: { id: inviteeId },
    data: {
      status,
      rejectReason: status === "rejected" ? (rejectReason ?? null) : null,
      respondedAt: new Date(),
    },
  })

  const allInvitees = await prisma.bookingInvitee.findMany({
    where: { requestId: invitee.requestId },
  })

  let requestStatus: "pending" | "confirmed" | "rejected" = "pending"
  if (status === "rejected") {
    requestStatus = "rejected"
  } else if (allInvitees.every((i) => i.status === "accepted")) {
    requestStatus = "confirmed"
  }

  const updatedRequest = await prisma.bookingRequest.update({
    where: { id: invitee.requestId },
    data: { status: requestStatus },
  })

  return NextResponse.json({ invitee: updatedInvitee, request: updatedRequest })
}
