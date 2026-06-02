/** Deep-link invite URL: rabta://group/invite/:token */
export const GROUP_INVITE_SCHEME = "rabta";

export function buildGroupInviteDeepLink(inviteToken: string): string {
  return `${GROUP_INVITE_SCHEME}://group/invite/${inviteToken}`;
}

export function parseGroupInviteTokenFromUrl(url: string): string | null {
  const match = url.match(/group\/invite\/([a-zA-Z0-9]+)/i);
  return match?.[1] ?? null;
}
