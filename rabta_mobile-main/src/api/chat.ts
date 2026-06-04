import axiosInstance from './axiosInstance';

const AUDIO_TIMEOUT_MS = 120_000; // 2 min — Cloudinary transcode takes time

/**
 * Upload a voice note to a chat.
 * We intentionally bypass axios here and use raw XMLHttpRequest because
 * React Native's networking layer sets the correct multipart/form-data
 * boundary automatically. With axios + manual Content-Type header the
 * boundary is missing and multer drops the connection → "Network Error".
 *
 * Backend route: POST /chats/:chatId/audio
 * Multer field: "audio"
 */
export const uploadChatAudio = async (
  chatId: string,
  formData: FormData,
): Promise<any> => {
  try {
    const res = await axiosInstance.post(`/chats/${chatId}/audio`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: AUDIO_TIMEOUT_MS,
    });
    return res.data;
  } catch (error: any) {
    const detail = error.response?.data?.message || error.response?.data || error.message || 'Network Error';
    console.error('Fetch upload error:', detail);
    throw new Error(typeof detail === 'string' ? detail : 'Network Error');
  }
};

/** Mark all messages in a chat as read for the current user */
export const markChatAsRead = (chatId: string) =>
  axiosInstance.put(`/chats/${chatId}/read`);

/** Create or fetch a direct 1-on-1 chat with a user */
export const openOrCreateDirectChat = (userId: string) =>
  axiosInstance.post('/chats', { userId });

