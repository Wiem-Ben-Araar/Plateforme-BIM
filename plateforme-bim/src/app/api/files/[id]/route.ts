import { type NextRequest, NextResponse } from "next/server"
import { getFileStream, getFileBuffer } from "@/lib/gridfs"
import connectToDatabase from "@/lib/mongodb"
import File from "@/models/file"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json({ error: "File ID is required" }, { status: 400 })
    }

    await connectToDatabase()

    // First check if this is a direct GridFS ID or a File document ID
    let gridFSId = id

    // If it's a File document ID, get the gridFSId from it
    if (id.length === 24) {
      // MongoDB ObjectId length
      try {
        const fileDoc = await File.findById(id)
        if (fileDoc && fileDoc.gridFSId) {
          gridFSId = fileDoc.gridFSId
        }
      } catch (err) {
        // If error, assume it's a direct GridFS ID
        console.log("Not a File document ID, treating as GridFS ID")
      }
    }

    // Check if client wants to download the file
    const isDownload = request.nextUrl.searchParams.get("download") === "true"

    if (isDownload) {
      // For downloads, we need to get the full buffer
      const buffer = await getFileBuffer(gridFSId)

      // Get file info from File model if possible
      let filename = "download"
      let contentType = "application/octet-stream"

      try {
        const fileDoc = await File.findOne({ gridFSId })
        if (fileDoc) {
          filename = fileDoc.name
          if (fileDoc.fileType === "IFC") {
            contentType = "application/ifc"
          } else if (fileDoc.fileType === "PDF") {
            contentType = "application/pdf"
          }
        }
      } catch (err) {
        console.error("Error getting file info:", err)
      }

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        },
      })
    } else {
      // For streaming (e.g., viewing in browser)
      const stream = await getFileStream(gridFSId)

      // Get file info from File model if possible
      let contentType = "application/octet-stream"

      try {
        const fileDoc = await File.findOne({ gridFSId })
        if (fileDoc) {
          if (fileDoc.fileType === "IFC") {
            contentType = "application/ifc"
          } else if (fileDoc.fileType === "PDF") {
            contentType = "application/pdf"
          }
        }
      } catch (err) {
        console.error("Error getting file info:", err)
      }

      // Convert stream to Response
      const chunks: Uint8Array[] = []
      for await (const chunk of stream) {
        chunks.push(chunk)
      }

      const buffer = Buffer.concat(chunks)

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": contentType,
        },
      })
    }
  } catch (error) {
    console.error("Error serving file:", error)
    return NextResponse.json(
      { error: "Failed to serve file", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
