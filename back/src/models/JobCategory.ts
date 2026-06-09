import mongoose, { Schema, Document } from "mongoose";

export interface IJobCategory extends Document {
  name: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

const JobCategorySchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    value: { type: String, required: true, unique: true, lowercase: true, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model<IJobCategory>("JobCategory", JobCategorySchema);
