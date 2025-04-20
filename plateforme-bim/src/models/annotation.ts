// annotation.ts - Modified
import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAnnotation extends Document {
  guid: string;
  type: 'cloud' | 'arrow' | 'text';
  title: string;
  description: string;
  status: 'open' | 'in-progress' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  author: string;
  assignedTo?: string;
  createdAt: Date;
  modifiedAt: Date;
  viewpoint: mongoose.Types.ObjectId; // Reference to Viewpoint model
  selectedElements: string[];
  position: { x: number; y: number; z: number };
  project: string;
}

const AnnotationSchema: Schema<IAnnotation> = new mongoose.Schema({
  guid: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    required: true,
    enum: ['cloud', 'arrow', 'text']
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved'],
    default: 'open'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  author: {
    type: String,
    required: true
  },
  assignedTo: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  modifiedAt: {
    type: Date,
    default: Date.now
  },
  viewpoint: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Viewpoint'
  },
  selectedElements: [String],
  position: {
    x: Number,
    y: Number,
    z: Number
  },
  project: {
    type: String,
    required: true
  }
});

// Méthodes statiques
AnnotationSchema.statics = {
  async findByProject(projectId: string): Promise<IAnnotation[]> {
    return this.find({ project: projectId }).exec();
  },

  async findByAuthor(authorId: string): Promise<IAnnotation[]> {
    return this.find({ author: authorId }).exec();
  }
};

// Middleware pour mettre à jour la date de modification
AnnotationSchema.pre<IAnnotation>('save', function(next) {
  this.modifiedAt = new Date();
  next();
});

// Modèle Mongoose
const Annotation: Model<IAnnotation> =
  mongoose.models.Annotation || mongoose.model<IAnnotation>("Annotation", AnnotationSchema);

export default Annotation;