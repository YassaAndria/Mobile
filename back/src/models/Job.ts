import mongoose, { Schema, Document } from 'mongoose';


export interface IJob extends Document {
  publisherId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  jobType: 'freelance' | 'full_time' | 'part_time' | 'internship';
  requiredSkills?: string[];
  budgetOrSalary?: string;
  responsibilities?: string[];
  requirements?: string[];
  category?: string;
  workLocation?: 'remote' | 'onsite';
  location?: string;
  status: 'open' | 'closed';
  applicants?: {
    userId: mongoose.Types.ObjectId;
    proposal: string;
    status: 'pending' | 'accepted' | 'rejected';
    appliedAt: Date;
    matchScore?: number;
    matchReason?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}


const JobSchema: Schema = new Schema({
  publisherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  jobType: { 
    type: String, 
    enum: ['freelance', 'full_time', 'part_time', 'internship'], 
    required: true 
  },
  requiredSkills: [{ type: String }],
  budgetOrSalary: { type: String },
  responsibilities: [{ type: String }],
  requirements: [{ type: String }],
  category: { type: String, trim: true },
  workLocation: { type: String, enum: ['remote', 'onsite'] },
  location: { type: String },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  applicants: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    proposal: { type: String, required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    appliedAt: { type: Date, default: Date.now },
    matchScore: { type: Number },
    matchReason: { type: String }
  }]
}, { timestamps: true });

export default mongoose.model<IJob>('Job', JobSchema);