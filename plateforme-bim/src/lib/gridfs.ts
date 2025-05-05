import mongoose from "mongoose"
import { GridFSBucket } from "mongodb"
import connectToDatabase from "@/lib/mongodb"
import { Readable } from "stream"

// Increased chunk size for better performance with large files
const CHUNK_SIZE = 2 * 1024 * 1024 // 2MB chunks instead of default 255KB

let bucket: GridFSBucket | null = null

export async function getGridFSBucket(): Promise<GridFSBucket> {
  if (!bucket) {
    await connectToDatabase()
    const db = mongoose.connection.db
    bucket = new GridFSBucket(db, {
      bucketName: "files",
      chunkSizeBytes: CHUNK_SIZE,
    })
  }
  return bucket
}

export async function uploadFile(
  fileBuffer: Buffer,
  filename: string,
  metadata: Record<string, any>,
): Promise<{ id: string; filename: string }> {
  console.log(`Starting GridFS upload for ${filename}, size: ${fileBuffer.length / (1024 * 1024)} MB`)
  const startTime = Date.now()
  const bucket = await getGridFSBucket()

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      metadata,
      chunkSizeBytes: CHUNK_SIZE,
    })

    // Créer un stream à partir du buffer
    const readableStream = new Readable()
    readableStream.push(fileBuffer)
    readableStream.push(null) // Signaler la fin des données

    // Pipe le stream vers GridFS
    readableStream.pipe(uploadStream)
      .on("finish", () => {
        const endTime = Date.now()
        console.log(`GridFS upload completed in ${endTime - startTime}ms for ${filename}`)
        resolve({
          id: uploadStream.id.toString(),
          filename: filename,
        })
      })
      .on("error", (error) => {
        console.error(`GridFS upload error for ${filename}:`, error)
        reject(error)
      })
  })
}

export async function getFileStream(fileId: string) {
  const bucket = await getGridFSBucket()
  return bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId))
}

export async function getFileBuffer(fileId: string): Promise<Buffer> {
  const bucket = await getGridFSBucket()
  const stream = bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId))

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []

    stream.on("data", (chunk) => {
      chunks.push(Buffer.from(chunk))
    })

    stream.on("end", () => {
      resolve(Buffer.concat(chunks))
    })

    stream.on("error", (error) => {
      reject(error)
    })
  })
}

export async function deleteFile(fileId: string): Promise<boolean> {
  const bucket = await getGridFSBucket()

  return new Promise((resolve, reject) => {
    bucket.delete(new mongoose.Types.ObjectId(fileId), (error) => {
      if (error) {
        reject(error)
        return
      }
      resolve(true)
    })
  })
}
