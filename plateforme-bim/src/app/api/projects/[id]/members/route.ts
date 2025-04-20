// src/app/api/projects/[id]/members/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import connectToDatabase from "@/lib/mongodb"
import Project from "@/models/project"
import User from "@/models/user"

// src/app/api/projects/[id]/members/route.ts
export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
      const session = await getServerSession();
      if (!session?.user) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
      }
  
      await connectToDatabase();
      
      const projectId = params.id;
      
      // Récupérer le projet avec les détails des membres
      const project = await Project.findById(projectId)
        .populate('createdBy', 'name email image')
        .populate('members.userId', 'name email image');
      
      if (!project) {
        return NextResponse.json({ error: "Projet non trouvé" }, { status: 404 });
      }
      
      // Formater les membres pour l'API frontend
      const members = [];
      
      // Ajouter le créateur comme membre spécial s'il existe
      if (project.createdBy) {
        const creatorData = project.createdBy;
        members.push({
          id: creatorData._id.toString(),
          name: creatorData.name || "Project Owner",
          email: creatorData.email || "",
          image: creatorData.image || "",
          role: "Owner"
        });
      }
      
      // Ajouter les autres membres
      if (project.members && Array.isArray(project.members)) {
        project.members.forEach(member => {
          const userData = member.userId;
          
          // Éviter les doublons (comme le créateur qui pourrait aussi être dans members)
          if (userData && !members.some(m => m.id === userData._id.toString())) {
            members.push({
              id: userData._id.toString(),
              name: userData.name || "Team Member",
              email: userData.email || "",
              image: userData.image || "",
              role: member.role || "Member"
            });
          }
        });
      }
      
      console.log(`Membres trouvés pour le projet ${projectId}: ${members.length}`);
      
      return NextResponse.json({ members });
    } catch (error) {
      console.error("Erreur récupération membres:", error);
      return NextResponse.json({
        error: "Erreur récupération membres",
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 });
    }
  }