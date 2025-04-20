import { type NextRequest, NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongodb"
import Invitation from "@/models/invitation"
import Project from "@/models/project"

// Dans la route API qui vérifie l'invitation (/api/invitations/[token]/verify)
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const { token } = params;
    await connectToDatabase();
    
    const invitation = await Invitation.findOne({ token, status: "pending" });
    if (!invitation) {
      return NextResponse.json({ message: "Invitation non trouvée ou déjà utilisée" }, { status: 404 });
    }
    
    // Récupérer le projet pour obtenir son nom
    const project = await Project.findById(invitation.projectId);
    if (!project) {
      return NextResponse.json({ message: "Projet non trouvé" }, { status: 404 });
    }
    
    // Ajouter le nom du projet à l'objet d'invitation
    const invitationWithProject = {
      ...invitation.toObject(),
      projectName: project.name
    };
    
    return NextResponse.json({ invitation: invitationWithProject });
  } catch (error) {
    console.error("Error verifying invitation:", error);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}
