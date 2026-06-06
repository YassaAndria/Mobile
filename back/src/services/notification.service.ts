import DeviceToken from '../models/DeviceToken';

export const sendPushToUsers = async (
  userIds: string[],
  payload: { title: string; body: string; data?: Record<string, any> }
) => {
  try {
    const stringUserIds = userIds.map(id => id.toString());
    
    // Find all tokens for these users
    const devices = await DeviceToken.find({ userId: { $in: stringUserIds } });
    if (devices.length === 0) {
      console.log(`🔔 No push tokens found for users: ${stringUserIds}`);
      return;
    }

    const messages = devices.map(device => ({
      to: device.token,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
    }));

    console.log(`🔔 Sending push notification to ${messages.length} device(s)`);

    // Chunk to 100 to respect Expo guidelines
    const chunkSize = 100;
    for (let i = 0; i < messages.length; i += chunkSize) {
      const chunk = messages.slice(i, i + chunkSize);
      const response = await fetch('https://api.expo.dev/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(chunk),
      });

      const result = await response.json();
      console.log('🔔 Expo response:', JSON.stringify(result));
    }
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
  }
};
