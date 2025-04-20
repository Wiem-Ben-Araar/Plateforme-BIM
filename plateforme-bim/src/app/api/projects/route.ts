import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import Project from "@/models/project";
import mongoose from "mongoose";

// Créer un nouveau projet
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    console.log("Session:", JSON.stringify(session, null, 2));
    
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    
    // Use email as identifier if id is not available
    const userIdentifier = session.user.id || session.user.email;
    
    if (!userIdentifier) {
      console.error("Identifiant utilisateur manquant dans la session");
      return NextResponse.json({ error: "Identifiant utilisateur manquant" }, { status: 400 });
    }
    
    // Se connecter à la base de données
    await connectToDatabase();
    
    // Extraire les données de la requête
    let data;
    try {
      data = await request.json();
      console.log("Données reçues:", data);
    } catch (e) {
      console.error("Erreur parsing JSON:", e);
      return NextResponse.json({ error: "Format JSON invalide" }, { status: 400 });
    }
    
    // Valider les données
    if (!data.name || data.name.trim() === "") {
      return NextResponse.json({ error: "Le nom du projet est requis" }, { status: 400 });
    }
    
    // Find user by email if we don't have an ID
    let userId;
    if (session.user.id) {
      userId = new mongoose.Types.ObjectId(session.user.id);
    } else {
      // You'll need to have a User model/schema
      const User = mongoose.model('User');
      const user = await User.findOne({ email: session.user.email });
      if (!user) {
        return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
      }
      userId = user._id;
    }
    
    // Créer l'objet projet avec des valeurs par défaut pour les champs optionnels
    const project = new Project({
      name: data.name.trim(),
      description: data.description ? data.description.trim() : "",
      createdBy: userId,
      members: [userId]
    });
    
    console.log("Projet avant sauvegarde:", project);
    
    // Sauvegarder le projet dans la base de données
    const savedProject = await project.save();
    console.log("Projet sauvegardé:", savedProject);
    
    return NextResponse.json(savedProject, { status: 201 });
  } catch (error) {
    // Log détaillé de l'erreur
    console.error("Erreur création projet (détaillée):", error);
    
    // Retourner un message d'erreur plus descriptif
    return NextResponse.json({
      error: "Erreur création projet",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}



export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    
    // Récupérer l'identifiant de l'utilisateur
    const userEmail = session.user.email;
    
    if (!userEmail) {
      return NextResponse.json({ error: "Email utilisateur manquant" }, { status: 400 });
    }
    
    await connectToDatabase();
    
    // Trouver l'utilisateur par son email
    const User = mongoose.models.User || mongoose.model('User');
    const user = await User.findOne({ email: userEmail });
    
    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }
    
    const userId = user._id;
    
    // Rechercher les projets où l'utilisateur est membre
    console.log(`Recherche des projets pour l'utilisateur: ${userEmail} (ID: ${userId})`);
    
    const projects = await Project.find({
      $or: [
        { createdBy: userId }, // L'utilisateur est le créateur
        { "members.userId": userId } // L'utilisateur est un membre
      ]
    })
    .populate({
      path: 'members.userId',
      select: 'name email image'
    })
    .populate('createdBy', 'name email image')
    .sort({ createdAt: -1 });
    
    console.log(`Projets trouvés: ${projects.length}`);
    
    return NextResponse.json(projects);
  } catch (error) {
    console.error("Erreur récupération projets:", error);
    return NextResponse.json({
      error: "Erreur récupération projets",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}