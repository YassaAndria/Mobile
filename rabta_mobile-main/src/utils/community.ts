/**
 * community.ts
 * Shared types and mapping utilities for community/group data.
 */

import { normalizeId, formatMessagePreview } from './chatMessage';

export type CommunityRow = {
  _id: string;
  name: string;
  description?: string;
  avatar?: string;
  groupAvatar?: string;
  chatId: string;
  memberCount: number;
  isPublic?: boolean;
  isMember: boolean;
  isInvited: boolean;
  unreadCount: number;
  latestPreview: string;
  updatedAt?: string;
};

/** Map a raw API community object to a normalized CommunityRow */
export function mapCommunityFromApi(
  raw: Record<string, unknown>,
  currentUserId: string,
): CommunityRow {
  const membersArr = Array.isArray(raw.members) ? raw.members : [];
  const invitedArr = Array.isArray(raw.invitedUsers) ? raw.invitedUsers : [];

  const isMember = membersArr.some(
    (m: unknown) => normalizeId(m) === currentUserId,
  );
  const isInvited = invitedArr.some(
    (u: unknown) => normalizeId(u) === currentUserId,
  );

  // Resolve chatId
  const chatIdRaw = raw.chatId;
  let chatId = '';
  if (chatIdRaw && typeof chatIdRaw === 'object') {
    chatId = normalizeId((chatIdRaw as Record<string, unknown>)._id ?? chatIdRaw);
  } else {
    chatId = normalizeId(chatIdRaw);
  }

  // Latest message preview
  let latestPreview = '';
  let updatedAt: string | undefined;
  if (chatIdRaw && typeof chatIdRaw === 'object') {
    const chatObj = chatIdRaw as Record<string, unknown>;
    const lm = chatObj.latestMessage as Record<string, unknown> | undefined;
    if (lm) {
      latestPreview = formatMessagePreview(lm);
      updatedAt = String(lm.createdAt ?? '');
    }
    if (!updatedAt && chatObj.updatedAt) {
      updatedAt = String(chatObj.updatedAt);
    }
  }

  return {
    _id: normalizeId(raw._id),
    name: String(raw.name ?? 'Community'),
    description: raw.description ? String(raw.description) : undefined,
    avatar: raw.avatar ? String(raw.avatar) : undefined,
    groupAvatar: raw.groupAvatar ? String(raw.groupAvatar) : undefined,
    chatId,
    memberCount: membersArr.length,
    isPublic: raw.isPublic !== false,
    isMember,
    isInvited,
    unreadCount: typeof raw.unreadCount === 'number' ? raw.unreadCount : 0,
    latestPreview,
    updatedAt,
  };
}

/** Extract chatId string from a CommunityRow */
export function getCommunityChatId(item: CommunityRow): string {
  return item.chatId ?? '';
}

/** Check whether a userId is an admin/owner of a community */
export function isCommunityAdmin(
  community: { ownerId: string; adminIds: string[] },
  userId: string,
): boolean {
  if (!userId) return false;
  return (
    community.ownerId === userId || community.adminIds.includes(userId)
  );
}
