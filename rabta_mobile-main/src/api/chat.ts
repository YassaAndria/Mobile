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
  const baseURL = axiosInstance.defaults.baseURL || 'http://192.168.1.5:5000/api/v1';

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${baseURL}/chats/${chatId}/audio`);
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.timeout = AUDIO_TIMEOUT_MS;

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          resolve({ status: 'success', data: {} });
        }
      } else {
        let msg = `Server error ${xhr.status}`;
        try {
          const body = JSON.parse(xhr.responseText);
          msg = body?.message || msg;
        } catch { /* ignore */ }
        reject(new Error(msg));
      }
    };

    xhr.onerror = () => reject(new Error('Network Error'));
    xhr.ontimeout = () => reject(new Error(`Upload timed out after ${AUDIO_TIMEOUT_MS / 1000}s`));

    // DO NOT set Content-Type — React Native will add multipart boundary automatically
    xhr.send(formData);
  });
};

/** Mark all messages in a chat as read for the current user */
export const markChatAsRead = (chatId: string) =>
  axiosInstance.put(`/chats/${chatId}/read`);

/** Create or fetch a direct 1-on-1 chat with a user */
export const openOrCreateDirectChat = (userId: string) =>
  axiosInstance.post('/chats', { userId });

