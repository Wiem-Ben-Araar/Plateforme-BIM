import { NextResponse } from "next/server"
import connectToDatabase from "@/lib/mongodb"
import File from "@/models/file"
import { getFileBuffer } from "@/lib/gridfs"

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

    // Get the file content from GridFS
    if (!file.gridFSId) {
      return NextResponse.json({ error: "File has no GridFS ID" }, { status: 500 })
    }

    const buffer = await getFileBuffer(file.gridFSId)

    // Determine content type
    let contentType = "application/octet-stream"
    if (file.fileType === "IFC") {
      contentType = "application/ifc"
    } else if (file.fileType === "PDF") {
      contentType = "application/pdf"
    }

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
      },
    })
  } catch (error) {
    console.error("Error retrieving file:", error)
    return NextResponse.json(
      { error: "Failed to retrieve file", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
