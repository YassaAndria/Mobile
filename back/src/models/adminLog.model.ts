import mongoose, { Document, Schema } from 'mongoose';

export interface IAdminLog extends Document {
  adminId: mongoose.Types.ObjectId;
  adminName: string;
  actionType: string;
  targetName: string;
  category?: 'Manual' | 'AI';
  aiReason?: string;
  targetUserId?: mongoose.Types.ObjectId;
  relatedMessageContent?: string;
  isReverted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const adminLogSchema = new Schema<IAdminLog>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    adminName: {
      type: String,
      required: true,
    },
    actionType: {
      type: String,
      required: true,
    },
    targetName: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['Manual', 'AI'],
      default: 'Manual',
    },
    aiReason: {
      type: String,
    },
    targetUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    relatedMessageContent: {
      type: String,
    },
    isReverted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const AdminLog = mongoose.model<IAdminLog>('AdminLog', adminLogSchema);

export default AdminLog;