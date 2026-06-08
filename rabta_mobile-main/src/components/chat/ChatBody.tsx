import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Clipboard,
  Alert,
  Vibration,
  Modal,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { createAudioPlayer, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useTheme } from '../../theme/ThemeContext';
import type { MessageType } from '../../types';
import MessageContextMenu from './MessageContextMenu';
import axiosInstance from '../../api/axiosInstance';

interface ChatBodyProps {
  messages?: MessageType[];
  loading?: boolean;
  currentUserId?: string;
  isGroup?: boolean;
  onReply?: (message: MessageType) => void;
  onForward?: (message: MessageType) => void;
  onReactLocal?: (messageId: string, emoji: string) => void;
  onSmartReplies?: (message: MessageType) => void;
  starredMessageIds?: Set<string>;
  onStar?: (messageId: string) => void;
  onInfo?: (message: MessageType) => void;
  onMore?: (message: MessageType) => void;
  translatedMessages?: Record<string, { translatedText: string; originalText: string }>;
  translatingMessageId?: string | null;
  onTranslate?: (message: MessageType) => void;
  onClearTranslation?: (messageId: string) => void;
}

// ── Date helpers ──────────────────────────────────────────────────────────────

const isSameDay = (d1: Date, d2: Date) =>
  d1.getFullYear() === d2.getFullYear() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getDate() === d2.getDate();

const getDateLabel = (dateStr: string): string => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(date, today)) return 'Today';
  if (isSameDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

// ── Types ─────────────────────────────────────────────────────────────────────

type SeparatorItem = { isSeparator: true; id: string; text: string };
type BubbleItem = MessageType & { isFirstInGroup: boolean };
type RenderItem = BubbleItem | SeparatorItem;

// ── Voice Note Player Component ───────────────────────────────────────────────

function AudioMessagePlayer({ uri, isMine, colors, isDark }: { uri: string; isMine: boolean; colors: any; isDark: boolean }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  const handlePlayPause = () => {
    if (status.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const duration = status.duration || 0;
  const currentTime = status.currentTime || 0;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // 18 soundwave amplitudes to simulate waves
  const waveAmplitudes = [10, 22, 16, 28, 14, 8, 20, 26, 12, 18, 24, 10, 14, 20, 12, 16, 8, 12];

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
      paddingHorizontal: 2,
      borderRadius: 14,
      width: 210,
      gap: 10,
    }}>
      {/* Play/Pause Button */}
      <TouchableOpacity
        onPress={handlePlayPause}
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: isMine ? 'rgba(255,255,255,0.25)' : colors.purple,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {status.isBuffering ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons
            name={status.playing ? "pause" : "play"}
            size={18}
            color="#fff"
          />
        )}
      </TouchableOpacity>

      {/* Waveform Visualizer & Elapsed time */}
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', height: 28, gap: 3 }}>
          {waveAmplitudes.map((amp, index) => {
            const barProgress = (index / waveAmplitudes.length) * 100;
            const isPlayed = progress >= barProgress;
            
            const barColor = isMine
              ? (isPlayed ? '#ffffff' : 'rgba(255, 255, 255, 0.4)')
              : (isPlayed ? colors.purple : (isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)'));

            return (
              <View
                key={index}
                style={{
                  width: 3,
                  height: amp,
                  borderRadius: 1.5,
                  backgroundColor: barColor,
                }}
              />
            );
          })}
        </View>

        <Text style={{
          fontSize: 9,
          color: isMine ? 'rgba(255,255,255,0.75)' : colors.textMuted,
          fontWeight: '600',
        }}>
          {formatTime(currentTime)} / {duration > 0 ? formatTime(duration) : '0:00'}
        </Text>
      </View>

      <Ionicons
        name="mic"
        size={16}
        color={isMine ? 'rgba(255,255,255,0.6)' : colors.textMuted}
      />
    </View>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ChatBody({
  messages = [],
  loading,
  currentUserId,
  isGroup,
  onReply,
  onForward,
  onReactLocal,
  onSmartReplies,
  starredMessageIds,
  onStar,
  onInfo,
  onMore,
  translatedMessages,
  translatingMessageId,
  onTranslate,
  onClearTranslation,
}: ChatBodyProps) {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  // Stable palette for group sender avatars (no avatar available)
  const SENDER_COLORS = ['#7C3AED', '#059669', '#D97706', '#DC2626', '#2563EB', '#DB2777'];
  const getSenderColor = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return SENDER_COLORS[Math.abs(hash) % SENDER_COLORS.length];
  };

  const navigateToProfile = (senderId?: string) => {
    if (!senderId) return;
    try {
      router.push(`/user-profile/${senderId}` as any);
    } catch {
      console.log('[ChatBody] Navigate to profile:', senderId);
    }
  };

  const [contextMsg, setContextMsg] = useState<MessageType | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Translation states
  const [internalTranslated, setInternalTranslated] = useState<Record<string, { translatedText: string; originalText: string }>>({});
  const [internalTranslatingId, setInternalTranslatingId] = useState<string | null>(null);

  const activeTranslated = translatedMessages || internalTranslated;
  const activeTranslatingId = translatingMessageId !== undefined ? translatingMessageId : internalTranslatingId;

  const handleTranslateMessage = useCallback(async (msg: MessageType) => {
    if (onTranslate) {
      onTranslate(msg);
      return;
    }
    if (!msg.content) return;
    setInternalTranslatingId(msg.id);
    try {
      const isArabic = /[\u0600-\u06FF]/.test(msg.content);
      const targetLang = isArabic ? 'en' : 'ar';
      const res = await axiosInstance.post(
        '/api/ai/chat/translate',
        { text: msg.content, targetLang },
        { timeout: 60000 },
      );
      if (res.data?.status === 'success' && res.data?.data) {
        setInternalTranslated((prev) => ({
          ...prev,
          [msg.id]: {
            translatedText: res.data.data,
            originalText: msg.content || '',
          },
        }));
      } else {
        Alert.alert('Translation Failed', 'Failed to translate message.');
      }
    } catch (err: any) {
      console.error('Error translating message:', err);
      Alert.alert('Translation Error', err.response?.data?.message || 'Failed to translate message.');
    } finally {
      setInternalTranslatingId(null);
    }
  }, [onTranslate]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages]);

  // Scroll to bottom when keyboard opens so latest message stays visible
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return () => show.remove();
  }, []);

  // ── Long press handler ─────────────────────────────────────────────────────
  const handleLongPress = useCallback((msg: MessageType) => {
    Vibration.vibrate(40);
    setContextMsg(msg);
    setMenuVisible(true);
  }, []);

  // Legacy audio state handler removed (moved to local AudioMessagePlayer)

  // ── React to message (calls backend) ──────────────────────────────────────
  const handleReact = useCallback(async (messageId: string, emoji: string) => {
    try {
      await axiosInstance.post(`/messages/${messageId}/react`, { emoji });
      onReactLocal?.(messageId, emoji);
    } catch (err) {
      console.error('[ChatBody] React error:', err);
    }
  }, [onReactLocal]);

  // ── Pin message ────────────────────────────────────────────────────────────
  const handlePin = useCallback(async (messageId: string) => {
    try {
      await axiosInstance.put(`/messages/${messageId}/pin`);
    } catch (err) {
      console.error('[ChatBody] Pin error:', err);
    }
  }, []);

  // ── Delete message ─────────────────────────────────────────────────────────
  const handleDelete = useCallback((messageId: string) => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axiosInstance.delete(`/messages/${messageId}`);
            } catch (err) {
              console.error('[ChatBody] Delete error:', err);
            }
          },
        },
      ]
    );
  }, []);

  // ── Copy text ──────────────────────────────────────────────────────────────
  const handleCopy = useCallback((content: string) => {
    Clipboard.setString(content);
  }, []);

  // ── Forward ────────────────────────────────────────────────────────────────
  const handleForward = useCallback((msg: MessageType) => {
    onForward?.(msg);
  }, [onForward]);

  // ── Build render list with date separators + group metadata ────────────────
  const renderData: RenderItem[] = [];
  let lastDate: Date | null = null;
  let lastIsMine: boolean | null = null;

  messages.forEach((msg) => {
    let separatorInserted = false;

    if (msg.createdAt) {
      const msgDate = new Date(msg.createdAt);
      if (!lastDate || !isSameDay(lastDate, msgDate)) {
        renderData.push({
          isSeparator: true,
          id: `sep-${msg.createdAt}-${msg.id}`,
          text: getDateLabel(msg.createdAt),
        });
        lastDate = msgDate;
        separatorInserted = true;
      }
    }

    const isFirstInGroup =
      separatorInserted || lastIsMine === null || lastIsMine !== msg.isMine;
    lastIsMine = msg.isMine;

    renderData.push({ ...msg, isFirstInGroup });
  });

  // ── Render: Date Separator ─────────────────────────────────────────────────
  const renderSeparator = (item: SeparatorItem) => (
    <View style={{ alignItems: 'center', marginVertical: 12 }}>
      <View
        style={{
          backgroundColor: isDark ? '#2a2a2a' : colors.surface,
          paddingHorizontal: 12,
          paddingVertical: 3,
          borderRadius: 20,
        }}
      >
        <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '500' }}>
          {item.text}
        </Text>
      </View>
    </View>
  );

  // ── Render: Message Bubble ─────────────────────────────────────────────────
  const renderBubble = (item: BubbleItem) => {
    const isMine = item.isMine;
    const topMargin = item.isFirstInGroup ? 16 : 4;

    const bubbleBg = isMine
      ? colors.purple
      : isDark
      ? '#1e1e1e'
      : colors.surface;

    // WhatsApp-style read ticks
    const statusIcon = isMine ? (
      item.status === 'read' ? (
        <Text style={{ fontSize: 10, color: '#4FC3F7' }}>✓✓</Text>
      ) : item.status === 'delivered' ? (
        <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>✓✓</Text>
      ) : (
        <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>✓</Text>
      )
    ) : null;

    // ── Group sender metadata ──────────────────────────────────────────────
    const showGroupMeta = isGroup && !isMine;
    const senderId = (item as any).senderId as string | undefined;
    const senderColor = senderId ? getSenderColor(senderId) : colors.purple;

    return (
      <View
        style={{
          width: '100%',
          paddingHorizontal: 8,
          marginTop: topMargin,
          flexDirection: isMine ? 'row-reverse' : 'row',
          direction: 'ltr',
          alignItems: 'flex-end',
        }}
      >
        {/* Group: sender avatar (left of bubble, only for first in group) */}
        {showGroupMeta ? (
          <TouchableOpacity
            onPress={() => navigateToProfile(senderId)}
            activeOpacity={0.8}
            style={{ marginRight: 6, marginBottom: 2 }}
          >
            {item.isFirstInGroup ? (
              item.senderAvatar ? (
                <Image
                  source={{ uri: item.senderAvatar }}
                  style={{ width: 30, height: 30, borderRadius: 15 }}
                  contentFit="cover"
                />
              ) : (
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: senderColor,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
                    {(item.senderName ?? '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )
            ) : (
              // Spacer to keep bubble alignment when no avatar shown
              <View style={{ width: 30 }} />
            )}
          </TouchableOpacity>
        ) : null}

        <View style={{ flex: 1, direction: 'ltr', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
          {/* Group: tappable sender name above bubble */}
          {showGroupMeta && item.senderName && item.isFirstInGroup && (
            <TouchableOpacity onPress={() => navigateToProfile(senderId)} activeOpacity={0.7}>
              <Text style={{ color: senderColor, fontSize: 12, fontWeight: '700', marginBottom: 2, marginLeft: 4 }}>
                {item.senderName}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            activeOpacity={0.85}
            onLongPress={() => handleLongPress(item)}
            delayLongPress={300}
            style={{ maxWidth: '80%' }}
          >
          {/* Reply preview */}
          {item.replyTo && (
            <View
              style={{
                backgroundColor: isMine
                  ? 'rgba(0,0,0,0.15)'
                  : isDark ? '#2a2a2a' : '#e8e8e8',
                borderLeftWidth: 3,
                borderLeftColor: colors.purple,
                borderRadius: 8,
                padding: 8,
                marginBottom: 2,
              }}
            >
              <Text style={{ color: colors.purple, fontSize: 11, fontWeight: '600', marginBottom: 2 }}>
                {item.replyTo.senderName || 'Message'}
              </Text>
              <Text style={{ color: isMine ? 'rgba(255,255,255,0.8)' : colors.textMuted, fontSize: 12 }} numberOfLines={1}>
                {item.replyTo.content}
              </Text>
            </View>
          )}

          {/* Bubble */}
          <View
            style={{
              backgroundColor: bubbleBg,
              borderRadius: 18,
              borderTopRightRadius: isMine ? 4 : 18,
              borderTopLeftRadius: isMine ? 18 : 4,
              paddingHorizontal: (item.type === 'audio' || ((item.content || '').toLowerCase().includes('missed') && (item.content || '').toLowerCase().includes('call'))) ? 8 : 12,
              paddingVertical: (item.type === 'audio' || ((item.content || '').toLowerCase().includes('missed') && (item.content || '').toLowerCase().includes('call'))) ? 6 : 8,
              minWidth: 80,
            }}
          >
            {/* Forwarded label */}
            {item.isForwarded && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Ionicons name="arrow-redo" size={11} color={isMine ? 'rgba(255,255,255,0.7)' : colors.textMuted} />
                <Text style={{ color: isMine ? 'rgba(255,255,255,0.7)' : colors.textMuted, fontSize: 11, marginLeft: 3, fontStyle: 'italic' }}>
                  Forwarded
                </Text>
              </View>
            )}

            {/* Content Rendering based on Type */}
            {item.type === 'image' ? (
              <TouchableOpacity onPress={() => setFullscreenImage(item.content)}>
                <Image
                  source={{ uri: item.content }}
                  style={{ width: 200, height: 200, borderRadius: 12, marginBottom: 4 }}
                  contentFit="cover"
                />
              </TouchableOpacity>
            ) : item.type === 'post' ? (
              <View style={{
                backgroundColor: isDark ? '#1F1F1F' : '#F9F9F9',
                borderColor: isDark ? '#333333' : '#EAEAEA',
                borderWidth: 1,
                borderRadius: 16,
                padding: 12,
                marginBottom: 4,
                width: 240,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderBottomWidth: 0.5, borderBottomColor: isDark ? '#333' : '#E0E0E0', paddingBottom: 8 }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(124, 58, 237, 0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                    <Ionicons name="document-text" size={15} color="#7C3AED" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#E5E5E5' : '#2D2D2D', textTransform: 'uppercase', letterSpacing: 0.3 }}>Shared a Post</Text>
                    <Text style={{ fontSize: 9, color: colors.textMuted }}>Rabta Community</Text>
                  </View>
                </View>

                {item.postId && typeof item.postId === 'object' && item.postId.media && item.postId.media.length > 0 ? (
                  <Image
                    source={{ uri: item.postId.media[0].fileUrl }}
                    style={{ width: '100%', height: 110, borderRadius: 10, marginBottom: 8 }}
                    contentFit="cover"
                  />
                ) : null}

                <Text style={{ fontSize: 13, color: isDark ? '#F5F5F5' : '#1A1A1A', marginBottom: 10, lineHeight: 17 }} numberOfLines={3}>
                  {item.content}
                </Text>

                <TouchableOpacity
                  style={{
                    backgroundColor: 'rgba(124, 58, 237, 0.1)',
                    borderRadius: 10,
                    paddingVertical: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 0.5,
                    borderColor: 'rgba(124, 58, 237, 0.2)'
                  }}
                  onPress={() => {
                    const postObj = item.postId;
                    const commId = typeof postObj === 'object' ? postObj?.communityId : undefined;
                    const postId = typeof postObj === 'object' ? postObj?._id : (typeof postObj === 'string' ? postObj : undefined);
                    if (commId) {
                      router.push({
                        pathname: '/community-feed',
                        params: { communityId: commId, scrollToPostId: postId ?? '' }
                      });
                    }
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#7C3AED' }}>View Full Post</Text>
                </TouchableOpacity>
              </View>
            ) : item.type === 'file' ? (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)', padding: 8, borderRadius: 8, marginBottom: 4 }}
                onPress={() => WebBrowser.openBrowserAsync(item.content)}
              >
                <Ionicons name="document-text" size={24} color={isMine ? '#fff' : colors.text} />
                <Text style={{ color: isMine ? '#fff' : colors.text, marginLeft: 8, maxWidth: 150 }} numberOfLines={1}>
                  Document
                </Text>
              </TouchableOpacity>
            ) : item.type === 'audio' ? (
              <AudioMessagePlayer
                uri={item.content}
                isMine={isMine}
                colors={colors}
                isDark={isDark}
              />
            ) : (
              <View style={{ gap: 4 }}>
                {activeTranslatingId === item.id ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}>
                    <ActivityIndicator size="small" color={isMine ? '#fff' : colors.purple} />
                    <Text style={{ fontStyle: 'italic', fontSize: 13, color: isMine ? 'rgba(255,255,255,0.7)' : colors.textMuted }}>
                      Translating...
                    </Text>
                  </View>
                ) : activeTranslated[item.id] ? (
                  <View style={{ gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <MaterialIcons name="g-translate" size={12} color={isMine ? 'rgba(255,255,255,0.8)' : colors.purple} />
                      <Text style={{ fontSize: 11, fontWeight: '600', color: isMine ? 'rgba(255,255,255,0.8)' : colors.purple }}>
                        Translated
                      </Text>
                    </View>
                    <Text
                      style={{
                        color: isMine ? '#ffffff' : colors.text,
                        fontSize: 15,
                        lineHeight: 21,
                        flexShrink: 1,
                      }}
                    >
                      {activeTranslated[item.id].translatedText}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        if (onClearTranslation) {
                          onClearTranslation(item.id);
                        } else {
                          setInternalTranslated((prev) => {
                            const copy = { ...prev };
                            delete copy[item.id];
                            return copy;
                          });
                        }
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={{ fontSize: 11, textDecorationLine: 'underline', color: isMine ? '#ffffff' : colors.purple, marginTop: 4 }}>
                        Show Original
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  (() => {
                    const contentLower = (item.content || '').toLowerCase();
                    const isMissedCall = contentLower.includes('missed') && contentLower.includes('call');
                    if (isMissedCall) {
                      const isVoice = contentLower.includes('voice');
                      return (
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 4,
                          paddingHorizontal: 2,
                          gap: 10,
                          width: 200,
                        }}>
                          <View style={{
                            width: 34,
                            height: 34,
                            borderRadius: 17,
                            backgroundColor: isMine 
                              ? 'rgba(255,255,255,0.25)' 
                              : (isDark ? '#3E1F1F' : '#FEE2E2'),
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <Ionicons
                              name={isVoice ? "call" : "videocam"}
                              size={18}
                              color={isMine ? '#FFFFFF' : '#EF4444'}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{
                              fontSize: 14,
                              fontWeight: '600',
                              color: isMine ? '#FFFFFF' : colors.text,
                            }}>
                              {item.content}
                            </Text>
                            <Text style={{
                              fontSize: 10,
                              color: isMine ? 'rgba(255,255,255,0.75)' : colors.textMuted,
                              marginTop: 1,
                            }}>
                              {isVoice ? 'Voice Call' : 'Video Call'}
                            </Text>
                          </View>
                        </View>
                      );
                    }
                    return (
                      <Text
                        style={{
                          color: isMine ? '#ffffff' : colors.text,
                          fontSize: 15,
                          lineHeight: 21,
                          flexShrink: 1,
                        }}
                      >
                        {item.content ?? ''}
                      </Text>
                    );
                  })()
                )}
              </View>
            )}

            {/* Timestamp + status row */}
            <View
              style={{
                flexDirection: 'row',
                alignSelf: 'flex-end',
                alignItems: 'center',
                marginTop: 4,
                gap: 3,
              }}
            >
              {starredMessageIds?.has(item.id) && (
                <Ionicons
                  name="star"
                  size={10}
                  color={isMine ? 'rgba(255,255,255,0.7)' : '#FFD700'}
                  style={{ marginRight: 1 }}
                />
              )}
              {item.isPinned && (
                <Ionicons
                  name="pin"
                  size={10}
                  color={isMine ? 'rgba(255,255,255,0.7)' : colors.purple}
                  style={{ marginRight: 1 }}
                />
              )}
              {item.isEdited && (
                <Text
                  style={{
                    fontSize: 9,
                    color: isMine ? 'rgba(255,255,255,0.65)' : colors.textMuted,
                    fontStyle: 'italic',
                    marginRight: 2,
                  }}
                >
                  edited
                </Text>
              )}
              <Text
                style={{
                  fontSize: 10,
                  color: isMine ? 'rgba(255,255,255,0.65)' : colors.textMuted,
                }}
              >
                {item.time ?? ''}
              </Text>
              {statusIcon}
            </View>
          </View>

          {/* Reactions row */}
          {item.reactions && item.reactions.length > 0 && (
            <View
              style={{
                flexDirection: 'row',
                alignSelf: isMine ? 'flex-end' : 'flex-start',
                backgroundColor: isDark ? '#3a3a3c' : '#ffffff',
                borderRadius: 12,
                paddingHorizontal: 6,
                paddingVertical: 2,
                marginTop: 2,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2,
              }}
            >
              {item.reactions.slice(0, 5).map((r, i) => (
                <Text key={i} style={{ fontSize: 13 }}>{r.emoji}</Text>
              ))}
              {item.reactions.length > 5 && (
                <Text style={{ fontSize: 11, color: colors.textMuted, marginLeft: 2 }}>
                  +{item.reactions.length - 5}
                </Text>
              )}
            </View>
          )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderItem = ({ item }: { item: RenderItem }) => {
    if ((item as SeparatorItem).isSeparator) {
      return renderSeparator(item as SeparatorItem);
    }
    return renderBubble(item as BubbleItem);
  };

  if (loading && messages.length === 0) return null;

  return (
    <>
      <FlatList
        ref={flatListRef}
        data={renderData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 12 }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        onLayout={() =>
          flatListRef.current?.scrollToEnd({ animated: false })
        }
        keyboardShouldPersistTaps="handled"
      />

      {/* Context Menu (Long Press) */}
      <MessageContextMenu
        visible={menuVisible}
        message={contextMsg}
        onClose={() => setMenuVisible(false)}
        onReact={handleReact}
        onReply={(msg) => { onReply?.(msg); }}
        onForward={handleForward}
        onCopy={handleCopy}
        onDelete={handleDelete}
        onPin={handlePin}
        onStar={onStar}
        isGroup={isGroup}
        onTranslate={handleTranslateMessage}
        onSmartReplies={onSmartReplies}
        onMore={onMore}
        onInfo={onInfo}
      />

      {/* Fullscreen Image Modal */}
      <Modal visible={!!fullscreenImage} transparent={true} animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
          <SafeAreaView style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
            <TouchableOpacity onPress={() => setFullscreenImage(null)} style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 }}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </SafeAreaView>
          {fullscreenImage && (
            <Image
              source={{ uri: fullscreenImage }}
              style={{ width: '100%', height: '80%' }}
              contentFit="contain"
            />
          )}
        </View>
      </Modal>
    </>
  );
}
