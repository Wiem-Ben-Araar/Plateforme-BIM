import { type NextRequest, NextResponse } from "next/server"
import { getFileBuffer } from "@/lib/gridfs"
import connectToDatabase from "@/lib/mongodb"
import File from "@/models/file"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json({ error: "File ID is required" }, { status: 400 })
    }

    await connectToDatabase()

    // Check if this is a direct MongoDB ID or a GridFS ID
    let fileDoc = null
    let buffer = null
    let contentType = "application/octet-stream"
    let filename = "download"

    // Try to find the file document
    try {
      fileDoc = await File.findById(id)
    } catch (err) {
      // If not a valid MongoDB ID, try as GridFS ID
      fileDoc = await File.findOne({ gridFSId: id })
    }

    // If we found a file document
    if (fileDoc) {
      filename = fileDoc.name

      // Set content type based on file type
      if (fileDoc.fileType === "IFC") {
        contentType = "application/ifc"
      } else if (fileDoc.fileType === "PDF") {
        contentType = "application/pdf"
      } else if (fileDoc.mimeType) {
        contentType = fileDoc.mimeType
      }

      // Check if file is stored directly in MongoDB or in GridFS
      if (fileDoc.data) {
        // File is stored directly in MongoDB
        buffer = fileDoc.data
      } else if (fileDoc.gridFSId) {
        // File is stored in GridFS
        buffer = await getFileBuffer(fileDoc.gridFSId)
      } else {
        return NextResponse.json({ error: "File data not found" }, { status: 404 })
      }
    } else {
      // Try direct GridFS access as fallback
      try {
        buffer = await getFileBuffer(id)
      } catch (err) {
        return NextResponse.json({ error: "File not found" }, { status: 404 })
      }
    }

    // Check if client wants to download the file
    const isDownload = request.nextUrl.searchParams.get("download") === "true"

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        ...(isDownload ? { "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"` } : {}),
      },
    })
  } catch (error) {
    console.error("Error serving file:", error)
    return NextResponse.json(
      { error: "Failed to serve file", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
