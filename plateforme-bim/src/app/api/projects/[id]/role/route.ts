// app/api/projects/[id]/role/route.ts
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Project from "@/models/project";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();

  try {
    const project = await Project.findById(params.id)
      .populate("createdBy", "email")
      .populate("members.userId", "email");

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Détermine le rôle
    let role: "owner" | "member" = "member";
    
    if (project.createdBy?.email === session.user.email) {
      role = "owner";
    } else {
      const member = project.members.find(
        (m: any) => m.userId?.email === session.user?.email
      );
      if (member) role = member.role;
    }

    return NextResponse.json({ role });
  } catch (error) {
    console.error("Error fetching role:", error);
    return NextResponse.json(
      { error: "Error fetching role" },
      { status: 500 }
    );
  }
}