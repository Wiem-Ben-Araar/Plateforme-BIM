
// src/app/api/invitations/[token]/accept/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import connectToDatabase from "@/lib/mongodb";
import Invitation from "@/models/invitation";
import Project from "@/models/project";
import User from "@/models/user";
import mongoose from "mongoose";

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    // Ajouter des logs pour déboguer
    console.log("Processing invitation acceptance for token:", params.token);
    console.log("Current user email:", session.user.email);

    // Vérifier si l'invitation existe
    const invitation = await Invitation.findOne({ token: params.token });
    if (!invitation) {
      console.log("Invitation not found with token:", params.token);
      return NextResponse.json({ message: "Invalid or expired invitation" }, { status: 404 });
    }

    console.log("Invitation found:", {
      id: invitation._id,
      email: invitation.email,
      status: invitation.status,
      projectId: invitation.projectId
    });

    // Vérifier si l'invitation est toujours en attente
    if (invitation.status !== "pending") {
      return NextResponse.json({ message: `Invitation has already been ${invitation.status}` }, { status: 400 });
    }

    // Vérifier si l'email de l'utilisateur connecté correspond à l'email de l'invitation
    if (session.user.email !== invitation.email) {
      return NextResponse.json({ message: "This invitation was sent to a different email address" }, { status: 403 });
    }

    // Trouver l'utilisateur par son email
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ message: "User not found in database" }, { status: 404 });
    }

    // Vérifier si le projet existe
    const project = await Project.findById(invitation.projectId);
    if (!project) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 });
    }

    console.log("Project structure:", {
      id: project._id,
      name: project.name,
      memberCount: project.members ? project.members.length : 0
    });

    // Vérifier si l'utilisateur est déjà membre du projet
    const isCreator = project.createdBy && project.createdBy.toString() === user._id.toString();
    const isMember = project.members && project.members.some(member => {
      if (typeof member === 'object' && member.userId) {
        return member.userId.toString() === user._id.toString();
      }
      return member.toString() === user._id.toString();
    });

    if (isCreator || isMember) {
      // Mettre à jour le statut de l'invitation
      invitation.status = "accepted";
      await invitation.save();

      return NextResponse.json({
        message: "You are already a member of this project",
        projectId: project._id,
      });
    }

    // Ajouter l'utilisateur comme membre du projet
    if (!project.members) {
      project.members = [];
    }

    // Ajouter l'utilisateur avec la structure correcte
    project.members.push({
      userId: user._id,
      role: "Member",
      joinedAt: new Date()
    });

    await project.save();
    console.log(`User ${user._id} added to project ${project._id}`);

    // Mettre à jour le statut de l'invitation
    invitation.status = "accepted";
    await invitation.save();

    return NextResponse.json({
      message: "Invitation accepted successfully",
      projectId: project._id,
    });
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json({ message: "Failed to accept invitation", error: String(error) }, { status: 500 });
  }
}
