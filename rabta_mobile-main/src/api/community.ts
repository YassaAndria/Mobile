/**
 * src/api/community.ts
 * All community / group API calls — backed by /groups routes on the server.
 */

import axiosInstance from './axiosInstance';

// ─── List & Search ───────────────────────────────────────────────────────────

/** List communities the current user is a member of (optionally filtered by category) */
export const listCommunities = (category?: string) =>
  axiosInstance.get('/groups', { params: category ? { category } : undefined });

/** Global search for public communities */
export const searchCommunities = (q: string) =>
  axiosInstance.get('/groups/search', { params: { q } });

/** Get a single community by ID */
export const getCommunity = (id: string) =>
  axiosInstance.get(`/groups/${id}`);

/** Alias for group details screen */
export const fetchGroupDetails = (groupId: string) => getCommunity(groupId);

/** Member: generate a unique invite token for deep linking */
export const generateInviteLink = (groupId: string) =>
  axiosInstance.post(`/groups/${groupId}/invite-link`);

/** Preview group info from invite token (join confirmation screen) */
export const previewInviteGroup = (inviteToken: string) =>
  axiosInstance.get(`/groups/invite/${inviteToken}`);

/** Join group when user opens rabta://group/invite/:token */
export const joinGroupViaLink = (inviteToken: string) =>
  axiosInstance.post(`/groups/invite/${inviteToken}/join`);

// ─── Join / Leave ────────────────────────────────────────────────────────────

/** Join a public community (or send a request for a private one) */
export const joinCommunity = (id: string) =>
  axiosInstance.post(`/groups/${id}/join`);

/** Leave a community */
export const leaveCommunity = (id: string) =>
  axiosInstance.post(`/groups/${id}/leave`);

// ─── Invitations ─────────────────────────────────────────────────────────────

/** Accept a pending invitation to a community */
export const acceptCommunityInvite = (id: string) =>
  axiosInstance.post(`/groups/${id}/invite/accept`);

/** Decline a pending invitation to a community */
export const declineCommunityInvite = (id: string) =>
  axiosInstance.post(`/groups/${id}/invite/decline`);

/** Admin: invite / add a user to a community */
export const inviteCommunityMember = (communityId: string, userId: string) =>
  axiosInstance.post(`/groups/${communityId}/members`, { userId });

/** Admin: remove a member from a community */
export const removeCommunityMember = (communityId: string, userId: string) =>
  axiosInstance.put('/chats/group/remove', { chatId: communityId, userId });

// ─── Join Requests ───────────────────────────────────────────────────────────

/** Admin: accept or reject a pending join request */
export const manageJoinRequest = (
  communityId: string,
  userId: string,
  action: 'accept' | 'reject',
) =>
  axiosInstance.put(`/groups/${communityId}/requests/${userId}`, { action });

// ─── Create / Delete ─────────────────────────────────────────────────────────

/** Create a new community */
export const createCommunity = (body: {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  isPublic?: boolean;
  invitedUsers?: string[];
}) => axiosInstance.post('/groups', body);

/** Delete a community (owner/admin only) */
export const deleteCommunity = (id: string) =>
  axiosInstance.delete(`/groups/${id}`);

// ─── Feed ────────────────────────────────────────────────────────────────────

/** Get the feed for a community */
export const getCommunityFeed = (communityId: string) =>
  axiosInstance.get(`/groups/${communityId}/feed`);

/** Create a post in a community's feed */
export const createCommunityPost = (communityId: string, content: string) =>
  axiosInstance.post('/posts', { content, communityId });

/** Toggle like on a post */
export const togglePostLike = (postId: string) =>
  axiosInstance.post(`/posts/${postId}/like`);

/** Add a comment to a post */
export const addPostComment = (postId: string, content: string) =>
  axiosInstance.post(`/posts/${postId}/comments`, { content });

// ─── Users search (for invite) ───────────────────────────────────────────────

/** Search global users by name/email — used for member invite */
export const searchUsers = (q: string) =>
  axiosInstance.get('/users/search/all', { params: { search: q } });
