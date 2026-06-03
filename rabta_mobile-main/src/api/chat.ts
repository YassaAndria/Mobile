import axiosInstance from './axiosInstance';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const token = await AsyncStorage.getItem('token');
  const baseURL = axiosInstance.defaults.baseURL || 'http://192.168.1.3:5000/api/v1';

  try {
    const res = await fetch(`${baseURL}/chats/${chatId}/audio`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        // Do not set Content-Type here, let fetch handle the boundary
      },
      body: formData,
    });

    if (!res.ok) {
      let errorMsg = `Server error ${res.status}`;
      try {
        const errBody = await res.json();
        errorMsg = errBody.message || errorMsg;
      } catch {
        const errText = await res.text();
        errorMsg = errText || errorMsg;
      }
      throw new Error(errorMsg);
    }
    return await res.json();
  } catch (error: any) {
    console.error('Fetch upload error:', error.message);
    throw new Error(error.message || 'Network Error');
  }
};

/** Mark all messages in a chat as read for the current user */
export const markChatAsRead = (chatId: string) =>
  axiosInstance.put(`/chats/${chatId}/read`);

/** Create or fetch a direct 1-on-1 chat with a user */
export const openOrCreateDirectChat = (userId: string) =>
  axiosInstance.post('/chats', { userId });

