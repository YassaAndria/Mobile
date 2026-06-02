import mongoose, { Schema, Document } from 'mongoose';


export interface IChat extends Document {
  isGroup: boolean;
  users: mongoose.Types.ObjectId[];
  groupName?: string;
  groupAvatar?: string;
  admins?: mongoose.Types.ObjectId[];
  isPrivate: boolean;
  latestMessage?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}


const ChatSchema: Schema = new Schema({
  isGroup: { type: Boolean, default: false },
  users: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  groupName: { type: String },
  groupAvatar: { type: String },
  admins: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  isPrivate: { type: Boolean, default: false },
  latestMessage: { type: Schema.Types.ObjectId, ref: 'Message' }
}, { timestamps: true });


export default mongoose.model<IChat>('Chat', ChatSchema);