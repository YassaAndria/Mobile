import mongoose, { Schema, Document } from "mongoose";
import crypto from "crypto";

export interface IGroupInviteToken extends Document {
  token: string;
  communityId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  expiresAt: Date;
  isActive: boolean;
  uses: number;
  maxUses?: number;
  createdAt: Date;
  updatedAt: Date;
}

const GroupInviteTokenSchema = new Schema<IGroupInviteToken>(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => crypto.randomBytes(24).toString("hex"),
    },
    communityId: {
      type: Schema.Types.ObjectId,
      ref: "Community",
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    isActive: { type: Boolean, default: true },
    uses: { type: Number, default: 0 },
    maxUses: { type: Number, default: null },
  },
  { timestamps: true },
);

GroupInviteTokenSchema.index({ communityId: 1, isActive: 1 });

export default mongoose.model<IGroupInviteToken>(
  "GroupInviteToken",
  GroupInviteTokenSchema,
);
