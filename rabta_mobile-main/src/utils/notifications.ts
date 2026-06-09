import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import axiosInstance from '../api/axiosInstance';

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (!Device.isDevice) {
    console.log('[PushNotifications] Must use physical device for Push Notifications');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[PushNotifications] Failed to get push token for push notification!');
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    'efd9bc7e-d285-45a4-a4e2-1316dbbebdcb';

  if (!projectId) {
    console.log('[PushNotifications] No projectId found in Expo Config');
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    return tokenData.data;
  } catch (error) {
    console.error('[PushNotifications] Error fetching expo push token:', error);
    return null;
  }
}

export async function registerDeviceTokenWithBackend(token: string) {
  try {
    const response = await axiosInstance.post('/notifications/register-device', {
      token,
      platform: Platform.OS,
    });
    console.log('[PushNotifications] Token registered with backend:', response.data);
  } catch (error: any) {
    console.error('[PushNotifications] Failed to register token with backend:', error?.response?.data || error.message);
  }
}

export async function unregisterDeviceTokenWithBackend(token: string) {
  try {
    const response = await axiosInstance.post('/notifications/unregister-device', {
      token,
    });
    console.log('[PushNotifications] Token unregistered from backend:', response.data);
  } catch (error: any) {
    console.error('[PushNotifications] Failed to unregister token from backend:', error?.response?.data || error.message);
  }
}
