// src/app/api/projects/[id]/invite/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"

import connectToDatabase from "@/lib/mongodb"
import Project from "@/models/project"
import User from "@/models/user"
import Invitation from "@/models/invitation"
import { sendEmail } from "@/lib/email"
import { v4 as uuidv4 } from "uuid"


export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Récupération sécurisée de l'ID du projet
    const projectId = params.id
    if (!projectId) {
      return NextResponse.json({ error: "Project ID required" }, { status: 400 })
    }

    // Vérification de la session
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectToDatabase()

    // Récupération de l'utilisateur complet depuis MongoDB
    const currentUser = await User.findOne({ email: session.user.email })
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Validation des données de la requête
    const { emails, message, projectName } = await req.json()
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: "At least one valid email required" }, { status: 400 })
    }

    // Vérification de l'existence du projet
    const project = await Project.findById(projectId)
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Vérification des droits de l'utilisateur
    const isOwner = project.createdBy.toString() === currentUser._id.toString()
    const isMember = project.members.some(m => m.toString() === currentUser._id.toString())
    if (!isOwner && !isMember) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
    const invitations = []

    for (const email of emails) {
      try {
        // Vérification des invitations existantes
        const existingInvitation = await Invitation.findOne({
          projectId: projectId,
          email: email.toLowerCase(),
          status: "pending"
        })

        if (existingInvitation) {
          invitations.push(existingInvitation)
          continue
        }

        // Vérification de l'utilisateur existant
        const existingUser = await User.findOne({ email: email.toLowerCase() })
        if (existingUser) {
          const isAlreadyMember = project.members.some(m => m.toString() === existingUser._id.toString())
          if (isAlreadyMember) continue
        }

        // Création de l'invitation
        const token = uuidv4()
        const newInvitation = new Invitation({
          projectId: projectId,
          email: email.toLowerCase(),
          token,
          status: "pending",
          invitedBy: {
            id: currentUser._id,
            name: currentUser.name || session.user.name
          }
        })

        await newInvitation.save()
        invitations.push(newInvitation)

        // Envoi de l'email
        const invitationUrl = `${baseUrl}/invitation/${token}`
        await sendEmail({
          to: email,
          subject: `Invitation to ${projectName || project.name}`,
          text: `You've been invited to collaborate on ${projectName || "a project"}.\n\nAccept invitation: ${invitationUrl}`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2>Project Invitation</h2>
              <p>You've been invited to collaborate on <strong>${projectName || project.name}</strong></p>
              <a href="${invitationUrl}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                Accept Invitation
              </a>
             
            </div>
          `
        })
      } catch (emailError) {
        console.error(`Error processing ${email}:`, emailError)
      }
    }

    return NextResponse.json({
      success: true,
      message: "Invitations processed",
      invitations: invitations.map(i => ({
        id: i._id,
        email: i.email,
        status: i.status
      }))
    })

  } catch (error) {
    console.error("Global error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}