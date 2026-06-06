import mongoose, { Schema, Document } from 'mongoose';

export interface IDeviceToken extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  platform?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DeviceTokenSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true, unique: true },
  platform: { type: String }
}, { timestamps: true });

export default mongoose.model<IDeviceToken>('DeviceToken', DeviceTokenSchema);
