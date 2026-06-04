/**
 * App Download Links Configuration
 * Update these links to point to your actual app stores
 */

export const APP_STORE_LINKS = {
  // iOS App Store
  iOS: 'https://apps.apple.com/app/id1234567890', // TODO: Replace with your App ID
  
  // Google Play Store
  android: 'https://play.google.com/store/apps/details?id=com.rabta.app', // TODO: Replace with your package name
  
  // Web fallback or generic link
  web: 'https://rabta.app/download',
  
  // Generic download that redirects based on device
  universal: 'https://rabta.app/download'
};

/**
 * Generate device-specific download link
 * @param deviceOS - 'ios' | 'android' | 'web'
 * @returns Download link
 */
export function getDownloadLink(deviceOS?: string): string {
  if (deviceOS === 'ios') {
    return APP_STORE_LINKS.iOS;
  } else if (deviceOS === 'android') {
    return APP_STORE_LINKS.android;
  }
  return APP_STORE_LINKS.universal;
}
