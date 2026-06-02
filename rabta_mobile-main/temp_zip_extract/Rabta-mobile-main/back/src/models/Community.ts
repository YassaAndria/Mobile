import mongoose, { Schema, Document } from 'mongoose';

// ==========================================
// 🏘️ موديل المجتمعات المتخصصة (Communities)
// ==========================================
// ليه عملنا collection منفصل بدل ما نضيف field في اليوزر؟
// 1. المجتمع ليه بيانات كتير خاصة بيه (اسم، وصف، أعضاء، أدمنز) مينفعش نحشرها في اليوزر
// 2. المجتمع ممكن يكبر ويبقى فيه آلاف الأعضاء، فلازم يكون مستقل عشان الأداء
// 3. كل مجتمع بيكون مرتبط بـ Chat (غرفة محادثة) عشان الأعضاء يتكلموا مع بعض
// 4. بنفصل المسؤوليات: اليوزر مسؤول عن بياناته، والمجتمع مسؤول عن أعضائه

export interface ICommunity extends Document {
  name: string;
  description: string;
  avatar?: string;
  owner: mongoose.Types.ObjectId;
  admins: mongoose.Types.ObjectId[];
  members: mongoose.Types.ObjectId[];
  chatId?: mongoose.Types.ObjectId; // الشات الجماعي المرتبط بالمجتمع
  tags?: string[];                  // تاجز عشان البحث (مثلاً: react, frontend, 2026)
  category?: string;
  isPublic: boolean;                // مجتمع عام (أي حد يقدر ينضم) ولا خاص (بدعوة بس)
  createdAt: Date;
  updatedAt: Date;
}

const CommunitySchema: Schema = new Schema({
  name: {
    type: String,
    required: [true, 'Community name is required'],
    trim: true,
    unique: true
  },
  description: {
    type: String,
    required: [true, 'Community description is required'],
    trim: true
  },
  avatar: { type: String, default: '' },
  // صاحب المجتمع (اللي أنشأه) - هو أول أدمن تلقائياً
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  // الأدمنز اللي يقدروا يديروا المجتمع (يضيفوا/يشيلوا أعضاء)
  admins: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  // كل الأعضاء (بما فيهم الأدمنز)
  members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  // ربط المجتمع بغرفة شات جماعية عشان الأعضاء يتكلموا
  chatId: { type: Schema.Types.ObjectId, ref: 'Chat' },
  tags: [{ type: String, trim: true, lowercase: true }],
  category: { type: String, trim: true, lowercase: true },
  isPublic: { type: Boolean, default: true }
}, { timestamps: true });

// فهرس للبحث السريع بالتاجز
CommunitySchema.index({ tags: 1 });

export default mongoose.model<ICommunity>('Community', CommunitySchema);
