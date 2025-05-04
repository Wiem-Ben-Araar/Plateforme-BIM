import { NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongodb"
import mongoose from "mongoose"
import File from "@/models/file"
import Project from "@/models/project"
import User from "@/models/user"
import { uploadFile, deleteFile } from "@/lib/gridfs"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const files = formData.getAll("file") as File[]
    const projectId = formData.get("projectId") as string
    const userEmail = formData.get("userEmail") as string
    console.log("FormData received -> projectId:", projectId, "files count:", files.length, "userEmail:", userEmail)

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!projectId) {
      return NextResponse.json({ error: "ProjectId is required" }, { status: 400 })
    }

    await connectToDatabase()

    const project = await Project.findById(projectId)
    if (!project) {
      return NextResponse.json({ error: `Project with ID ${projectId} not found` }, { status: 404 })
    }

    // Try to find the user by email if provided
    let userId = null
    if (userEmail) {
      const user = await User.findOne({ email: userEmail })
      if (user) {
        userId = user._id
      }
    }

    const downloadURLs = []
    const fileMetadata = []
    const newFileIds = []

    for (const file of files) {
      // Check if file is IFC format
      if (!file.name.toLowerCase().endsWith(".ifc")) {
        return NextResponse.json({ error: "All files must be in IFC format" }, { status: 400 })
      }

      try {
        const timestamp = Date.now()
        const fileName = `${timestamp}-${file.name}`

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Upload to GridFS
        const gridFSFile = await uploadFile(buffer, fileName, {
          projectId,
          originalName: file.name,
          uploadedBy: userId || userEmail || "unknown",
          contentType: file.type,
        })

        // Generate file URL for API access
        const fileUrl = `/api/files/${gridFSFile.id}`

        if (gridFSFile.id) {
          downloadURLs.push(fileUrl)

          // Create a new File document in MongoDB
          const newFile = new File({
            name: file.name,
            file_url: fileUrl,
            file_size: file.size,
            fileType: file.name.toLowerCase().endsWith(".ifc") ? "IFC" : "other",
            version: 1,
            project: new mongoose.Types.ObjectId(projectId),
            gridFSId: gridFSFile.id,
            // Use the user ID if found, otherwise store the email as string
            uploadedBy: userId || userEmail || "unknown",
          })

          // Save the file in MongoDB
          await newFile.save()
          console.log("File saved with ID:", newFile._id)

          fileMetadata.push({
            id: newFile._id.toString(),
            name: file.name,
            url: fileUrl,
          })

          newFileIds.push(newFile._id)
        } else {
          console.error("Failed to get ID for", file.name)
        }
      } catch (fileError) {
        console.error("Error processing file", file.name, fileError)
        // Continue with other files
      }
    }

    // Update project with new files
    if (newFileIds.length > 0) {
      const updatedProject = await Project.findByIdAndUpdate(
        projectId,
        { $push: { files: { $each: newFileIds } } },
        { new: true },
      ).populate("files")

      if (!updatedProject) {
        console.error(`Project with ID ${projectId} not found during update.`)
      } else {
        console.log("Project update completed. Files in project:", updatedProject.files.length)
      }
    }

    return NextResponse.json({
      downloadURLs,
      fileMetadata,
      success: downloadURLs.length > 0,
      message: `${downloadURLs.length} file(s) uploaded successfully`,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: "Upload failed", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { fileId, projectId, gridFSId } = await request.json()

    if (!fileId) {
      return NextResponse.json({ error: "ID de fichier requis" }, { status: 400 })
    }

    await connectToDatabase()

    // Check if this is a temporary ID (starts with "temp-")
    if (fileId.startsWith("temp-")) {
      // For temporary files, just delete from GridFS if ID exists
      if (gridFSId) {
        try {
          await deleteFile(gridFSId)
          console.log(`Fichier temporaire supprimé de GridFS: ${gridFSId}`)
        } catch (storageError) {
          console.error("Erreur GridFS:", storageError)
        }
      }

      return NextResponse.json({
        success: true,
        message: "Fichier temporaire supprimé avec succès",
        deletedFile: {
          id: fileId,
          gridFSId,
        },
      })
    }

    // Regular MongoDB ObjectID handling
    const fileToDelete = await File.findById(fileId)
    if (!fileToDelete) {
      return NextResponse.json({ error: "Fichier non trouvé" }, { status: 404 })
    }

    // Vérification de cohérence entre gridFSId et le document
    if (gridFSId && fileToDelete.gridFSId !== gridFSId) {
      console.warn("ID GridFS fourni ne correspond pas à celui en base")
    }

    // Utiliser le gridFSId du document si disponible
    const idToDelete = fileToDelete.gridFSId || gridFSId

    // Suppression dans GridFS
    if (idToDelete) {
      try {
        await deleteFile(idToDelete)
        console.log(`Fichier supprimé de GridFS: ${idToDelete}`)
      } catch (storageError) {
        console.error("Erreur GridFS:", storageError)
        // Ne pas échouer complètement si la suppression dans GridFS échoue
      }
    }

    // Suppression dans MongoDB
    const deleteResult = await File.findByIdAndDelete(fileId)
    if (!deleteResult) {
      return NextResponse.json({ error: "Fichier déjà supprimé" }, { status: 404 })
    }

    // Suppression de la référence dans le projet
    if (projectId) {
      await Project.findByIdAndUpdate(
        projectId,
        { $pull: { files: new mongoose.Types.ObjectId(fileId) } },
        { new: true },
      )
    } else if (fileToDelete.project) {
      // Si projectId n'est pas fourni, utiliser celui du document
      await Project.findByIdAndUpdate(
        fileToDelete.project,
        { $pull: { files: new mongoose.Types.ObjectId(fileId) } },
        { new: true },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Fichier supprimé avec succès",
      deletedFile: {
        id: fileId,
        name: fileToDelete.name,
        gridFSId: idToDelete,
      },
    })
  } catch (error) {
    console.error("Erreur lors de la suppression:", error)
    return NextResponse.json(
      {
        error: "Échec de la suppression",
        details: error instanceof Error ? error.message : String(error),
        stack: process.env.NODE_ENV === "development" ? error instanceof Error && error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
