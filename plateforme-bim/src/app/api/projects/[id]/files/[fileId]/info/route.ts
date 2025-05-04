import { NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongodb"
import File from "@/models/file"

export async function GET(request: Request, { params }: { params: { id: string; fileId: string } }) {
  try {
    const { id, fileId } = params

    if (!id || !fileId) {
      return NextResponse.json({ error: "Project ID and File ID are required" }, { status: 400 })
    }

    await connectToDatabase()

    const file = await File.findById(fileId)

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Check if file belongs to the specified project
    if (file.project.toString() !== id) {
      return NextResponse.json({ error: "File does not belong to the specified project" }, { status: 403 })
    }

    return NextResponse.json({
      _id: file._id,
      name: file.name,
      file_size: file.file_size,
      fileType: file.fileType,
      version: file.version,
      uploadedAt: file.uploadedAt,
      uploadedBy: file.uploadedBy,
    })
  } catch (error) {
    console.error("Error retrieving file info:", error)
    return NextResponse.json(
      { error: "Failed to retrieve file info", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
