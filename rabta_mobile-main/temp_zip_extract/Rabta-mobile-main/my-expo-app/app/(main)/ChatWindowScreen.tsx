import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAudioRecorder, RecordingPresets, setAudioModeAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAppSelector } from '../../src/store/hooks';
import { useChat } from '../../src/context/ChatContext';
import axiosInstance from '../../src/api/axiosInstance';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../src/theme/ThemeContext';
import { spacing as Spacing } from '../../src/theme/design-system';
import { typography as Typography } from '../../src/theme/typography';
import type { MessageType } from '../../src/types';
import ChatBody from '../../src/components/chat/ChatBody';
import ChatInputBar from '../../src/components/chat/ChatInputBar';
import AttachmentModal from '../../src/components/chat/AttachmentModal';

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatMsg = (m: any, myId: string): MessageType => ({
  id: m._id,
  type: m.messageType === 'file' ? 'file' : 'text',
  content: m.content ?? '',
  time: new Date(m.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  }),
  createdAt: m.createdAt,
  isMine: (typeof m.senderId === 'string' ? m.senderId : m.senderId?._id) === myId,
});

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChatWindowScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const chatId = params.chatId as string;
  const chatName = params.chatName as string;
  const isOnline = String(params.isOnline) === 'true';
  const isGroup = String(params.isGroup) === 'true';
  const recipientId = params.userId as string | undefined; // the other participant's ID

  const { colors, isDark } = useTheme();
  const theme = { colors };
  const { socket, sendMessage } = useChat();

  // ── State ─────────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isAttachModalVisible, setAttachModalVisible] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // useRef for FlatList scroll — passed down to ChatBody
  const flatListRef = useRef<any>(null);

  // ── Load current user ─────────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem('user').then(stored => {
      if (stored) setCurrentUserId(JSON.parse(stored)._id);
    });
  }, []);

  // ── Fetch messages + mark as read ─────────────────────────────────────────
  useEffect(() => {
    if (!chatId) return;

    const fetchMessages = async () => {
      try {
        setLoading(true);
        const [msgRes, uid] = await Promise.all([
          axiosInstance.get(`/chats/${chatId}/messages`),
          AsyncStorage.getItem('user').then(s => (s ? JSON.parse(s)._id : '')),
        ]);

        const formatted: MessageType[] = (msgRes.data.data.messages ?? []).map(
          (m: any) => formatMsg(m, uid),
        );
        setMessages(formatted);

        // Count unread messages (not mine and not yet read)
        const unread = (msgRes.data.data.messages ?? []).filter(
          (m: any) => !m.readBy?.includes(uid),
        ).length;
        setUnreadCount(unread);

        // Mark all as read immediately
        await markAllRead();
      } catch (e) {
        console.error('[ChatWindow] Failed to fetch messages', e);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [chatId]);

  // ── Mark all messages in this chat as read ────────────────────────────────
  const markAllRead = useCallback(async () => {
    try {
      await axiosInstance.post(`/chats/${chatId}/read`);
      setUnreadCount(0); // immediately hide badge
    } catch (e) {
      // Non-critical: silently fail
      console.warn('[ChatWindow] markAllRead failed', e);
    }
  }, [chatId]);

  // ── Socket: receive incoming messages ─────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleReceive = (incoming: any) => {
      if (incoming.chatId !== chatId) return;

      const msg: MessageType = {
        id: incoming._id,
        type: incoming.messageType === 'file' ? 'file' : 'text',
        content: incoming.content ?? '',
        time: new Date(incoming.createdAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        createdAt: incoming.createdAt,
        isMine: false,
      };

      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev; // deduplicate
        return [...prev, msg];
      });

      // Auto-mark new incoming messages as read since the window is open
      markAllRead();
    };

    socket.on('receive_message', handleReceive);
    socket.on('receive-message', handleReceive);
    return () => {
      socket.off('receive_message', handleReceive);
      socket.off('receive-message', handleReceive);
    };
  }, [socket, chatId, markAllRead]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text) return;

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimistic: MessageType = {
      id: tempId,
      type: 'text',
      content: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString(),
      isMine: true,
    };

    setMessages(prev => [...prev, optimistic]);
    setInputText(''); // clear immediately for snappy UX

    try {
      // Use socket to emit message
      sendMessage(chatId, text, 'text');

      const res = await axiosInstance.post(`/chats/${chatId}/messages`, {
        content: text,
        messageType: 'text',
      });
      const saved = res.data.data.message;
      // Replace temp id with real server id
      setMessages(prev =>
        prev.map(m => (m.id === tempId ? { ...m, id: saved._id } : m)),
      );
    } catch (e) {
      // Roll back failed message
      setMessages(prev => prev.filter(m => m.id !== tempId));
      Alert.alert('Error', 'Failed to send message. Please try again.');
      console.error('[ChatWindow] Send failed', e);
    }
  }, [inputText, chatId, sendMessage]);

  const uploadFile = async (file: any) => {
    console.log('[ChatWindow] Uploading file:', file);
    // Placeholder for actual file upload API
    // After upload, call sendMessage or axios post with the file URL
  };

  // ── Attachment: Image Picker ──────────────────────────────────────────────
  const handleCamera = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      uploadFile(result.assets[0]);
    }
  }, []);

  const handleLibrary = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Library access is required to select photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      uploadFile(result.assets[0]);
    }
  }, []);

  // ── Attachment: Document Picker ───────────────────────────────────────────
  const handleDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        uploadFile(result.assets[0]);
      }
    } catch (e) {
      console.error('[ChatWindow] Document picker error', e);
    }
  }, []);

  // ── Voice Recording ─────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permission needed', 'Microphone access is required to record voice notes.');
        return;
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      setIsRecording(true);
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (e) {
      console.error('[ChatWindow] Failed to start recording', e);
      setIsRecording(false);
    }
  }, [recorder]);

  const stopRecording = useCallback(async () => {
    setIsRecording(false);

    try {
      if (recorder.isRecording) {
        await recorder.stop();
      }
      const uri = recorder.uri;
      if (uri) {
        console.log('[ChatWindow] Voice note recorded:', uri);
        uploadFile({ uri, type: 'audio/m4a', name: 'voice_note.m4a' });
      }
    } catch (e) {
      console.error('[ChatWindow] Failed to stop recording', e);
    }
  }, [recorder]);

  // ── Styles ────────────────────────────────────────────────────────────────
  const s = styles(isDark, theme);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container}>
      <Stack.Screen options={{ headerShown: false, headerRight: () => null }} />
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={s.header}>
        {/* Back button */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={26} color={colors.purple} />
        </TouchableOpacity>

        {/* Avatar + Name — tappable for profile navigation */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={[s.headerInfo, { marginLeft: 10, zIndex: 10 }]}
          hitSlop={{ top: 8, bottom: 8, left: 0, right: 8 }}
          onPress={() => {
            console.log('[ChatWindow] Avatar/Name pressed. recipientId =', recipientId, '| isGroup =', isGroup);
            if (isGroup) {
              console.log('[ChatWindow] Skipping navigation: this is a group chat.');
              return;
            }
            if (!recipientId) {
              console.warn('[ChatWindow] recipientId is undefined — userId was not passed as a route param!');
              Alert.alert('Navigation Error', 'Could not open profile: user ID is missing.');
              return;
            }
            router.push({ pathname: '/(main)/profile/[id]', params: { id: recipientId } });
          }}
        >
          {/* Avatar */}
          <View
            style={[
              s.headerAvatar,
              { backgroundColor: chatId === 'ai-assistant' ? colors.purple : isGroup ? 'rgba(249,115,22,0.12)' : colors.purple10 },
            ]}
          >
            {chatId === 'ai-assistant' ? (
              <MaterialIcons name="auto-awesome" size={20} color="#fff" />
            ) : (
              <Text
                style={{ color: isGroup ? '#f97316' : colors.purple, fontWeight: '700', fontSize: 16 }}
              >
                {chatName?.[0]?.toUpperCase() ?? '?'}
              </Text>
            )}

            {/* Unread badge — only shown if unreadCount > 0 */}
            {unreadCount > 0 && (
              <View style={s.badge}>
                <Text style={s.badgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </View>

          {/* Name + online status */}
          <View style={{ flex: 1 }}>
            <Text style={s.headerName} numberOfLines={1}>
              {chatId === 'ai-assistant' ? 'Rabta AI' : chatName}
            </Text>
            {!isGroup && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {chatId !== 'ai-assistant' && (
                  <View
                    style={[
                      s.statusDot,
                      {
                        backgroundColor: isOnline
                          ? (colors.successText || '#22c55e')
                          : (colors.errorText || '#ef4444'),
                      },
                    ]}
                  />
                )}
                <Text style={s.statusText}>
                  {chatId === 'ai-assistant' ? 'Always here to help ✨' : isOnline ? 'Online' : 'Offline'}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* ── Call Icons ────────────────────────────────────────────────── */}
        <View style={s.headerActions}>
          <TouchableOpacity
            style={s.actionIcon}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() =>
              Alert.alert('Feature Coming Soon', 'Video Call will be available in a future update.', [
                { text: 'OK' },
              ])
            }
          >
            <Ionicons name="videocam-outline" size={24} color={colors.purple} />
          </TouchableOpacity>

          <TouchableOpacity
            style={s.actionIcon}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() =>
              Alert.alert('Feature Coming Soon', 'Voice Call will be available in a future update.', [
                { text: 'OK' },
              ])
            }
          >
            <Ionicons name="call-outline" size={22} color={colors.purple} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Message list + input ─────────────────────────────────────────── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {messages ? (
          <ChatBody messages={messages} loading={loading} />
        ) : null}

        {/* WhatsApp-style Input Bar */}
        <ChatInputBar
          value={inputText}
          onChangeText={setInputText}
          onSend={handleSend}
          onAttach={() => setAttachModalVisible(true)}
          onCamera={handleCamera}
          isRecording={isRecording}
          onMicPressIn={startRecording}
          onMicPressOut={stopRecording}
        />

        <AttachmentModal
          visible={isAttachModalVisible}
          onClose={() => setAttachModalVisible(false)}
          onSelectLibrary={handleLibrary}
          onSelectCamera={handleCamera}
          onSelectDocument={handleDocument}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


// ── Stylesheet ────────────────────────────────────────────────────────────────

const styles = (isDark: boolean, theme: { colors: any }) => {
  const colors = theme.colors;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
      gap: Spacing.sm,
    },
    backBtn: { padding: Spacing.xs },
    headerInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    headerAvatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerName: {
      fontSize: Typography.body?.fontSize || 16,
      fontWeight: '600',
      color: colors.text,
    },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: {
      fontSize: Typography.caption?.fontSize || 11,
      color: colors.textMuted,
    },
    badge: {
      position: 'absolute',
      top: -4,
      right: -4,
      backgroundColor: colors.purple,
      borderRadius: 10,
      minWidth: 18,
      height: 18,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 3,
    },
    badgeText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '700',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    actionIcon: {
      padding: Spacing.xs,
    },
  });
};
