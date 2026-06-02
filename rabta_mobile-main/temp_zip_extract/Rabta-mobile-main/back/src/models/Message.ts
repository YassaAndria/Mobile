import mongoose, { Schema, Document } from 'mongoose';


export interface IMessage extends Document {
  chatId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  content?: string;
  messageType: 'text' | 'code_snippet' | 'image' | 'file' | 'audio' | 'call_summary';
  attachments?: {
    fileUrl: string;
    fileType: string;
    fileSize: number;
  }[];
  readBy?: mongoose.Types.ObjectId[];
  status: 'sending' | 'sent' | 'delivered' | 'read';
  isEdited: boolean;
  signal: 'high' | 'low' | 'noise';
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema: Schema = new Schema({
  chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String },
  messageType: { 
    type: String, 
    enum: ['text', 'code_snippet', 'image', 'file', 'audio', 'call_summary'], 
    default: 'text' 
  },
  attachments: [{
    fileUrl: String,
    fileType: String,
    fileSize: Number
  }],
  readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  status: { type: String, enum: ['sending', 'sent', 'delivered', 'read'], default: 'sent' },
  isEdited: { type: Boolean, default: false },
  signal: { type: String, enum: ['high', 'low', 'noise'], default: 'low' }
}, { timestamps: true });

export default mongoose.model<IMessage>('Message', MessageSchema);