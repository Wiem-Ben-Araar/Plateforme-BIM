// clashDetectionJob.ts
import mongoose, { Document, Model, Schema } from "mongoose";

export interface IClashDetectionJob extends Document {
  project: mongoose.Types.ObjectId;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  files: mongoose.Types.ObjectId[];
  parameters: {
    tolerance: number;
    types?: number[];
    limitResults?: number;
    automaticGrouping?: boolean;
  };
  clashesFound: number;
  errorMessage?: string;
  results?: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
}

const ClashDetectionJobSchema: Schema<IClashDetectionJob> = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  files: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File'
  }],
  parameters: {
    tolerance: {
      type: Number,
      default: 0
    },
    types: [Number],
    limitResults: Number,
    automaticGrouping: Boolean
  },
  clashesFound: {
    type: Number,
    default: 0
  },
  errorMessage: String,
  results: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clash'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

const ClashDetectionJob: Model<IClashDetectionJob> = 
  mongoose.models.ClashDetectionJob || mongoose.model<IClashDetectionJob>("ClashDetectionJob", ClashDetectionJobSchema);

export default ClashDetectionJob;