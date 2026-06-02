/**
 * chatMessage.ts
 * Shared utilities for message formatting and ID normalization.
 */

/** Normalize any ID value to a plain string */
export function normalizeId(id: unknown): string {
  if (!id) return '';
  if (typeof id === 'string') return id;
  if (typeof id === 'object' && id !== null) {
    const obj = id as Record<string, unknown>;
    if (typeof obj._id === 'string') return obj._id;
    if (typeof obj.id === 'string') return obj.id;
    return String(id);
  }
  return String(id);
}

type MessageLike = {
  content?: string;
  text?: string;
  body?: string;
  type?: string;
  messageType?: string;
  fileType?: string;
  mimeType?: string;
  senderId?: { fullName?: string } | string;
  senderName?: string;
};

/** Return a short preview string for a message to display in the chat list */
export function formatMessagePreview(msg: MessageLike): string {
  const type = msg.messageType ?? msg.type ?? msg.fileType ?? msg.mimeType ?? '';
  if (type === 'audio' || (typeof type === 'string' && type.startsWith('audio'))) {
    return '🎵 Voice note';
  }
  if (type === 'image' || (typeof type === 'string' && type.startsWith('image'))) {
    return '📷 Photo';
  }
  if (type === 'video' || (typeof type === 'string' && type.startsWith('video'))) {
    return '🎥 Video';
  }
  if (type === 'file' || (typeof type === 'string' && type.startsWith('application'))) {
    return '📎 File';
  }
  
  let text = msg.content ?? msg.text ?? msg.body ?? '';
  // Fallback if type is missing but content is a cloudinary URL
  if (text.includes('res.cloudinary.com')) {
    if (text.includes('/video/upload/') || text.endsWith('.mp4') || text.endsWith('.webm') || text.endsWith('.m4a')) {
       return '🎵 Voice note'; // Using voice note as it's the most common video upload type in this app context
    }
    if (text.includes('/image/upload/') || text.match(/\.(jpeg|jpg|gif|png|webp)$/)) {
       return '📷 Photo';
    }
    return '📎 Attachment';
  }
  
  return text.length > 60 ? text.slice(0, 60) + '…' : text;
}
