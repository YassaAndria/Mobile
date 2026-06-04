import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import axiosInstance from '../../api/axiosInstance';
import type { MessageType } from '../../types';

const { width, height } = Dimensions.get('window');

interface ForwardMessageModalProps {
  visible: boolean;
  onClose: () => void;
  message: MessageType | null;
  currentUserId: string;
  onForwardSuccess: (chatName: string) => void;
}

export default function ForwardMessageModal({
  visible,
  onClose,
  message,
  currentUserId,
  onForwardSuccess,
}: ForwardMessageModalProps) {
  const { colors, isDark } = useTheme();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [forwardingChatId, setForwardingChatId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      axiosInstance.get('/chats')
        .then((res) => {
          const list = res.data?.data?.chats || [];
          // Sort by updatedAt
          list.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          setChats(list);
        })
        .catch((err) => {
          console.error('[ForwardMessageModal] Error fetching chats:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setSearchQuery('');
      setForwardingChatId(null);
    }
  }, [visible]);

  const getAvatarUri = (raw: string | any) => {
    if (!raw) return null;
    const uri = typeof raw === 'string' ? raw : raw.image;
    if (!uri) return null;
    if (uri.startsWith('http')) return uri;
    const base = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace('/api/v1', '');
    return `${base}${uri}`;
  };

  const getChatDetails = useCallback((chat: any) => {
    if (chat.isGroup) {
      return {
        name: chat.groupName || chat.name || 'Group Chat',
        avatar: getAvatarUri(chat.groupAvatar || chat.avatar),
      };
    }
    
    const partner = chat.users?.find((u: any) => (u._id || u.id) !== currentUserId);
    if (partner) {
      return {
        name: partner.fullName || partner.name || partner.username || 'User',
        avatar: getAvatarUri(partner.avatar || partner.profilePicture),
      };
    }
    
    return {
      name: chat.name || 'Chat',
      avatar: getAvatarUri(chat.avatar),
    };
  }, [currentUserId]);

  const filteredChats = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return chats;
    return chats.filter((chat) => {
      const { name } = getChatDetails(chat);
      return name.toLowerCase().includes(query);
    });
  }, [chats, searchQuery, getChatDetails]);

  const handleForward = async (chatItem: any) => {
    if (!message) return;
    const targetChatId = chatItem._id;
    const { name: targetChatName } = getChatDetails(chatItem);

    setForwardingChatId(targetChatId);
    try {
      const payload: any = {
        content: message.content || '',
        type: message.type || 'text',
        isForwarded: true,
      };

      const msgType = (message.type || 'text') as string;
      if (msgType === 'audio') {
        payload.audioUrl = message.content;
      }
      if (msgType === 'image' || msgType === 'file' || msgType === 'video') {
        payload.attachments = [{
          fileUrl: message.content,
          fileType: msgType === 'image' ? 'image/jpeg' : 'application/octet-stream',
          fileSize: 0,
        }];
      }

      await axiosInstance.post(`/chats/${targetChatId}/send`, payload);
      onForwardSuccess(targetChatName);
    } catch (err) {
      console.error('[ForwardMessageModal] Forward failed:', err);
    } finally {
      setForwardingChatId(null);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Forward Message</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Message Preview */}
          {message && (
            <View style={[styles.previewContainer, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
              <Text style={[styles.previewLabel, { color: colors.textMuted }]}>Forwarding:</Text>
              <Text style={[styles.previewText, { color: colors.text }]} numberOfLines={2}>
                {message.type === 'text' ? message.content : `📎 [${message.type || 'Attachment'}]`}
              </Text>
            </View>
          )}

          {/* Search Input */}
          <View style={[styles.searchBar, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
            <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search chats..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Chats list */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={colors.purple} size="large" />
            </View>
          ) : (
            <FlatList
              data={filteredChats}
              keyExtractor={(item) => item._id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const { name, avatar } = getChatDetails(item);
                const initials = name.charAt(0).toUpperCase();
                const isForwardingThis = forwardingChatId === item._id;

                return (
                  <View style={[styles.chatRow, { borderBottomColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
                    <View style={[styles.avatarContainer, { backgroundColor: colors.purple + '20' }]}>
                      {avatar ? (
                        <Image source={{ uri: avatar }} style={styles.avatar} contentFit="cover" />
                      ) : (
                        <Text style={[styles.initials, { color: colors.purple }]}>{initials}</Text>
                      )}
                    </View>
                    <View style={styles.chatInfo}>
                      <Text style={[styles.chatName, { color: colors.text }]} numberOfLines={1}>
                        {name}
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                        {item.isGroup ? 'Group Chat' : 'Direct Chat'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.sendBtn, { backgroundColor: colors.purple }]}
                      onPress={() => handleForward(item)}
                      disabled={isForwardingThis}
                    >
                      {isForwardingThis ? (
                        <ActivityIndicator color="#FFF" size="small" />
                      ) : (
                        <>
                          <Text style={styles.sendBtnText}>Send</Text>
                          <Ionicons name="send" size={12} color="#FFF" />
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={{ color: colors.textMuted }}>No conversations found.</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: height * 0.75,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  previewContainer: {
    marginHorizontal: 20,
    marginVertical: 12,
    padding: 12,
    borderRadius: 12,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  previewText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  initials: {
    fontSize: 16,
    fontWeight: '700',
  },
  chatInfo: {
    flex: 1,
  },
  chatName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  sendBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
});
