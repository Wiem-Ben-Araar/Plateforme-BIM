import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"

import connectToDatabase from "@/lib/mongodb"
import Invitation from "@/models/invitation"

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectToDatabase()

    // Vérifier si l'invitation existe
    const invitation = await Invitation.findOne({ token: params.token })
    if (!invitation) {
      return NextResponse.json({ message: "Invalid or expired invitation" }, { status: 404 })
    }

    // Vérifier si l'invitation est toujours en attente
    if (invitation.status !== "pending") {
      return NextResponse.json({ message: `Invitation has already been ${invitation.status}` }, { status: 400 })
    }

    // Vérifier si l'email de l'utilisateur connecté correspond à l'email de l'invitation
    if (session.user.email !== invitation.email) {
      return NextResponse.json({ message: "This invitation was sent to a different email address" }, { status: 403 })
    }

    // Mettre à jour le statut de l'invitation
    invitation.status = "declined"
    await invitation.save()

    return NextResponse.json({ message: "Invitation declined successfully" })
  } catch (error) {
    console.error("Error declining invitation:", error)
    return NextResponse.json({ message: "Failed to decline invitation", error: String(error) }, { status: 500 })
  }
}
