import mongoose, { Schema, Document } from "mongoose";

export interface ISpecialization extends Document {
  name: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

const SpecializationSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Specialization name is required"],
      unique: true,
      trim: true,
    },
    value: {
      type: String,
      required: [true, "Specialization value is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<ISpecialization>("Specialization", SpecializationSchema);
