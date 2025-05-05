import mongoose, { Document, Schema } from 'mongoose';

export interface IFile extends Document {
  name: string;
  file_url: string;
  file_size: number;
  fileType: 'IFC' | 'BCF' | 'PDF' | 'other';
  version: number;
  project: mongoose.Types.ObjectId;
  firebasePath?: string; // Add this to match your upload logic
  ifcMetadata?: {
    schema: string;
    application: string;
    creator: string;
    timestamp: Date;
    coordinates: {
      x: number;
      y: number;
      z: number;
    }
  };
  uploadedAt: Date;
  // Make this field more flexible
  uploadedBy: mongoose.Types.ObjectId | string;
}

const FileSchema: Schema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  file_url: {
    type: String,
    required: true
  },
  file_size: Number,
  fileType: {
    type: String,
    enum: ['IFC', 'BCF', 'PDF', 'other'],
    default: 'other'
  },
  version: {
    type: Number,
    default: 1
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  // Add this to match your upload logic
  firebasePath: String,
  ifcMetadata: {
    schema: String,
    application: String,
    creator: String,
    timestamp: Date,
    coordinates: {
      x: Number,
      y: Number,
      z: Number
    }
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  // Make this field accept both ObjectId and String
  uploadedBy: {
    type: Schema.Types.Mixed,
    ref: 'User'
  }
});

// Conditional registration
export default mongoose.models.File || mongoose.model<IFile>('File', FileSchema);