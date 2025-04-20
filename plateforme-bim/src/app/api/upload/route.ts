import { NextResponse } from "next/server";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import storage from "@/lib/firebase";
import connectToDatabase from "@/lib/mongodb";
import mongoose from "mongoose";
import File from "@/models/file";
import Project from "@/models/project";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("file") as File[]; // Assurez-vous que "file" est le bon nom de champ
    const projectId = formData.get("projectId") as string;

    console.log("FormData received -> projectId:", projectId, "files count:", files.length);

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    // Vérifier que projectId est fourni
    if (!projectId) {
      return NextResponse.json({ error: "ProjectId est requis" }, { status: 400 });
    }

    // Connexion à la base de données
    await connectToDatabase();

    // Vérifier que le projet existe
    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: `Projet avec l'ID ${projectId} non trouvé` }, { status: 404 });
    }

    const downloadURLs: string[] = [];
    const fileMetadata: Array<{ id: string; name: string; url: string }> = [];
    const newFileIds: mongoose.Types.ObjectId[] = [];

    for (const file of files) {
      // Vérifier que le fichier est au format IFC
      if (!file.name.toLowerCase().endsWith('.ifc')) {
        return NextResponse.json(
          { error: "Tous les fichiers doivent être au format IFC" },
          { status: 400 }
        );
      }

      try {
        const timestamp = Date.now();
        const fileName = `${timestamp}-${file.name}`;
        const storagePath = `projects/${projectId}/${fileName}`;
        const storageRef = ref(storage, storagePath);

        // Upload sur Firebase Storage
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);

        if (downloadURL) {
          downloadURLs.push(downloadURL);

          // Créer un nouveau document File dans MongoDB
          const newFile = new File({
            name: file.name,
            file_url: downloadURL,
            file_size: file.size,
            fileType: file.name.toLowerCase().endsWith('.ifc') ? 'IFC' : 'other', // Définir le type en fonction de l'extension
            version: 1,
            project: new mongoose.Types.ObjectId(projectId),
            firebasePath: storagePath, 
          });

          // Sauvegarder le fichier dans MongoDB
          await newFile.save();
          console.log("Fichier enregistré avec l'ID:", newFile._id);

          fileMetadata.push({
            id: newFile._id.toString(),
            name: file.name,
            url: downloadURL,
          });

          newFileIds.push(newFile._id);
        } else {
          console.error("Échec de la récupération de l'URL pour", file.name);
        }
      } catch (fileError) {
        console.error("Erreur lors du traitement du fichier", file.name, fileError);
        // Continuer avec les autres fichiers
      }
    }

    // Mettre à jour le projet avec les nouveaux fichiers
    if (newFileIds.length > 0) {
      const updatedProject = await Project.findByIdAndUpdate(
        projectId,
        { $push: { files: { $each: newFileIds } } },
        { new: true }
      );

      if (!updatedProject) {
        console.error(`Projet avec l'ID ${projectId} non trouvé lors de la mise à jour.`);
      } else {
        console.log("Mise à jour du projet effectuée. Fichiers dans le projet:", updatedProject.files.length);
      }
    }

    return NextResponse.json({
      downloadURLs,
      fileMetadata,
      success: downloadURLs.length > 0,
      message: `${downloadURLs.length} fichier(s) uploadé(s) avec succès`,
    });
  } catch (error) {
    console.error("Erreur d'upload:", error);
    return NextResponse.json(
      { error: "Échec de l'upload", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    
    // Extraire l'ID du projet depuis l'URL
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({ error: "ID du projet requis" }, { status: 400 });
    }
    
    // Récupérer le projet avec ses fichiers
    const project = await Project.findById(id).populate('files');
    
    if (!project) {
      return NextResponse.json({ error: "Projet non trouvé" }, { status: 404 });
    }
    
    return NextResponse.json(project);
  } catch (error) {
    console.error("Erreur de récupération du projet:", error);
    return NextResponse.json({ 
      error: "Échec de la récupération du projet",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
export async function DELETE(request: Request) {
  try {
    const { fileId, projectId, firebasePath } = await request.json();

    if (!fileId) {
      return NextResponse.json({ error: "ID de fichier requis" }, { status: 400 });
    }

    await connectToDatabase();

    // Récupérer le fichier avec vérification du projet
    const fileToDelete = await File.findById(fileId);
    if (!fileToDelete) {
      return NextResponse.json({ error: "Fichier non trouvé" }, { status: 404 });
    }

    // Vérification de cohérence entre firebasePath et le document
    if (firebasePath && fileToDelete.firebasePath !== firebasePath) {
      console.warn("Chemin Firebase fourni ne correspond pas à celui en base");
    }

    // Utiliser le chemin Firebase du document si disponible
    const pathToDelete = fileToDelete.firebasePath || firebasePath;

    // Suppression dans Firebase Storage
    if (pathToDelete) {
      try {
        const storageRef = ref(storage, pathToDelete);
        await deleteObject(storageRef);
        console.log(`Fichier supprimé de Firebase: ${pathToDelete}`);
      } catch (storageError) {
        console.error("Erreur Firebase Storage:", storageError);
        // Ne pas échouer complètement si la suppression dans Firebase échoue
      }
    }

    // Suppression dans MongoDB
    const deleteResult = await File.findByIdAndDelete(fileId);
    if (!deleteResult) {
      return NextResponse.json({ error: "Fichier déjà supprimé" }, { status: 404 });
    }

    // Suppression de la référence dans le projet
    if (projectId) {
      await Project.findByIdAndUpdate(
        projectId,
        { $pull: { files: fileId } },
        { new: true }
      );
    } else if (fileToDelete.project) {
      // Si projectId n'est pas fourni, utiliser celui du document
      await Project.findByIdAndUpdate(
        fileToDelete.project,
        { $pull: { files: fileId } },
        { new: true }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Fichier supprimé avec succès",
      deletedFile: {
        id: fileId,
        name: fileToDelete.name,
        firebasePath: pathToDelete
      }
    });

  } catch (error) {
    console.error("Erreur lors de la suppression:", error);
    return NextResponse.json(
      { 
        error: "Échec de la suppression",
        details: error instanceof Error ? error.message : String(error),
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}