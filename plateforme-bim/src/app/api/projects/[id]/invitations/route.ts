// src/app/api/projects/[id]/invitations/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import connectToDatabase from "@/lib/mongodb"
import Project from "@/models/project"
import Invitation from "@/models/invitation"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    console.log("Project ID:", id)

    const session = await getServerSession()
    if (!session?.user) {
      console.log("No session found or user not available in session")
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    console.log("Session user:", session.user)

    await connectToDatabase()

    // Vérifier si le projet existe
    const project = await Project.findById(id)
    if (!project) {
      console.log("Project not found")
      return NextResponse.json({ message: "Project not found" }, { status: 404 })
    }

    // Récupérer les invitations en attente pour ce projet
    const invitations = await Invitation.find({
      projectId: id,
      status: "pending"
    }).sort({ createdAt: -1 })

    console.log("Invitations found:", invitations.length)

    return NextResponse.json({ invitations })
  } catch (error) {
    console.error("Error fetching project invitations:", error)
    return NextResponse.json({ message: "Failed to fetch project invitations", error: String(error) }, { status: 500 })
  }
}