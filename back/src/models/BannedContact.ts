import mongoose, { Schema, Document } from 'mongoose';

export interface IBannedContact extends Document {
  email?: string;
  phoneNumber?: string;
  bannedAt: Date;
}

const BannedContactSchema: Schema = new Schema({
  email: {
    type: String,
    lowercase: true,
    trim: true,
    sparse: true
  },
  phoneNumber: {
    type: String,
    trim: true,
    sparse: true
  },
  bannedAt: {
    type: Date,
    default: Date.now
  }
});

const BannedContact = mongoose.model<IBannedContact>('BannedContact', BannedContactSchema);
export default BannedContact;