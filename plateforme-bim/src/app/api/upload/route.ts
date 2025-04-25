import { NextResponse } from "next/server";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import storage from "@/lib/firebase";
import connectToDatabase from "@/lib/mongodb";
import mongoose from "mongoose";
import File from "@/models/file";
import Project from "@/models/project";
import User from "@/models/user"; // Make sure this import exists

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("file") as File[]; 
    const projectId = formData.get("projectId") as string;
    const userEmail = formData.get("userEmail") as string;
    console.log("FormData received -> projectId:", projectId, "files count:", files.length, "userEmail:", userEmail);

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: "ProjectId is required" }, { status: 400 });
    }

    await connectToDatabase();

    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: `Project with ID ${projectId} not found` }, { status: 404 });
    }

    // Try to find the user by email if provided
    let userId = null;
    if (userEmail) {
      const user = await User.findOne({ email: userEmail });
      if (user) {
        userId = user._id;
      }
    }

    const downloadURLs = [];
    const fileMetadata = [];
    const newFileIds = [];

    for (const file of files) {
      // Check if file is IFC format
      if (!file.name.toLowerCase().endsWith('.ifc')) {
        return NextResponse.json(
          { error: "All files must be in IFC format" },
          { status: 400 }
        );
      }

      try {
        const timestamp = Date.now();
        const fileName = `${timestamp}-${file.name}`;
        const storagePath = `projects/${projectId}/${fileName}`;
        const storageRef = ref(storage, storagePath);

        // Upload to Firebase Storage
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);

        if (downloadURL) {
          downloadURLs.push(downloadURL);

          // Create a new File document in MongoDB
          const newFile = new File({
            name: file.name,
            file_url: downloadURL,
            file_size: file.size,
            fileType: file.name.toLowerCase().endsWith('.ifc') ? 'IFC' : 'other',
            version: 1,
            project: new mongoose.Types.ObjectId(projectId),
            firebasePath: storagePath,
            // Use the user ID if found, otherwise store the email as string
            uploadedBy: userId || userEmail || "unknown"
          });

          // Save the file in MongoDB
          await newFile.save();
          console.log("File saved with ID:", newFile._id);

          fileMetadata.push({
            id: newFile._id.toString(),
            name: file.name,
            url: downloadURL,
          });

          newFileIds.push(newFile._id);
        } else {
          console.error("Failed to get URL for", file.name);
        }
      } catch (fileError) {
        console.error("Error processing file", file.name, fileError);
        // Continue with other files
      }
    }

    // Update project with new files
    if (newFileIds.length > 0) {
      const updatedProject = await Project.findByIdAndUpdate(
        projectId,
        { $push: { files: { $each: newFileIds } } },
        { new: true }
      ).populate('files');
      
      if (!updatedProject) {
        console.error(`Project with ID ${projectId} not found during update.`);
      } else {
        console.log("Project update completed. Files in project:", updatedProject.files.length);
      }
    }

    return NextResponse.json({
      downloadURLs,
      fileMetadata,
      success: downloadURLs.length > 0,
      message: `${downloadURLs.length} file(s) uploaded successfully`,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed", details: error instanceof Error ? error.message : String(error) },
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

    // Check if this is a temporary ID (starts with "temp-")
    if (fileId.startsWith('temp-')) {
      // For temporary files, just delete from Firebase if path exists
      if (firebasePath) {
        try {
          const storageRef = ref(storage, firebasePath);
          await deleteObject(storageRef);
          console.log(`Fichier temporaire supprimé de Firebase: ${firebasePath}`);
        } catch (storageError) {
          console.error("Erreur Firebase Storage:", storageError);
        }
      }

      // For temporary IDs, we DON'T try to update the project in MongoDB
      // since temp IDs aren't stored in the database

      return NextResponse.json({
        success: true,
        message: "Fichier temporaire supprimé avec succès",
        deletedFile: {
          id: fileId,
          firebasePath
        }
      });
    }

    // Regular MongoDB ObjectID handling
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
        { $pull: { files: new mongoose.Types.ObjectId(fileId) } },
        { new: true }
      );
    } else if (fileToDelete.project) {
      // Si projectId n'est pas fourni, utiliser celui du document
      await Project.findByIdAndUpdate(
        fileToDelete.project,
        { $pull: { files: new mongoose.Types.ObjectId(fileId) } },
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
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error && error.stack) : undefined
      },
      { status: 500 }
    );
  }
}