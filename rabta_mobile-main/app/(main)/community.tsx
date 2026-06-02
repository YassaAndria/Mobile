import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../../src/theme/ThemeContext';
import { useChat } from '../../src/context/ChatContext';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  acceptCommunityInvite,
  declineCommunityInvite,
  listCommunities,
  joinCommunity,
} from '../../src/api/community';
import { getApiErrorMessage } from '../../src/api/getApiErrorMessage';
import { markChatAsRead } from '../../src/api/chat';
import { formatMessagePreview, normalizeId } from '../../src/utils/chatMessage';
import { mapCommunityFromApi, type CommunityRow, getCommunityChatId } from '../../src/utils/community';


export default function CommunityScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { socket } = useChat();

  const [activeFilter, setActiveFilter] = useState('All');
  const [communities, setCommunities] = useState<CommunityRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');

  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filters = ['All', 'Programming', 'UI/UX', 'Data', 'Cyber', 'Cloud'];

  useEffect(() => {
    AsyncStorage.getItem('user').then(stored => {
      if (stored) {
        const user = JSON.parse(stored);
        setCurrentUserId(normalizeId(user._id ?? user.id));
      }
    });
  }, []);

  const fetchCommunities = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const category = activeFilter === 'All' ? '' : activeFilter.toLowerCase();
      const res = await listCommunities(category || undefined);
      const raw = res.data?.data?.communities ?? [];
      const uid = currentUserId || '';
      setCommunities(raw.map((c: Record<string, unknown>) => mapCommunityFromApi(c, uid)));
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to load communities' });
      setCommunities([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter, currentUserId]);

  useEffect(() => {
    if (currentUserId) fetchCommunities();
  }, [fetchCommunities, currentUserId]);

  useFocusEffect(
    useCallback(() => {
      if (currentUserId) fetchCommunities(true);
    }, [fetchCommunities, currentUserId]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchCommunities(true);
  };

  const upsertFromMessage = useCallback(
    (msg: Record<string, unknown>) => {
      const chatId = normalizeId(msg.chatId);
      const senderId = normalizeId(
        typeof msg.senderId === 'object' && msg.senderId
          ? (msg.senderId as { _id?: unknown })._id ?? msg.senderId
          : msg.senderId,
      );
      const isMine = !!currentUserId && senderId === currentUserId;

      setCommunities(prev =>
        prev.map(c => {
          if (c.chatId !== chatId) return c;
          return {
            ...c,
            unreadCount: isMine ? 0 : (c.unreadCount || 0) + 1,
            latestPreview: formatMessagePreview(msg as Parameters<typeof formatMessagePreview>[0]),
            updatedAt: String(msg.createdAt ?? new Date().toISOString()),
          };
        }),
      );
    },
    [currentUserId],
  );

  useEffect(() => {
    if (!socket) return;

    const onReceive = (msg: Record<string, unknown>) => upsertFromMessage(msg);
    const onCommunity = (payload: {
      communityId?: string;
      lastMessage?: Record<string, unknown>;
      timestamp?: string;
      senderId?: string;
    }) => {
      if (!payload.communityId) return;
      const senderId = normalizeId(payload.senderId);
      const isMine = !!currentUserId && senderId === currentUserId;
      setCommunities(prev =>
        prev.map(c => {
          if (c._id !== payload.communityId) return c;
          const lm = payload.lastMessage;
          return {
            ...c,
            latestPreview: lm
              ? formatMessagePreview(lm as Parameters<typeof formatMessagePreview>[0])
              : c.latestPreview,
            updatedAt: String(payload.timestamp ?? new Date().toISOString()),
            unreadCount: isMine ? 0 : (c.unreadCount || 0) + 1,
          };
        }),
      );
    };

    socket.on('receiveMessage', onReceive);
    socket.on('receive-message', onReceive);
    socket.on('new-community-message', onCommunity);

    const onInvited = () => fetchCommunities(true);
    socket.on('invited-to-community', onInvited);
    socket.on('added-to-community', onInvited);

    return () => {
      socket.off('receiveMessage', onReceive);
      socket.off('receive-message', onReceive);
      socket.off('new-community-message', onCommunity);
      socket.off('invited-to-community', onInvited);
      socket.off('added-to-community', onInvited);
    };
  }, [socket, upsertFromMessage, currentUserId, fetchCommunities]);

  useEffect(() => {
    if (!socket) return;
    communities.forEach(c => {
      if (c._id) socket.emit('join-room', c._id);
    });
    return () => {
      communities.forEach(c => {
        if (c._id) socket.emit('leave-room', c._id);
      });
    };
  }, [socket, communities]);

  const openChat = async (item: CommunityRow) => {
    if (!item.chatId) {
      Toast.show({ type: 'error', text1: 'Chat not available for this group' });
      return;
    }
    setCommunities(prev =>
      prev.map(g => (g._id === item._id ? { ...g, unreadCount: 0 } : g)),
    );
    try {
      await markChatAsRead(item.chatId);
    } catch {
      /* non-critical */
    }
    router.push({
      pathname: '/ChatWindowScreen',
      params: {
        chatId: item.chatId,
        chatName: item.name,
        isGroup: 'true',
        communityId: item._id,
      },
    } as never);
  };

  const handleGroupPress = async (item: CommunityRow) => {
    if (item.isMember) {
      await openChat(item);
      return;
    }

    if (item.isInvited) {
      Alert.alert('Group invitation', `You were invited to ${item.name}`, [
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              await declineCommunityInvite(item._id);
              await fetchCommunities(true);
              Toast.show({ type: 'info', text1: 'Invitation declined' });
            } catch (e) {
              Toast.show({ type: 'error', text1: getApiErrorMessage(e, 'Failed') });
            }
          },
        },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              await acceptCommunityInvite(item._id);
              await fetchCommunities(true);
              Toast.show({ type: 'success', text1: `Joined ${item.name}!` });
              await openChat({ ...item, isMember: true, isInvited: false });
            } catch (e) {
              Toast.show({ type: 'error', text1: getApiErrorMessage(e, 'Failed') });
            }
          },
        },
      ]);
      return;
    }

    const joinLabel = item.isPublic === false ? 'Request to join' : 'Join';
    Alert.alert(joinLabel, `Join ${item.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: joinLabel,
        onPress: async () => {
          try {
            const res = await joinCommunity(item._id);
            if (res.data?.data?.requestSent) {
              Toast.show({ type: 'info', text1: 'Join request sent to admins' });
              return;
            }
            Toast.show({ type: 'success', text1: `Joined ${item.name}!` });
            await fetchCommunities(true);
            await openChat({ ...item, isMember: true });
          } catch (e) {
            Toast.show({ type: 'error', text1: getApiErrorMessage(e, 'Failed to join') });
          }
        },
      },
    ]);
  };

  const invitedCommunities = communities.filter(c => c.isInvited);
  const memberCommunities = communities.filter(c => c.isMember);

  const filteredCommunities = memberCommunities.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.description ?? '').toLowerCase().includes(q) ||
      c.latestPreview.toLowerCase().includes(q)
    );
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Stack.Screen
        options={{
          headerBackVisible: false,
          headerLeft: () =>
            isSearchMode ? (
              <View style={[styles.searchBarContainer, { backgroundColor: isDark ? '#262626' : '#F3F4F6' }]}>
                <Ionicons name="search" size={20} color={isDark ? '#888' : '#9CA3AF'} style={{ marginLeft: 10 }} />
                <TextInput
                  autoFocus
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Search your groups..."
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
                <Text style={[styles.headerTitle, { color: colors.text }]}>Community</Text>
                <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} onPress={() => setIsSearchMode(true)}>
                  <Ionicons name="search" size={22} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  onPress={() => router.push('/JoinGroupScreen')}
                >
                  <Ionicons name="compass-outline" size={22} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  onPress={() => router.push('/create-group')}
                  style={[styles.addBtn, { backgroundColor: '#7C3AED' }]}
                >
                  <Ionicons name="add" size={22} color="#FFF" />
                </TouchableOpacity>
              </View>
            ),
        }}
      />

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {filters.map(filter => {
            const isActive = activeFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                onPress={() => setActiveFilter(filter)}
                style={[
                  styles.filterBtn,
                  {
                    backgroundColor: isActive ? '#7C3AED' : isDark ? '#262626' : '#FFF',
                    borderColor: isActive ? '#7C3AED' : isDark ? '#333' : '#E5E7EB',
                  },
                ]}
              >
                <Text style={{ color: isActive ? '#FFF' : colors.text, fontSize: 13, fontWeight: '600' }}>
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.purple} />}
      >
        {isLoading ? (
          <View style={styles.feedPlaceholder}>
            <ActivityIndicator color={colors.purple} size="large" />
          </View>
        ) : filteredCommunities.length === 0 && invitedCommunities.length === 0 ? (
          <View style={styles.feedPlaceholder}>
            <Ionicons name="people-outline" size={60} color={isDark ? '#444' : '#ccc'} />
            <Text style={[styles.placeholderText, { color: isDark ? '#666' : '#999' }]}>
              {searchQuery ? 'No groups match your search.' : 'No communities yet. Create or discover one!'}
            </Text>
            <TouchableOpacity
              style={[styles.discoverBtn, { backgroundColor: colors.purple }]}
              onPress={() => router.push('/JoinGroupScreen')}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Discover groups</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {invitedCommunities.length > 0 && (
              <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
                <Text style={{ color: colors.purple, fontWeight: '700', fontSize: 13 }}>
                  Invitations ({invitedCommunities.length})
                </Text>
              </View>
            )}
            {invitedCommunities.map(item => (
              <TouchableOpacity
                key={`inv-${item._id}`}
                style={[
                  styles.groupRow,
                  {
                    borderBottomColor: isDark ? '#2A2A2A' : '#F0F0F0',
                    backgroundColor: isDark ? 'rgba(124,58,237,0.08)' : 'rgba(124,58,237,0.06)',
                  },
                ]}
                onPress={() => handleGroupPress(item)}
              >
                <View style={[styles.iconContainer, { backgroundColor: colors.purple10 }]}>
                  <Ionicons name="mail" size={22} color="#7C3AED" />
                </View>
                <View style={styles.textBlock}>
                  <Text style={[styles.groupName, { color: colors.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.snippet, { color: colors.textMuted }]}>Tap to accept or decline</Text>
                </View>
              </TouchableOpacity>
            ))}
            {filteredCommunities.map(item => {
              const timestamp = item.updatedAt
                ? new Date(item.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';

              return (
                <TouchableOpacity
                  key={item._id}
                  style={[styles.groupRow, { borderBottomColor: isDark ? '#2A2A2A' : '#F0F0F0' }]}
                  onPress={() => handleGroupPress(item)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.iconContainer, { backgroundColor: isDark ? '#2A2A2A' : 'rgba(124,58,237,0.08)' }]}>
                    {item.avatar || item.groupAvatar ? (
                      <Image source={{ uri: item.avatar || item.groupAvatar }} style={styles.iconImage} />
                    ) : (
                      <Ionicons name="people" size={22} color="#7C3AED" />
                    )}
                  </View>

                  <View style={styles.textBlock}>
                    <View style={styles.topRow}>
                      <Text
                        style={[styles.groupName, { color: colors.text, fontWeight: item.unreadCount > 0 ? '700' : '600' }]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      <Text style={[styles.timestamp, { color: item.unreadCount > 0 ? '#7C3AED' : isDark ? '#666' : '#aaa' }]}>
                        {timestamp}
                      </Text>
                    </View>

                    <View style={styles.bottomRow}>
                      <Text
                        style={[
                          styles.snippet,
                          {
                            color: item.unreadCount > 0 ? colors.text : isDark ? '#777' : '#888',
                            fontWeight: item.unreadCount > 0 ? '600' : '400',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {item.latestPreview}
                      </Text>
                      {item.unreadCount > 0 && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                      {item.memberCount} members
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerTitle: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  searchBarContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 20, height: 40 },
  searchInput: { flex: 1, paddingHorizontal: 10, fontSize: 15 },
  filterContainer: { paddingVertical: 12 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  scrollContent: { paddingBottom: 88 },
  feedPlaceholder: { alignItems: 'center', justifyContent: 'center', marginTop: 60, paddingHorizontal: 24 },
  placeholderText: { marginTop: 15, fontSize: 16, fontWeight: '500', textAlign: 'center' },
  discoverBtn: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  addBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  groupRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  iconContainer: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14, overflow: 'hidden' },
  iconImage: { width: '100%', height: '100%' },
  textBlock: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  groupName: { fontSize: 15, flex: 1, marginRight: 8 },
  timestamp: { fontSize: 11 },
  bottomRow: { flexDirection: 'row', alignItems: 'center' },
  snippet: { fontSize: 13, flex: 1, marginRight: 8 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
});
