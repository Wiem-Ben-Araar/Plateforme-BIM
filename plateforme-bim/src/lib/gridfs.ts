import mongoose from "mongoose"
import { GridFSBucket } from "mongodb"
import connectToDatabase from "@/lib/mongodb"

let bucket: GridFSBucket | null = null

export async function getGridFSBucket(): Promise<GridFSBucket> {
  if (!bucket) {
    await connectToDatabase()
    const db = mongoose.connection.db
    bucket = new GridFSBucket(db, {
      bucketName: "files",
    })
  }
  return bucket
}

export async function uploadFile(
  fileBuffer: Buffer,
  filename: string,
  metadata: Record<string, any>,
): Promise<{ id: string; filename: string }> {
  const bucket = await getGridFSBucket()

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      metadata,
    })

    uploadStream.end(fileBuffer)

    uploadStream.on("finish", () => {
      resolve({
        id: uploadStream.id.toString(),
        filename: filename,
      })
    })

    uploadStream.on("error", (error) => {
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
