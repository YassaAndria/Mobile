/**
 * Invite Utilities - Managing invitation messages and links
 */

export const DOWNLOAD_LINK = 'https://rabta.app/download';
export const APP_NAME = 'Rabta';

/**
 * Generate a professional invite message
 * @param recipientName - Name of the person being invited (optional)
 * @returns Formatted invite message
 */
export function generateInviteMessage(recipientName?: string): string {
  const name = recipientName ? ` ${recipientName}` : '';
  
  return `Hey${name}! 👋\n\nI'm using ${APP_NAME} - a professional networking app that brings together freelancers, employers, and businesses.\n\nThink of it as LinkedIn meets WhatsApp! 💼\n\nJoin me here: ${DOWNLOAD_LINK}\n\nLet's connect! 🚀`;
}

/**
 * Share invite with contact details
 * Used when sharing contacts across platforms
 */
export const inviteShareConfig = {
  title: `Join ${APP_NAME}`,
  // Message will be added dynamically
  url: DOWNLOAD_LINK, // iOS support
};
