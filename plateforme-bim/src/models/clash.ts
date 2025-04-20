// clash.ts - Modified
import mongoose, { Document, Model, Schema } from "mongoose";

export interface IClash extends Document {
  name: string;
  guid: string;
  description: string;
  status: 'open' | 'resolved' | 'reviewing';
  project: mongoose.Types.ObjectId;
  detectedAt: Date;
  resolvedAt?: Date;
  reportedBy: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId;
  elements: mongoose.Types.ObjectId[];
  elementData: {
    element1: {
      id: string;
      modelID: string;
      type: number;
      typeName: string;
      name: string;
    },
    element2: {
      id: string;
      modelID: string;
      type: number;
      typeName: string;
      name: string;
    }
  };
  distance: number;
  severity: number;
  category: string;
  resolution?: string;
  relatedAnnotations: mongoose.Types.ObjectId[];
  viewpoint: mongoose.Types.ObjectId; // Reference to Viewpoint model
  snapshot?: string;
}

const ClashSchema: Schema<IClash> = new mongoose.Schema({
  name: { type: String, required: true },
  guid: { type: String, required: true, unique: true },
  description: String,
  status: {
    type: String,
    enum: ['open', 'resolved', 'reviewing'],
    default: 'open'
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  detectedAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: Date,
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  elements: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Element'
  }],
  elementData: {
    element1: {
      id: String,
      modelID: String,
      type: Number,
      typeName: String,
      name: String
    },
    element2: {
      id: String,
      modelID: String,
      type: Number,
      typeName: String,
      name: String
    }
  },
  distance: {
    type: Number,
    default: 0
  },
  severity: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  category: {
    type: String,
    enum: ['structural', 'MEP', 'architectural', 'other'],
    default: 'other'
  },
  resolution: String,
  relatedAnnotations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Annotation'
  }],
  viewpoint: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Viewpoint'
  },
  snapshot: String
});

// Méthodes statiques
ClashSchema.statics = {
  async findByProject(projectId: string): Promise<IClash[]> {
    return this.find({ project: projectId }).exec();
  },
  
  async findByStatus(status: string): Promise<IClash[]> {
    return this.find({ status }).exec();
  },
  
  async findBySeverity(minSeverity: number): Promise<IClash[]> {
    return this.find({ severity: { $gte: minSeverity } }).exec();
  }
};

const Clash: Model<IClash> = 
  mongoose.models.Clash || mongoose.model<IClash>("Clash", ClashSchema);

export default Clash;