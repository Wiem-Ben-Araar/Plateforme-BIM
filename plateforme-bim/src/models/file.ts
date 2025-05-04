import mongoose, { type Document, Schema } from "mongoose"

export interface IFile extends Document {
  name: string
  file_url: string // This will now be a URL to our API endpoint
  file_size: number
  fileType: "IFC" | "BCF" | "PDF" | "other"
  version: number
  project: mongoose.Types.ObjectId
  gridFSId?: string // Replace firebasePath with gridFSId
  ifcMetadata?: {
    schema: string
    application: string
    creator: string
    timestamp: Date
    coordinates: {
      x: number
      y: number
      z: number
    }
  }
  uploadedAt: Date
  uploadedBy: mongoose.Types.ObjectId | string
}

const FileSchema: Schema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  file_url: {
    type: String,
    required: true,
  },
  file_size: Number,
  fileType: {
    type: String,
    enum: ["IFC", "BCF", "PDF", "other"],
    default: "other",
  },
  version: {
    type: Number,
    default: 1,
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true,
  },
  // Replace firebasePath with gridFSId
  gridFSId: String,
  ifcMetadata: {
    schema: String,
    application: String,
    creator: String,
    timestamp: Date,
    coordinates: {
      x: Number,
      y: Number,
      z: Number,
    },
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  uploadedBy: {
    type: Schema.Types.Mixed,
    ref: "User",
  },
})

// Conditional registration
export default mongoose.models.File || mongoose.model<IFile>("File", FileSchema)
