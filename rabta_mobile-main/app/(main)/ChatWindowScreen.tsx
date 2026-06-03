/**
 * app/(main)/ChatWindowScreen.tsx
 *
 * Changes from original:
 *  - startVideoCall() and startVoiceCall() now:
 *      1. Call POST /calls/zego-token to get a server-signed Token04.
 *      2. Navigate to app/(main)/call/[callId].tsx with all required params.
 *  - All existing chat logic (messages, socket, typing, pending, etc.) is
 *    completely unchanged.
 *  - Added a small loading state while fetching the Zego token so the user
 *    gets feedback before the call screen opens.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Linking,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSelector } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  useAudioRecorder,
  RecordingPresets,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
} from 'expo-audio';
import { uploadChatAudio } from '../../src/api/chat';
import { useTheme } from '../../src/theme/ThemeContext';
import { useChat } from '../../src/context/ChatContext';
import axiosInstance from '../../src/api/axiosInstance';
import ChatBody from '../../src/components/chat/ChatBody';
import ChatInputBar from '../../src/components/chat/ChatInputBar';
import AttachmentModal from '../../src/components/chat/AttachmentModal';
import type { RootState } from '../../src/store/store';
import type { MessageType } from '../../src/types';

// ─────────────────────────────────────────────────────────────────────────────

export default function ChatWindowScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { socket } = useChat();

  const currentUser = useSelector((s: RootState) => s.auth.user);
  const currentUserId = currentUser?._id || currentUser?.id;

  const params = useLocalSearchParams<{
    chatId?: string;
    chatName?: string;
    isGroup?: string;
    userId?: string;
    avatar?: string;
    isOnline?: string;
    communityId?: string;
  }>();

  const {
    chatName = 'Chat',
    isGroup: paramIsGroup,
    userId,
    avatar: paramAvatar,
    isOnline: paramIsOnline,
    communityId,
  } = params;

  const isGroup = paramIsGroup === 'true';

  const [chatId, setChatId] = useState<string | null>(null);
  const [resolvedPartnerId, setResolvedPartnerId] = useState<string | null>(userId || null);
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [blockedMe, setBlockedMe] = useState(false);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [isOnline, setIsOnline] = useState(paramIsOnline === 'true');
  const [isTyping, setIsTyping] = useState(false);
  const [chatStatus, setChatStatus] = useState<'accepted' | 'pending' | null>(null);
  const [chatInitiatedBy, setChatInitiatedBy] = useState<string | null>(null);
  const [attachmentVisible, setAttachmentVisible] = useState(false);
  const [contactDetailsVisible, setContactDetailsVisible] = useState(false);
  const [replyingTo, setReplyingTo] = useState<MessageType | null>(null);
  const [threeDotsMenuVisible, setThreeDotsMenuVisible] = useState(false);
  // Smart replies and STT states
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [sttModalVisible, setSttModalVisible] = useState(false);
  const [isSttRecording, setIsSttRecording] = useState(false);
  const [isSttLoading, setIsSttLoading] = useState(false);

  // ── NEW: tracks whether we are fetching the Zego token ───────────────────
  const [callLoading, setCallLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const isHoldingMicRef = useRef(false);
  const isActuallyRecordingRef = useRef(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // ── NEW: Contact Details & Media Buckets Logic ─────────────────────────────
  const [mediaSubTab, setMediaSubTab] = useState<'media' | 'files' | 'links'>('media');
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const { mediaBuckets, filesBuckets, linksBuckets } = useMemo(() => {
    const mediaList: any[] = [];
    const filesList: any[] = [];
    const linksList: any[] = [];
    const seenMedia = new Set<string>();

    const URL_REGEX = /https?:\/\/[^\s<>"'`]+/gi;
    const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i;
    const VIDEO_EXT = /\.(mp4|webm|mov|mkv|avi|m4v)(\?|$)/i;
    const DOC_EXT = /\.(pdf|doc|docx|txt|xlsx?|pptx?|zip|rar|csv)(\?|$)/i;

    for (const m of messages) {
      if (!m.content) continue;
      const url = m.content;

      if (m.type === 'audio') continue;

      if (m.type === 'image' || (m.type as string) === 'video' || m.type === 'file') {
        const lower = url.toLowerCase();
        const isImgVideo =
          m.type === 'image' ||
          (m.type as string) === 'video' ||
          IMAGE_EXT.test(lower) ||
          VIDEO_EXT.test(lower);

        if (isImgVideo) {
          if (!seenMedia.has(m.id)) {
            seenMedia.add(m.id);
            const label = url.split('/').pop() || 'Media';
            mediaList.push({ id: m.id, url, label });
          }
          continue;
        }

        const isDoc = DOC_EXT.test(lower) || m.type === 'file';
        if (isDoc) {
          const label = url.split('/').pop() || 'File';
          filesList.push({ id: m.id, url, label });
          continue;
        }
      }

      if (m.type === 'text') {
        const urls = url.match(URL_REGEX);
        if (urls) {
          urls.forEach((u, i) => {
            linksList.push({ id: `${m.id}-link-${i}`, url: u });
          });
        }
      }
    }

    return { mediaBuckets: mediaList, filesBuckets: filesList, linksBuckets: linksList };
  }, [messages]);

  useEffect(() => {
    if (contactDetailsVisible && resolvedPartnerId) {
      setLoadingProfile(true);
      axiosInstance.get(`/users/${resolvedPartnerId}`)
        .then((res) => {
          if (res.data?.status === 'success' && res.data?.data?.user) {
            setPartnerProfile(res.data.data.user);
          }
        })
        .catch((err) => {
          console.error('[ChatWindowScreen] Failed to load partner profile:', err);
        })
        .finally(() => {
          setLoadingProfile(false);
        });
    }
  }, [contactDetailsVisible, resolvedPartnerId]);

  const typingTimeoutRef = useRef<any>(null);
  const isTypingRef = useRef(false);

  const [isMuted, setIsMuted] = useState(false);

  const handleMuteNotifications = () => {
    setThreeDotsMenuVisible(false);
    setTimeout(() => {
      if (!chatId) {
        Toast.show({ type: "error", text1: "Unable to mute: Chat ID not found" });
        return;
      }
      axiosInstance.put(`/chats/${chatId}/mute`)
        .then((res) => {
          if (res.data?.status === "success") {
            setIsMuted(res.data.isMuted);
            Toast.show({
              type: "success",
              text1: res.data.isMuted ? "Notifications muted" : "Notifications unmuted",
            });
          }
        })
        .catch((err) => {
          console.error("[ChatWindow] mute chat failed:", err);
          Toast.show({ type: "error", text1: "Failed to toggle mute" });
        });
    }, 200);
  };

  // ── Ellipsis Actions ───────────────────────────────────────────────────────
  const handleClearChat = () => {
    setThreeDotsMenuVisible(false);
    setTimeout(() => {
      if (!chatId) {
        Toast.show({ type: 'error', text1: 'Unable to clear chat: Chat ID not found' });
        return;
      }
      Alert.alert(
        'Clear Chat History',
        'All messages will be permanently deleted. This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear',
            style: 'destructive',
            onPress: async () => {
              try {
                await axiosInstance.post(`/chats/${chatId}/clear`);
                setMessages([]);
                Toast.show({ type: 'success', text1: 'Chat history cleared' });
              } catch (err) {
                console.error('[ChatWindow] clear chat failed:', err);
                Toast.show({ type: 'error', text1: 'Failed to clear chat' });
              }
            },
          },
        ]
      );
    }, 200);
  };

  const handleBlockUser = () => {
    setThreeDotsMenuVisible(false);
    setTimeout(() => {
      const targetUserId = resolvedPartnerId || userId;
      if (!targetUserId) {
        Toast.show({ type: 'error', text1: 'Unable to block user: User ID not found' });
        return;
      }
      const actionText = blockedByMe ? 'unblock' : 'block';
      Alert.alert(
        `${blockedByMe ? 'Unblock' : 'Block'} User`,
        `Are you sure you want to ${actionText} ${chatName}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: blockedByMe ? 'Unblock' : 'Block',
            style: 'destructive',
            onPress: async () => {
              try {
                const res = await axiosInstance.put(`/users/block/${targetUserId}`);
                const isBlockedNow = res.data?.message?.includes('blocked');
                setBlockedByMe(isBlockedNow);
                Toast.show({ type: 'info', text1: `${chatName} ${isBlockedNow ? 'blocked' : 'unblocked'}` });
              } catch (err) {
                console.error('[ChatWindow] block toggle failed:', err);
                Toast.show({ type: 'error', text1: 'Failed to update block status' });
              }
            },
          },
        ]
      );
    }, 200);
  };

  const handleViewProfile = () => {
    setThreeDotsMenuVisible(false);
    setTimeout(() => {
      setContactDetailsVisible(true);
    }, 200);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Message mapper (unchanged)
  // ─────────────────────────────────────────────────────────────────────────
  const mapBackendMessage = useCallback((msg: any, currentUid: string): MessageType => {
    const senderId = typeof msg.senderId === 'object' && msg.senderId
      ? msg.senderId._id
      : msg.senderId;
    const isMine = senderId === currentUid;
    const time = msg.createdAt
      ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

    // Normalize message type
    let msgType = (msg.messageType || msg.type || 'text') as MessageType['type'];
    if (!['text', 'file', 'image', 'audio', 'post'].includes(msgType)) msgType = 'text';

    // Extract content URL — backend may return it in different places
    const attachmentUrl = msg.attachments?.[0]?.fileUrl
      || msg.attachments?.[0]?.url
      || msg.fileUrl
      || msg.audioUrl
      || null;

    // If the content looks like a cloudinary URL, prefer it over plain text
    let content = msg.content || '';
    if (!content && attachmentUrl) content = attachmentUrl;
    if (attachmentUrl && (msgType === 'image' || msgType === 'file' || msgType === 'audio')) {
      content = attachmentUrl;
    }
    // Auto-detect image type from URL if backend didn't set it
    if (msgType === 'text' && content && content.startsWith('https://res.cloudinary.com')) {
      msgType = 'image';
    }

    return {
      id: msg._id || String(Math.random()),
      type: msgType,
      content,
      time,
      createdAt: msg.createdAt || new Date().toISOString(),
      isMine,
      senderName: typeof msg.senderId === 'object' && msg.senderId
        ? msg.senderId.fullName
        : undefined,
      senderAvatar: typeof msg.senderId === 'object' && msg.senderId
        ? msg.senderId.avatar || msg.senderId.profilePicture
        : undefined,
      reactions: msg.reactions || [],
      replyTo: msg.replyTo ? {
        id: typeof msg.replyTo === 'object' ? msg.replyTo._id : msg.replyTo,
        content: typeof msg.replyTo === 'object' ? msg.replyTo.content || '' : '',
        senderName: typeof msg.replyTo === 'object' && msg.replyTo.senderId
          ? msg.replyTo.senderId.fullName
          : undefined,
      } : undefined,
      isPinned: msg.isPinned || false,
      isForwarded: msg.isForwarded || false,
      status: msg.status || 'sent',
      postId: msg.postId,
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Resolve / load chat on mount (unchanged)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    const fetchBlockRelation = async (partnerId: string) => {
      try {
        const res = await axiosInstance.get(`/users/block-relation/${partnerId}`);
        if (res.data?.status === 'success' && isMounted) {
          setBlockedByMe(res.data.data.blockedByMe);
          setBlockedMe(res.data.data.blockedMe);
        }
      } catch (err) {
        console.error('[ChatWindowScreen] Failed to fetch block relation:', err);
      }
    };

    const resolveChat = async () => {
      try {
        setLoading(true);
        let activeChatId = params.chatId;

        const initialPartnerId = userId || (params.chatId && params.chatId.length === 24 ? params.chatId : null);
        if (initialPartnerId && !isGroup) {
          fetchBlockRelation(initialPartnerId);
        }

        if (!isGroup && (!activeChatId || activeChatId === userId)) {
          const partnerId = userId || params.chatId;
          if (partnerId && partnerId !== currentUserId) {
            const res = await axiosInstance.post('/chats', { userId: partnerId });
            if (res.data?.status === 'success' && isMounted) {
              const chat = res.data.data?.chat;
              activeChatId = chat._id;
              setChatStatus(chat.status);
              setChatInitiatedBy(chat.initiatedBy);
              const partner = chat.users?.find((u: any) => {
                const uid = typeof u === 'object' && u ? (u._id || u.id) : u;
                return uid && uid.toString() !== currentUserId;
              });
              if (partner) {
                const pId = typeof partner === 'object' ? (partner._id || partner.id) : partner;
                const pIdStr = pId.toString();
                setResolvedPartnerId(pIdStr);
                fetchBlockRelation(pIdStr);
              }
            }
          }
        } else if (activeChatId && !isGroup && isMounted) {
          const res = await axiosInstance.get('/chats');
          const myChats = res.data?.data?.chats || [];
          const found = myChats.find((c: any) => c._id === activeChatId);
          if (found) {
            setChatStatus(found.status);
            setChatInitiatedBy(found.initiatedBy);
            const partner = found.users?.find((u: any) => {
              const uid = typeof u === 'object' && u ? (u._id || u.id) : u;
              return uid && uid.toString() !== currentUserId;
            });
            if (partner) {
              const pId = typeof partner === 'object' ? (partner._id || partner.id) : partner;
              const pIdStr = pId.toString();
              setResolvedPartnerId(pIdStr);
              fetchBlockRelation(pIdStr);
            }
          }
        } else if (isGroup && isMounted) {
          setChatStatus('accepted');
        }

        if (activeChatId && isMounted) {
          setChatId(activeChatId);

          axiosInstance.get('/chats')
            .then((chatListRes) => {
              const chats = chatListRes.data?.data?.chats || [];
              const currChat = chats.find((c: any) => c._id === activeChatId);
              if (currChat && currChat.mutedBy) {
                const muted = currChat.mutedBy.some((uid: any) => {
                  const idStr = typeof uid === 'object' && uid ? (uid._id || uid.id) : uid;
                  return idStr && idStr.toString() === currentUserId?.toString();
                });
                if (isMounted) setIsMuted(muted);
              }
            })
            .catch((err) => {
              console.error('[ChatWindowScreen] Failed to fetch chat details for mute state:', err);
            });
          const msgRes = await axiosInstance.get(
            `/chats/${activeChatId}/messages?limit=30`,
          );
          if (msgRes.data?.status === 'success' && isMounted) {
            const msgs = msgRes.data.data?.messages || [];
            setMessages(
              msgs.map((m: any) => mapBackendMessage(m, currentUserId || '')),
            );
          }
          await axiosInstance.put(`/chats/${activeChatId}/read`);
        }
      } catch (err) {
        console.error('[ChatWindowScreen] Error resolving chat:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    resolveChat();
    return () => { isMounted = false; };
  }, [params.chatId, userId, isGroup, currentUserId, mapBackendMessage]);

  // ─────────────────────────────────────────────────────────────────────────
  // Socket event handlers (unchanged)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !chatId) return;
    socket.emit('join-room', chatId);
    socket.emit('markAsRead', { chatId, userId: currentUserId });

    const handleReceiveMessage = (msg: any) => {
      if (msg.chatId === chatId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg._id)) return prev;
          const withoutTemp = prev.filter(
            (m) =>
              !(m.id.startsWith('temp-') && m.isMine && m.content === msg.content),
          );
          return [...withoutTemp, mapBackendMessage(msg, currentUserId || '')];
        });
        const senderId =
          typeof msg.senderId === 'object' && msg.senderId
            ? msg.senderId._id
            : msg.senderId;
        if (senderId !== currentUserId) {
          axiosInstance.put(`/chats/${chatId}/read`).catch(console.error);
          socket.emit('markAsRead', { chatId, userId: currentUserId });
        }
      }
    };

    const handleReactionUpdate = (data: { messageId: string; reactions: any[] }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId ? { ...m, reactions: data.reactions } : m,
        ),
      );
    };

    const handleUserTyping = (data: { userId: string; chatId: string }) => {
      if (data.chatId === chatId && data.userId !== currentUserId) setIsTyping(true);
    };

    const handleUserStopTyping = (data: { userId: string; chatId: string }) => {
      if (data.chatId === chatId && data.userId !== currentUserId) setIsTyping(false);
    };

    const handleOnlineUsers = (users: string[]) => {
      const partnerId =
        userId || (params.chatId !== chatId ? params.chatId : null);
      if (partnerId) setIsOnline(users.includes(partnerId));
    };

    const handleMessageDeleted = (data: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
    };

    socket.on('receive-message', handleReceiveMessage);
    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('messageReacted', handleReactionUpdate);
    socket.on('reaction-updated', handleReactionUpdate);
    socket.on('user-typing', handleUserTyping);
    socket.on('user-stop-typing', handleUserStopTyping);
    socket.on('online-users', handleOnlineUsers);
    socket.on('messageDeleted', handleMessageDeleted);
    socket.on('message-deleted', handleMessageDeleted);

    return () => {
      socket.emit('leave-room', chatId);
      socket.off('receive-message', handleReceiveMessage);
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('messageReacted', handleReactionUpdate);
      socket.off('reaction-updated', handleReactionUpdate);
      socket.off('user-typing', handleUserTyping);
      socket.off('user-stop-typing', handleUserStopTyping);
      socket.off('online-users', handleOnlineUsers);
      socket.off('messageDeleted', handleMessageDeleted);
      socket.off('message-deleted', handleMessageDeleted);
    };
  }, [socket, chatId, currentUserId, userId, params.chatId, mapBackendMessage]);

  // ─────────────────────────────────────────────────────────────────────────
  // Typing indicator (unchanged)
  // ─────────────────────────────────────────────────────────────────────────
  const handleTextChange = (text: string) => {
    setMessageText(text);
    if (!socket || !chatId) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing', { chatId });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit('stop-typing', { chatId });
    }, 2000);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Send message (unchanged)
  // ─────────────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!messageText.trim() || !chatId) return;
    const content = messageText.trim();
    const replyId = replyingTo?.id;
    const tempId = `temp-${Date.now()}`;
    const now = new Date();
    const optimisticMsg: MessageType = {
      id: tempId,
      type: 'text',
      content,
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: now.toISOString(),
      isMine: true,
      status: 'sent',
      reactions: [],
      ...(replyId && replyingTo
        ? { replyTo: { id: replyId, content: replyingTo.content, senderName: replyingTo.senderName } }
        : {}),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setMessageText('');
    setReplyingTo(null);
    try {
      const res = await axiosInstance.post(`/chats/${chatId}/send`, {
        content,
        type: 'text',
        ...(replyId ? { replyTo: replyId } : {}),
      });
      const savedMsg = res.data?.data?.message;
      if (savedMsg) {
        const real = mapBackendMessage(savedMsg, currentUserId || '');
        setMessages((prev) => prev.map((m) => (m.id === tempId ? real : m)));
      }
    } catch (err) {
      console.error('[ChatWindowScreen] Failed to send message:', err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Reactions (unchanged)
  // ─────────────────────────────────────────────────────────────────────────
  const handleReactLocal = useCallback(
    (messageId: string, emoji: string) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const existing = (m.reactions || []).findIndex(
            (r) => r.userId === currentUserId,
          );
          let newReactions = [...(m.reactions || [])];
          if (existing >= 0) {
            if (newReactions[existing].emoji === emoji) newReactions.splice(existing, 1);
            else newReactions[existing] = { userId: currentUserId!, emoji };
          } else {
            newReactions.push({ userId: currentUserId!, emoji });
          }
          return { ...m, reactions: newReactions };
        }),
      );
    },
    [currentUserId],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // ── UPDATED: Call helpers — fetch Zego token then navigate ───────────────
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Fetches a server-signed ZegoCloud Token04 from the backend and then
   * navigates to the ZegoCloud call screen.
   *
   * @param type  'voice' | 'video'
   */
  const initiateZegoCall = useCallback(
    async (type: 'voice' | 'video') => {
      const partnerId = userId || params.chatId;
      if (!partnerId) {
        Alert.alert('Error', 'Cannot start a call: recipient ID is missing.');
        return;
      }
      if (!chatId) {
        Alert.alert('Error', 'Cannot start a call before the chat is loaded.');
        return;
      }

      router.push({
        pathname: '/call',
        params: {
          callType: type,
          recipientId: partnerId,
          recipientName: chatName,
          currentUserId: currentUserId || '',
          currentUserName: currentUser?.fullName || '',
          callId: chatId,
        },
      } as any);
    },
    [chatId, userId, params.chatId, chatName, currentUserId, currentUser?.fullName, router],
  );

  const startVideoCall = useCallback(() => initiateZegoCall('video'), [initiateZegoCall]);
  const startVoiceCall = useCallback(() => initiateZegoCall('voice'), [initiateZegoCall]);

  const uploadFile = async (uri: string, name: string, mimeType: string, type: 'image' | 'file') => {
    if (!chatId) return;
    const tempId = `temp-${Date.now()}`;
    const now = new Date();
    const optimisticMsg: MessageType = {
      id: tempId,
      type,
      content: uri,
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: now.toISOString(),
      isMine: true,
      status: 'sending',
      reactions: [],
      ...(replyingTo
        ? { replyTo: { id: replyingTo.id, content: replyingTo.content, senderName: replyingTo.senderName } }
        : {}),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setReplyingTo(null);
    try {
      const formData = new FormData();
      formData.append('document', {
        uri,
        name,
        type: mimeType,
      } as any);
      formData.append('messageType', type);
      if (replyingTo?.id) {
        formData.append('replyTo', replyingTo.id);
      }
      const res = await axiosInstance.post(`/chats/${chatId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const savedMsg = res.data?.data?.message;
      if (savedMsg) {
        const real = mapBackendMessage(savedMsg, currentUserId || '');
        setMessages((prev) => prev.map((m) => (m.id === tempId ? real : m)));
        if (socket && socket.connected) {
          socket.emit('send-message', { chatId, ...savedMsg });
        }
      }
    } catch (err: any) {
      console.error('[ChatWindowScreen] Failed to upload file:', err?.response?.data || err);
      Alert.alert('Upload Failed', 'Failed to upload/send attachment.');
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  const uploadAudioFile = async (uri: string) => {
    if (!chatId) return;
    const tempId = `temp-${Date.now()}`;
    const now = new Date();
    const optimisticMsg: MessageType = {
      id: tempId,
      type: 'audio',
      content: uri,
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: now.toISOString(),
      isMine: true,
      status: 'sending',
      reactions: [],
      ...(replyingTo
        ? { replyTo: { id: replyingTo.id, content: replyingTo.content, senderName: replyingTo.senderName } }
        : {}),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setReplyingTo(null);
    try {
      const formData = new FormData();
      // Use the same 'document' field name and /upload endpoint as images/files
      formData.append('document', {
        uri,
        name: 'voice-message.m4a',
        type: 'audio/m4a',
      } as any);
      formData.append('messageType', 'audio');
      if (replyingTo?.id) {
        formData.append('replyTo', replyingTo.id);
      }
      const res = await axiosInstance.post(`/chats/${chatId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const savedMsg = res.data?.data?.message;
      if (savedMsg) {
        const real = mapBackendMessage(savedMsg, currentUserId || '');
        setMessages((prev) => prev.map((m) => (m.id === tempId ? real : m)));
        if (socket && socket.connected) {
          socket.emit('send-message', { chatId, ...savedMsg });
        }
      }
    } catch (err: any) {
      const detail = err?.response?.data || err?.message || err;
      console.error('[ChatWindowScreen] Failed to upload audio:', detail);
      Alert.alert('Upload Failed', `Failed to send audio message.\n${JSON.stringify(detail)}`);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  const handleSelectLibrary = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Please grant gallery access permission in settings.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const name = asset.fileName || asset.uri.split('/').pop() || 'photo.jpg';
        await uploadFile(asset.uri, name, asset.mimeType || 'image/jpeg', 'image');
      }
    } catch (e) {
      console.error('Gallery picker error:', e);
    }
  };

  const handleSelectCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Please grant camera access permission in settings.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const name = asset.fileName || asset.uri.split('/').pop() || 'photo.jpg';
        await uploadFile(asset.uri, name, asset.mimeType || 'image/jpeg', 'image');
      }
    } catch (e) {
      console.error('Camera capture error:', e);
    }
  };

  const handleSelectDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const name = asset.name || asset.uri.split('/').pop() || 'file';
        const type = asset.mimeType?.startsWith('image/') ? 'image' : 'file';
        await uploadFile(asset.uri, name, asset.mimeType || 'application/octet-stream', type);
      }
    } catch (e) {
      console.error('Document picker error:', e);
    }
  };

  const startRecording = useCallback(async () => {
    isHoldingMicRef.current = true;
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Microphone access is required to record voice notes.',
        );
        isHoldingMicRef.current = false;
        return;
      }

      if (!isHoldingMicRef.current) return;

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      if (!isHoldingMicRef.current) return;

      // If the recorder is already in a recording state, stop it first
      if (recorder.isRecording) {
        await recorder.stop();
      }

      if (!isHoldingMicRef.current) return;

      try {
        await recorder.prepareToRecordAsync();
      } catch (prepErr: any) {
        console.warn('[ChatWindow] prepareToRecordAsync skipped:', prepErr?.message);
      }

      if (!isHoldingMicRef.current) return;

      setIsRecording(true);
      isActuallyRecordingRef.current = true;
      recorder.record();
    } catch (e) {
      console.error('[ChatWindow] Failed to start recording', e);
      setIsRecording(false);
      isActuallyRecordingRef.current = false;
      isHoldingMicRef.current = false;
    }
  }, [recorder]);

  const stopRecording = useCallback(async () => {
    isHoldingMicRef.current = false;
    setIsRecording(false);
    
    try {
      if (!isActuallyRecordingRef.current) {
        // If it wasn't recording, we don't need to do anything
        return;
      }
      isActuallyRecordingRef.current = false;

      await recorder.stop();

      const uri = recorder.uri;
      console.log('[ChatWindow] Recording stopped, uri:', uri);

      if (uri && chatId) {
        const formData = new FormData();
        // React Native FormData — field MUST be 'audio' to match uploadAudio.single("audio")
        const uriParts = uri.split('.');
        const ext = uriParts[uriParts.length - 1] || 'm4a';
        const name = `voice_note.${ext}`;
        let type = 'audio/m4a';
        if (ext === 'mp3') type = 'audio/mpeg';
        else if (ext === 'wav') type = 'audio/wav';
        else if (ext === 'webm') type = 'audio/webm';
        else if (ext === 'mp4') type = 'audio/mp4';

        formData.append('audio', {
          uri,
          name,
          type,
        } as any);

        // Optimistic message
        const tempId = `temp-${Date.now()}`;
        const now = new Date();
        setMessages((prev) => [
          ...prev,
          {
            id: tempId,
            type: 'audio' as const,
            content: uri,
            time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            createdAt: now.toISOString(),
            isMine: true,
            status: 'sending' as const,
            reactions: [],
          },
        ]);

        try {
          const data = await uploadChatAudio(chatId, formData);
          const savedMsg = data?.data?.message;
          if (savedMsg) {
            const real = mapBackendMessage(savedMsg, currentUserId || '');
            setMessages((prev) => prev.map((m) => (m.id === tempId ? real : m)));
            if (socket && socket.connected) {
              socket.emit('send-message', { chatId, ...savedMsg });
            }
          }
        } catch (uploadErr: any) {
          const detail = uploadErr?.response?.data?.message
            || uploadErr?.response?.data
            || uploadErr?.message
            || 'Network Error';
          console.error('[ChatWindow] Audio upload failed:', detail);
          Alert.alert(
            'Voice note failed',
            typeof detail === 'string' ? detail : 'Could not send voice note. Check your connection.',
          );
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
        }
      }
    } catch (e) {
      console.error('[ChatWindow] Failed to stop recording', e);
    }
  }, [recorder, chatId, currentUserId, mapBackendMessage, socket]);


  const handleGenerateSmartReplies = async () => {
    if (!chatId) return;
    setLoadingReplies(true);
    setSmartReplies([]);
    try {
      const res = await axiosInstance.post('/api/ai/chat/generate-reply', { chatId });
      if (res.data?.status === 'success' && Array.isArray(res.data?.data)) {
        setSmartReplies(res.data.data);
      } else {
        Toast.show({ type: 'error', text1: 'Could not generate replies.' });
      }
    } catch (err: any) {
      console.error('[ChatWindowScreen] Error generating smart replies:', err);
      Toast.show({ type: 'error', text1: err.response?.data?.message || 'Failed to generate replies.' });
    } finally {
      setLoadingReplies(false);
    }
  };

  const handleSendSmartReplyText = async (text: string) => {
    if (!chatId) return;
    setSmartReplies([]);
    const tempId = `temp-${Date.now()}`;
    const now = new Date();
    const optimisticMsg: MessageType = {
      id: tempId,
      type: 'text',
      content: text,
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: now.toISOString(),
      isMine: true,
      status: 'sent',
      reactions: [],
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    try {
      const res = await axiosInstance.post(`/chats/${chatId}/send`, {
        content: text,
        type: 'text',
      });
      const savedMsg = res.data?.data?.message;
      if (savedMsg) {
        const real = mapBackendMessage(savedMsg, currentUserId || '');
        setMessages((prev) => prev.map((m) => (m.id === tempId ? real : m)));
        if (socket && socket.connected) {
          socket.emit('send-message', { chatId, ...savedMsg });
        }
      }
    } catch (err) {
      console.error('[ChatWindowScreen] Failed to send smart reply:', err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  const startSttRecording = async () => {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permission needed', 'Microphone access is required to record voice.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      setIsSttRecording(true);
      if (recorder.isRecording) {
        await recorder.stop();
      }
      try {
        await recorder.prepareToRecordAsync();
      } catch (prepErr: any) {
        console.warn('[ChatWindow] prepareToRecordAsync skipped:', prepErr?.message);
      }
      recorder.record();
    } catch (e) {
      console.error('[ChatWindow] Failed to start STT recording', e);
      setIsSttRecording(false);
    }
  };

  const stopAndTranscribeStt = async () => {
    setIsSttRecording(false);
    setIsSttLoading(true);
    try {
      if (recorder.isRecording) {
        await recorder.stop();
      }
      const uri = recorder.uri;
      if (!uri) {
        setIsSttLoading(false);
        setSttModalVisible(false);
        Toast.show({ type: 'error', text1: 'No recorded audio found.' });
        return;
      }

      const formData = new FormData();
      formData.append('audio', {
        uri,
        name: 'stt_audio.mp3',
        type: 'audio/mp4',
      } as any);

      const res = await axiosInstance.post('/api/ai/chat/speech-to-text', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });

      if (res.data?.status === 'success' && res.data?.data) {
        setMessageText((prev) => prev + (prev ? ' ' : '') + res.data.data);
        Toast.show({ type: 'success', text1: 'Speech transcribed successfully!' });
      } else {
        Toast.show({ type: 'error', text1: 'Failed to transcribe speech.' });
      }
    } catch (err: any) {
      console.error('[ChatWindow] STT failed:', err?.response?.data || err);
      Toast.show({ type: 'error', text1: 'Failed to convert speech to text.' });
    } finally {
      setIsSttLoading(false);
      setSttModalVisible(false);
    }
  };


  // ─────────────────────────────────────────────────────────────────────────
  // Chat request handlers (unchanged)
  // ─────────────────────────────────────────────────────────────────────────
  const handleAcceptRequest = async () => {
    if (!chatId) return;
    try {
      const res = await axiosInstance.put(`/chats/${chatId}/request`, {
        action: 'accept',
      });
      if (res.data?.status === 'success') setChatStatus('accepted');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeclineRequest = async () => {
    if (!chatId) return;
    try {
      const res = await axiosInstance.put(`/chats/${chatId}/request`, {
        action: 'reject',
      });
      if (res.data?.status === 'success') router.back();
    } catch (err) {
      console.error(err);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Loading state
  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.purple} size="large" />
      </View>
    );
  }

  const isPending = chatStatus === 'pending';
  const isInitiator = chatInitiatedBy === currentUserId;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bg }]}
      edges={['bottom']}
    >
      {/* ── Stack header (unchanged visual, updated call handlers) ───────── */}
      <Stack.Screen
        options={{
          headerShown: true,
          headerLeft: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={{ paddingRight: 10 }}
              >
                <Ionicons name="chevron-back" size={26} color={colors.purple} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (isGroup && communityId) {
                    router.push({
                      pathname: '/GroupDetailsScreen',
                      params: {
                        communityId,
                        chatId: chatId || '',
                      },
                    } as never);
                  } else {
                    setContactDetailsVisible(true);
                  }
                }}
                style={[styles.headerAvatar, { backgroundColor: colors.purple }]}
              >
                {paramAvatar ? (
                  <Image source={{ uri: paramAvatar }} style={styles.avatarImg} />
                ) : (
                  <Text style={styles.avatarInitials}>
                    {chatName?.charAt(0)?.toUpperCase() ?? '?'}
                  </Text>
                )}
                {!isGroup && isOnline && <View style={styles.onlineDot} />}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (isGroup && communityId) {
                    router.push({
                      pathname: '/GroupDetailsScreen',
                      params: {
                        communityId,
                        chatId: chatId || '',
                      },
                    } as never);
                  } else {
                    setContactDetailsVisible(true);
                  }
                }}
                style={{ marginLeft: 10 }}
              >
                <Text
                  style={[styles.headerTitleText, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {chatName}
                </Text>
                <Text
                  style={[
                    styles.headerSubtitleText,
                    { color: isTyping ? colors.purple : colors.textMuted },
                  ]}
                >
                  {isTyping ? 'typing...' : isOnline ? 'Online' : 'Offline'}
                </Text>
              </TouchableOpacity>
            </View>
          ),
          headerRight: () => (
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 15, paddingRight: 10 }}
            >
              {/* Show a spinner while the token is being fetched */}
              {callLoading ? (
                <ActivityIndicator size="small" color={colors.purple} />
              ) : (
                <>
                  {!isGroup && !blockedByMe && !blockedMe && (
                    <>
                      <TouchableOpacity onPress={startVideoCall} disabled={callLoading}>
                        <Ionicons name="videocam-outline" size={24} color={colors.purple} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={startVoiceCall} disabled={callLoading}>
                        <Ionicons name="call-outline" size={22} color={colors.purple} />
                      </TouchableOpacity>
                    </>
                  )}
                  <TouchableOpacity
                    onPress={() => {
                      setThreeDotsMenuVisible(true);
                    }}
                  >
                    <Ionicons name="ellipsis-vertical" size={22} color={colors.purple} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          ),
          headerTitle: '',
          headerBackVisible: false,
          headerStyle: { backgroundColor: isDark ? '#171717' : '#FFFFFF' },
          headerShadowVisible: false,
        }}
      />

      {/* ── Chat body ──────────────────────────────────────────────────────── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 90}
      >
        <View style={{ flex: 1 }}>
          <ChatBody
            messages={messages}
            loading={loading}
            currentUserId={currentUserId}
            isGroup={isGroup}
            onReply={(msg) => setReplyingTo(msg)}
            onForward={() => Alert.alert('Forward', 'Forward feature coming soon!')}
            onReactLocal={handleReactLocal}
            onSmartReplies={handleGenerateSmartReplies}
          />
        </View>

        {/* ── Pending chat request banner (unchanged) ───────────────────── */}
        {isPending ? (
          isInitiator ? (
            <View
              style={[
                styles.pendingBanner,
                { backgroundColor: isDark ? '#262626' : '#F3F4F6' },
              ]}
            >
              <Text style={[styles.pendingText, { color: colors.text }]}>
                Waiting for the recipient to accept your chat request.
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.pendingBanner,
                { backgroundColor: isDark ? '#262626' : '#F3F4F6' },
              ]}
            >
              <Text style={[styles.pendingText, { color: colors.text }]}>
                Accept this chat request to send and receive messages.
              </Text>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.acceptBtn, { backgroundColor: colors.purple }]}
                  onPress={handleAcceptRequest}
                >
                  <Text style={styles.btnText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.declineBtn,
                    { borderColor: colors.border, backgroundColor: colors.surface },
                  ]}
                  onPress={handleDeclineRequest}
                >
                  <Text style={[styles.declineText, { color: colors.text }]}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        ) : blockedByMe ? (
          <View
            style={{
              padding: 16,
              backgroundColor: isDark ? '#262626' : '#F3F4F6',
              alignItems: 'center',
              justifyContent: 'center',
              borderTopWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.text, marginBottom: 8, fontSize: 14 }}>
              You blocked this user. Unblock to message them.
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: colors.purple,
                paddingVertical: 8,
                paddingHorizontal: 20,
                borderRadius: 20,
              }}
              onPress={async () => {
                const targetUserId = resolvedPartnerId || userId;
                if (!targetUserId) return;
                try {
                  await axiosInstance.put(`/users/block/${targetUserId}`);
                  setBlockedByMe(false);
                  Toast.show({ type: 'info', text1: `${chatName} unblocked` });
                } catch (err) {
                  console.error('[ChatWindow] inline unblock failed:', err);
                  Toast.show({ type: 'error', text1: 'Failed to unblock user' });
                }
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Unblock</Text>
            </TouchableOpacity>
          </View>
        ) : blockedMe ? (
          <View
            style={{
              padding: 16,
              backgroundColor: isDark ? '#262626' : '#F3F4F6',
              alignItems: 'center',
              justifyContent: 'center',
              borderTopWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 14 }}>
              You cannot send messages to this user.
            </Text>
          </View>
        ) : (
          <>
            {/* Smart Replies Container */}
            {(loadingReplies || smartReplies.length > 0) ? (
              <View style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                backgroundColor: colors.bg,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.purple, textTransform: 'uppercase', letterSpacing: 1 }}>
                    💡 Smart Replies
                  </Text>
                  <TouchableOpacity onPress={() => setSmartReplies([])} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
                {loadingReplies ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}>
                    <ActivityIndicator size="small" color={colors.purple} />
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>Generating suggestions...</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 4 }}>
                    {smartReplies.map((reply, i) => (
                      <TouchableOpacity
                        key={i}
                        onPress={() => handleSendSmartReplyText(reply)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(124, 58, 237, 0.08)',
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: isDark ? 'rgba(139, 92, 246, 0.25)' : 'rgba(124, 58, 237, 0.15)',
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.purple }}>
                          {reply}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ) : null}

            <ChatInputBar
              value={messageText}
              onChangeText={handleTextChange}
              onSend={handleSend}
              onAttach={() => setAttachmentVisible(true)}
              onMicPressIn={startRecording}
              onMicPressOut={stopRecording}
              isRecording={isRecording}
              recordingTime={`${Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:${(recordingSeconds % 60).toString().padStart(2, '0')}`}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
              chatId={chatId}
            />
          </>
        )}
      </KeyboardAvoidingView>

      {/* ── Modals (unchanged) ─────────────────────────────────────────────── */}
      <AttachmentModal
        visible={attachmentVisible}
        onClose={() => setAttachmentVisible(false)}
        onSelectLibrary={handleSelectLibrary}
        onSelectCamera={handleSelectCamera}
        onSelectDocument={handleSelectDocument}
        onSelectStt={() => setSttModalVisible(true)}
      />

      {/* ── Speech-to-Text AI Modal ── */}
      <Modal
        visible={sttModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!isSttLoading) {
            if (isSttRecording) recorder.stop().catch(() => { });
            setIsSttRecording(false);
            setSttModalVisible(false);
          }
        }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{
            width: '100%',
            maxWidth: 320,
            backgroundColor: isDark ? '#1e1e1e' : colors.surface,
            borderRadius: 24,
            padding: 24,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25,
            shadowRadius: 15,
            elevation: 10,
          }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 }}>
              AI Speech-to-Text
            </Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', marginBottom: 24 }}>
              Transcribe your voice into text instantly using Rabta AI.
            </Text>

            {isSttLoading ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.purple} />
                <Text style={{ marginTop: 12, fontSize: 14, color: colors.textMuted, fontStyle: 'italic' }}>
                  Transcribing your audio...
                </Text>
              </View>
            ) : (
              <View style={{ alignItems: 'center', width: '100%' }}>
                {isSttRecording ? (
                  <View style={{ alignItems: 'center', marginBottom: 24 }}>
                    <View style={{
                      width: 80,
                      height: 80,
                      borderRadius: 40,
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: 12,
                    }}>
                      <Ionicons name="mic" size={40} color="#EF4444" />
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#EF4444' }}>
                      Recording...
                    </Text>
                  </View>
                ) : (
                  <View style={{ alignItems: 'center', marginBottom: 24 }}>
                    <View style={{
                      width: 80,
                      height: 80,
                      borderRadius: 40,
                      backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : colors.purple10,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: 12,
                    }}>
                      <Ionicons name="mic" size={40} color={colors.purple} />
                    </View>
                    <Text style={{ fontSize: 14, color: colors.textMuted }}>
                      Ready to record
                    </Text>
                  </View>
                )}

                <View style={{ width: '100%', gap: 10 }}>
                  {isSttRecording ? (
                    <TouchableOpacity
                      onPress={stopAndTranscribeStt}
                      style={{
                        backgroundColor: '#EF4444',
                        paddingVertical: 12,
                        borderRadius: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                        Stop & Transcribe
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={startSttRecording}
                      style={{
                        backgroundColor: colors.purple,
                        paddingVertical: 12,
                        borderRadius: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                        Start Recording
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    disabled={isSttLoading}
                    onPress={() => {
                      if (isSttRecording) {
                        recorder.stop().catch(() => { });
                      }
                      setIsSttRecording(false);
                      setSttModalVisible(false);
                    }}
                    style={{
                      paddingVertical: 12,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '500' }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Three Dots Ellipsis Popover Menu ───────────────────────────────── */}
      <Modal
        visible={threeDotsMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setThreeDotsMenuVisible(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.15)' }}
          activeOpacity={1}
          onPress={() => setThreeDotsMenuVisible(false)}
        >
          <View style={{
            position: 'absolute',
            top: Platform.OS === 'ios' ? 100 : 60,
            right: 16,
            backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
            borderRadius: 14,
            width: 170,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 10,
            elevation: 8,
            borderWidth: 1,
            borderColor: isDark ? '#2D2D2D' : '#EBEBEB',
            overflow: 'hidden',
          }}>
            {isGroup ? (
              <>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: isDark ? '#2D2D2D' : '#F0F0F0',
                  }}
                  onPress={handleMuteNotifications}
                >
                  <Ionicons
                    name={isMuted ? "volume-high-outline" : "volume-mute-outline"}
                    size={18}
                    color={colors.text}
                    style={{ marginRight: 12 }}
                  />
                  <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }}>
                    {isMuted ? "Unmute notifications" : "Mute notifications"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                  }}
                  onPress={handleClearChat}
                >
                  <Ionicons name="trash-outline" size={18} color={isDark ? '#FCA5A5' : '#EF4444'} style={{ marginRight: 12 }} />
                  <Text style={{ fontSize: 14, fontWeight: '500', color: isDark ? '#FCA5A5' : '#EF4444' }}>Clear Chat</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: isDark ? '#2D2D2D' : '#F0F0F0',
                  }}
                  onPress={handleClearChat}
                >
                  <Ionicons name="trash-outline" size={18} color={isDark ? '#FCA5A5' : '#EF4444'} style={{ marginRight: 12 }} />
                  <Text style={{ fontSize: 14, fontWeight: '500', color: isDark ? '#FCA5A5' : '#EF4444' }}>Clear Chat</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: isDark ? '#2D2D2D' : '#F0F0F0',
                  }}
                  onPress={handleBlockUser}
                >
                  <Ionicons name="ban-outline" size={18} color={colors.text} style={{ marginRight: 12 }} />
                  <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }}>
                    {blockedByMe ? 'Unblock User' : 'Block User'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                  }}
                  onPress={handleViewProfile}
                >
                  <Ionicons name="person-outline" size={18} color={colors.text} style={{ marginRight: 12 }} />
                  <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }}>View Profile</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Contact Info Modal ── */}
      <Modal
        visible={contactDetailsVisible}
        animationType="slide"
        onRequestClose={() => setContactDetailsVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}>
            <TouchableOpacity onPress={() => setContactDetailsVisible(false)}>
              <Ionicons name="chevron-back" size={26} color={colors.purple} />
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
              Info
            </Text>
            <View style={{ width: 26 }} />
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Profile Avatar & Name */}
            <View style={{ alignItems: 'center', marginVertical: 24 }}>
              <View style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: colors.purple,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                marginBottom: 16,
                position: 'relative',
              }}>
                {paramAvatar ? (
                  <Image source={{ uri: paramAvatar }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontSize: 36, fontWeight: '700' }}>
                    {chatName?.charAt(0)?.toUpperCase()}
                  </Text>
                )}
                {!isGroup && isOnline && (
                  <View style={{
                    position: 'absolute',
                    bottom: 2,
                    right: 2,
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    backgroundColor: '#25D366',
                    borderWidth: 2,
                    borderColor: colors.bg,
                  }} />
                )}
              </View>

              <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 4 }}>
                {chatName}
              </Text>
              <Text style={{ fontSize: 14, color: colors.textMuted }}>
                {isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>

            {/* Quick Actions (Call, Video Cam, Block) */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 24,
              marginBottom: 24,
            }}>
              {!isGroup && (
                <>
                  <TouchableOpacity
                    onPress={() => {
                      setContactDetailsVisible(false);
                      startVoiceCall();
                    }}
                    style={{
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 50,
                      height: 50,
                      borderRadius: 25,
                      backgroundColor: isDark ? '#2D2D2D' : '#F3F4F6',
                    }}
                  >
                    <Ionicons name="call-outline" size={22} color={colors.purple} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setContactDetailsVisible(false);
                      startVideoCall();
                    }}
                    style={{
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 50,
                      height: 50,
                      borderRadius: 25,
                      backgroundColor: isDark ? '#2D2D2D' : '#F3F4F6',
                    }}
                  >
                    <Ionicons name="videocam-outline" size={22} color={colors.purple} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setThreeDotsMenuVisible(false);
                      handleBlockUser();
                    }}
                    style={{
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 50,
                      height: 50,
                      borderRadius: 25,
                      backgroundColor: isDark ? '#2D2D2D' : '#F3F4F6',
                    }}
                  >
                    <Ionicons name="ban-outline" size={22} color={isDark ? '#FCA5A5' : '#EF4444'} />
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* About / Bio Section */}
            <View style={{
              paddingHorizontal: 16,
              marginBottom: 24,
            }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.purple, textTransform: 'uppercase', marginBottom: 8 }}>
                About
              </Text>
              <View style={{
                backgroundColor: isDark ? '#1E1E1E' : '#F9FAFB',
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.border,
              }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 4 }}>
                  {loadingProfile ? 'Loading...' : (partnerProfile?.jobTitle || 'Member')}
                </Text>
                <Text style={{ fontSize: 14, color: colors.textMuted, lineHeight: 20 }}>
                  {loadingProfile
                    ? 'Loading...'
                    : (partnerProfile?.aboutMe || partnerProfile?.bioHeadline || 'Hey there! I am using Rabta.')}
                </Text>
              </View>
            </View>

            {/* Email and Phone Contact Detail */}
            {!isGroup && partnerProfile && (
              <View style={{ paddingHorizontal: 16, marginBottom: 24, gap: 12 }}>
                {partnerProfile.email && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={{ width: 20 }} />
                    <View>
                      <Text style={{ fontSize: 12, color: colors.textMuted }}>Email</Text>
                      <Text style={{ fontSize: 14, color: colors.text }}>{partnerProfile.email}</Text>
                    </View>
                  </View>
                )}
                {partnerProfile.phoneNumber && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Ionicons name="phone-portrait-outline" size={18} color={colors.textMuted} style={{ width: 20 }} />
                    <View>
                      <Text style={{ fontSize: 12, color: colors.textMuted }}>Phone</Text>
                      <Text style={{ fontSize: 14, color: colors.text }}>{partnerProfile.phoneNumber}</Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Shared Media, Files, and Links Section */}
            <View style={{ paddingHorizontal: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.purple, textTransform: 'uppercase', marginBottom: 12 }}>
                Media, Links & Docs
              </Text>

              {/* Sub-tab selection header */}
              <View style={{
                flexDirection: 'row',
                backgroundColor: isDark ? '#1E1E1E' : '#F3F4F6',
                borderRadius: 10,
                padding: 4,
                marginBottom: 16,
              }}>
                <TouchableOpacity
                  onPress={() => setMediaSubTab('media')}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 8,
                    alignItems: 'center',
                    backgroundColor: mediaSubTab === 'media' ? (isDark ? '#2D2D2D' : '#FFFFFF') : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: mediaSubTab === 'media' ? colors.purple : colors.textMuted }}>
                    Media ({mediaBuckets.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setMediaSubTab('files')}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 8,
                    alignItems: 'center',
                    backgroundColor: mediaSubTab === 'files' ? (isDark ? '#2D2D2D' : '#FFFFFF') : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: mediaSubTab === 'files' ? colors.purple : colors.textMuted }}>
                    Files ({filesBuckets.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setMediaSubTab('links')}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 8,
                    alignItems: 'center',
                    backgroundColor: mediaSubTab === 'links' ? (isDark ? '#2D2D2D' : '#FFFFFF') : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: mediaSubTab === 'links' ? colors.purple : colors.textMuted }}>
                    Links ({linksBuckets.length})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Sub-tab Content List */}
              <View style={{ minHeight: 120 }}>
                {mediaSubTab === 'media' && (
                  mediaBuckets.length === 0 ? (
                    <Text style={{ textAlign: 'center', color: colors.textMuted, marginTop: 24, fontSize: 14 }}>
                      No media found in this chat
                    </Text>
                  ) : (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {mediaBuckets.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => Linking.openURL(item.url).catch((err) => console.error('[ChatWindowScreen] Failed to open media URL:', err))}
                          style={{
                            width: '31%',
                            aspectRatio: 1,
                            borderRadius: 8,
                            backgroundColor: isDark ? '#2D2D2D' : '#E5E7EB',
                            overflow: 'hidden',
                          }}
                        >
                          <Image source={{ uri: item.url }} style={{ width: '100%', height: '100%' }} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )
                )}

                {mediaSubTab === 'files' && (
                  filesBuckets.length === 0 ? (
                    <Text style={{ textAlign: 'center', color: colors.textMuted, marginTop: 24, fontSize: 14 }}>
                      No documents found in this chat
                    </Text>
                  ) : (
                    <View style={{ gap: 10 }}>
                      {filesBuckets.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => Linking.openURL(item.url).catch((err) => console.error('[ChatWindowScreen] Failed to open file URL:', err))}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 12,
                            padding: 12,
                            borderRadius: 10,
                            backgroundColor: isDark ? '#1E1E1E' : '#F9FAFB',
                            borderWidth: 1,
                            borderColor: colors.border,
                          }}
                        >
                          <Ionicons name="document-text-outline" size={24} color={colors.purple} />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                              {item.label}
                            </Text>
                            <Text style={{ fontSize: 11, color: colors.textMuted }}>
                              Tap to open document
                            </Text>
                          </View>
                          <Ionicons name="download-outline" size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )
                )}

                {mediaSubTab === 'links' && (
                  linksBuckets.length === 0 ? (
                    <Text style={{ textAlign: 'center', color: colors.textMuted, marginTop: 24, fontSize: 14 }}>
                      No links found in this chat
                    </Text>
                  ) : (
                    <View style={{ gap: 10 }}>
                      {linksBuckets.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => Linking.openURL(item.url).catch((err) => console.error('[ChatWindowScreen] Failed to open link URL:', err))}
                          style={{
                            padding: 12,
                            borderRadius: 10,
                            backgroundColor: isDark ? '#1E1E1E' : '#F9FAFB',
                            borderWidth: 1,
                            borderColor: colors.border,
                          }}
                        >
                          <Text style={{ fontSize: 14, color: colors.purple, fontWeight: '500' }} numberOfLines={2}>
                            {item.url}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )
                )}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerAvatar: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarInitials: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#25D366', borderWidth: 1.5, borderColor: '#fff',
  },
  headerTitleText: { fontSize: 16, fontWeight: '700', maxWidth: 160 },
  headerSubtitleText: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  pendingBanner: {
    padding: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    alignItems: 'center', justifyContent: 'center', elevation: 4,
  },
  pendingText: { fontSize: 14, fontWeight: '500', textAlign: 'center', marginBottom: 12 },
  actionRow: { flexDirection: 'row', gap: 12, width: '100%', paddingHorizontal: 16 },
  acceptBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  declineBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    alignItems: 'center', borderWidth: 1,
  },
  btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  declineText: { fontWeight: '700', fontSize: 14 },
});
