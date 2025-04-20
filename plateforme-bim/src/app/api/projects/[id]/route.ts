import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Project from "@/models/project";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    // Vérifier si `id` est présent dans les paramètres
    const id = params.id;
    
    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }
    
    await connectToDatabase(); // Connexion à la base de données
    
    // Récupérer le projet avec l'ID SANS populate (pour éviter l'erreur)
    const project = await Project.findById(id);
    
    if (!project) {
      return NextResponse.json({ error: "Projet non trouvé" }, { status: 404 });
    }
    
    // Retourner les données du projet
    return NextResponse.json(project);
  } catch (error) {
    console.error("Erreur lors de la récupération du projet:", error);
    return NextResponse.json({ 
      error: "Erreur interne", 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    
    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }
    
    await connectToDatabase();
    
    const deletedProject = await Project.findByIdAndDelete(id);
    
    if (!deletedProject) {
      return NextResponse.json({ error: "Projet non trouvé" }, { status: 404 });
    }
    
    return NextResponse.json({ message: "Projet supprimé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression du projet:", error);
    return NextResponse.json({ 
      error: "Erreur interne", 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    // Vérifier si `id` est présent dans les paramètres
    const id = params.id;
    
    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }
    
    // Connexion à la base de données
    await connectToDatabase();
    
    // Récupérer les données de la requête
    const body = await req.json();
    
    // Valider les données minimales
    if (!body.name) {
      return NextResponse.json({ error: "Le nom du projet est requis" }, { status: 400 });
    }
    
    // Mettre à jour le projet
    const updatedProject = await Project.findByIdAndUpdate(
      id, 
      {
        name: body.name,
        description: body.description || '', // Optionnel
        updatedAt: new Date() // Mettre à jour la date de modification
      }, 
      { new: true } // Retourne le document mis à jour
    );
    
    if (!updatedProject) {
      return NextResponse.json({ error: "Projet non trouvé" }, { status: 404 });
    }
    
    // Retourner les données du projet mis à jour
    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error("Erreur lors de la mise à jour du projet:", error);
    return NextResponse.json({ 
      error: "Erreur interne", 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
