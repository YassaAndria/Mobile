import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, Text, StyleSheet, ActivityIndicator, FlatList, 
  TouchableOpacity, RefreshControl, TextInput
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import axiosInstance from '../../src/api/axiosInstance';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { useChat } from '../../src/context/ChatContext';
import { useAppSelector } from '../../src/store/hooks';
import { formatMessagePreview } from '../../src/utils/chatMessage';

export default function ChatsScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { socket } = useChat();
  const currentUser = useAppSelector((state: any) => state.auth?.user);
  const currentUserId = currentUser?._id || currentUser?.id || '';

  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);

  const fetchChats = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await axiosInstance.get('/chats');
      const fetchedChats = res.data?.data?.chats || [];
      // Sort immediately by updatedAt descending
      fetchedChats.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setChats(fetchedChats);
    } catch (e) {
      console.error('[ChatsScreen] Error fetching chats:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  useEffect(() => {
    if (!socket) return;
    
    const handleNewMessage = (msg: any) => {
      setChats(prev => {
        let chatExists = false;
        const updated = prev.map(c => {
          if (c._id === msg.chatId) {
            chatExists = true;
            const senderId = typeof msg.senderId === 'object' ? (msg.senderId?._id || msg.senderId?.id) : msg.senderId;
            const isMe = senderId === currentUserId;
            
            return {
              ...c,
              lastMessage: {
                content: msg.content || msg.text || 'New message',
                createdAt: msg.createdAt || new Date().toISOString()
              },
              updatedAt: msg.createdAt || new Date().toISOString(),
              unreadCount: !isMe ? (c.unreadCount || 0) + 1 : c.unreadCount
            };
          }
          return c;
        });
        
        if (!chatExists) {
          // New chat created that isn't in our list yet, refetch to get it
          fetchChats();
          return prev;
        }
        
        return updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      });
    };

    socket.on('receive-message', handleNewMessage);
    socket.on('receiveMessage', handleNewMessage);
    
    return () => {
      socket.off('receive-message', handleNewMessage);
      socket.off('receiveMessage', handleNewMessage);
    };
  }, [socket, currentUserId, fetchChats]);

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
    
    // 1-on-1 chat
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
    if (!searchQuery.trim()) return chats;
    const lowerQuery = searchQuery.toLowerCase();
    return chats.filter(chat => {
      const { name } = getChatDetails(chat);
      return name.toLowerCase().includes(lowerQuery);
    });
  }, [chats, searchQuery, getChatDetails]);

  const renderItem = ({ item }: { item: any }) => {
    const { name, avatar } = getChatDetails(item);
    const initials = name.charAt(0).toUpperCase();

    // Resolve last message — backend may use lastMessage or latestMessage, both shapes supported
    const rawMsg = item.lastMessage ?? item.latestMessage;
    let lastMsgText: string;
    if (!rawMsg) {
      lastMsgText = 'No messages yet';
    } else if (typeof rawMsg === 'string') {
      lastMsgText = formatMessagePreview({ text: rawMsg });
    } else {
      lastMsgText = formatMessagePreview(rawMsg);
    }

    // Time: prefer the last message's timestamp, fall back to chat updatedAt
    const rawTime = rawMsg?.createdAt || rawMsg?.updatedAt || item.updatedAt;
    const time = rawTime
      ? new Date(rawTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

    return (
      <TouchableOpacity 
        style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
        activeOpacity={0.7}
        onPress={() => {
          router.push({
            pathname: '/ChatWindowScreen',
            params: {
              chatId: item._id,
              chatName: name,
              isGroup: item.isGroup ? 'true' : 'false',
              avatar: avatar || ''
            }
          } as any);
        }}
      >
        <View style={[styles.avatarContainer, { backgroundColor: colors.purple + '20' }]}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} contentFit="cover" />
          ) : (
            <Text style={[styles.initials, { color: colors.purple }]}>{initials}</Text>
          )}
        </View>
        
        <View style={styles.chatInfo}>
          <View style={styles.nameRow}>
            <Text style={[typography.body, { color: colors.text, fontWeight: item.unreadCount ? '700' : '600' }]} numberOfLines={1}>
              {name}
            </Text>
            {time ? <Text style={[typography.caption, { color: colors.textMuted }]}>{time}</Text> : null}
          </View>
          <View style={styles.messageRow}>
            <Text style={[typography.caption, { color: item.unreadCount ? colors.text : colors.textMuted, flex: 1, fontWeight: item.unreadCount ? '600' : '400' }]} numberOfLines={1}>
              {lastMsgText}
            </Text>
            {item.unreadCount > 0 && (
              <View style={[styles.unreadBadge, { backgroundColor: colors.purple }]}>
                <Text style={styles.unreadText}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.purple} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackVisible: false,
          headerTitle: '',
          headerStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          headerLeft: () =>
            isSearchMode ? (
              <View style={[styles.searchBarContainer, { backgroundColor: isDark ? '#262626' : '#F3F4F6' }]}>
                <Ionicons name="search" size={20} color={isDark ? '#888' : '#9CA3AF'} style={{ marginLeft: 10 }} />
                <TextInput
                  autoFocus
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Search conversations..."
                  placeholderTextColor={isDark ? '#888' : '#9CA3AF'}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                <TouchableOpacity
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  onPress={() => {
                    setIsSearchMode(false);
                    setSearchQuery('');
                  }}
                >
                  <Ionicons name="close-circle" size={20} color={isDark ? '#888' : '#9CA3AF'} style={{ marginRight: 10 }} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 5 }}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Chats</Text>
                <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} onPress={() => setIsSearchMode(true)}>
                  <Ionicons name="search" size={22} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  onPress={() => router.push('/contacts')}
                  style={[styles.addBtn, { backgroundColor: '#7C3AED' }]}
                >
                  <Ionicons name="add" size={22} color="#FFF" />
                </TouchableOpacity>
              </View>
            ),
        }}
      />

      <FlatList
        data={filteredChats}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchChats(true)}
            tintColor={colors.purple}
            colors={[colors.purple]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color={colors.textMuted} />
            <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center', marginTop: 16 }]}>
              {searchQuery ? 'No chats match your search.' : 'No chats yet.'}
            </Text>
          </View>
        }
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  searchBarContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 20, height: 40 },
  addBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  header: { 
    paddingHorizontal: 20, 
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    marginTop: 16,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    paddingHorizontal: 10,
    fontSize: 15,
    height: '100%',
  },
  listContent: { padding: 16, paddingBottom: 40 },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  row: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    borderRadius: 16, 
    borderWidth: 1, 
    marginBottom: 12 
  },
  avatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  initials: {
    fontSize: 20,
    fontWeight: '700',
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});