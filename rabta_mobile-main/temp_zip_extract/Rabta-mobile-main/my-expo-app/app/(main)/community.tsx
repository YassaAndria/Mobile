import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '../../src/theme/ThemeContext';
import axiosInstance from '../../src/api/axiosInstance';
import { useChat } from '../../src/context/ChatContext';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Satisfying the type import requirement
import type { MessageType } from '../../src/types'; 

interface Community {
  _id: string;
  name?: string;
  groupName?: string;
  description?: string;
  avatar?: string;
  groupAvatar?: string;
  tags?: string[];
  members?: string[] | any[];
  users?: any[];
  chatId?: any;
  unreadCount?: number;
  latestMessage?: string;
  updatedAt?: string;
}

export default function CommunityScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter(); // Fix 1: Replaced useNavigate with useRouter from expo-router
  const { socket } = useChat();

  const [activeFilter, setActiveFilter] = useState("All");
  const [communities, setCommunities] = useState<Community[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  
  // Search state
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filters = ["All", "Programming", "UI/UX", "Data", "Cyber", "Cloud"];

  // Ensure current user is resolved natively
  useEffect(() => {
    AsyncStorage.getItem('user').then(stored => {
      if (stored) {
        const user = JSON.parse(stored);
        setCurrentUserId(user._id || user.id);
      }
    });
  }, []);

  // Fetch logic using filters
  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        setIsLoading(true);
        const category = activeFilter === "All" ? "" : activeFilter.toLowerCase();
        
        // Fetching groups (fallback to standard chats if the new endpoint isn't fully ready)
        let groups = [];
        try {
          const response = await axiosInstance.get(`/groups?category=${category}`);
          groups = response.data.data.communities || [];
        } catch {
          const res = await axiosInstance.get('/chats');
          groups = (res.data.data.chats || []).filter((c: any) => c.isGroup);
        }
        
        // Local filtering fallback
        if (category) {
          groups = groups.filter((g: any) => 
            g.groupName?.toLowerCase().includes(category) || 
            g.description?.toLowerCase().includes(category) ||
            g.name?.toLowerCase().includes(category)
          );
        }
        setCommunities(groups);
      } catch (error) {
        Toast.show({ type: 'error', text1: 'Failed to load communities' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchCommunities();
  }, [activeFilter]);

  // Socket logic for real-time unread counts
  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = (msg: any) => {
      const senderId = typeof msg.senderId === 'object' ? msg.senderId._id || msg.senderId.id : msg.senderId;

      setCommunities(prev => prev.map(c => {
        const communityChatId = c.chatId?._id || c.chatId || c._id;
        const isMatched = communityChatId === msg.chatId || c._id === msg.chatId;
        
        if (isMatched) {
          const shouldIncrement = senderId !== currentUserId;
          return {
            ...c,
            unreadCount: shouldIncrement ? (c.unreadCount || 0) + 1 : 0,
            latestMessage: msg.content,
            updatedAt: msg.createdAt,
          };
        }
        return c;
      }));
    };
    socket.on('receive-message', handleNewMessage);
    return () => {
      socket.off('receive-message', handleNewMessage);
    };
  }, [socket, currentUserId]);

  // Handle group tap: Join if not a member, open chat if a member.
  const handleGroupPress = async (item: Community) => {
    const isMember = item.users?.some((u:any) => u._id === currentUserId) || item.members?.some((m:any) => (typeof m === 'string' ? m : m._id) === currentUserId);
    const targetChatId = item.chatId?._id || item.chatId || item._id;
    const name = item.name || item.groupName || 'Community Group';

    if (isMember !== false) {
      // Optimistically reset unread
      setCommunities(prev => prev.map(g => g._id === item._id ? { ...g, unreadCount: 0 } : g));
      try {
        await axiosInstance.put(`/chats/${targetChatId}/read`);
      } catch(e) {}
      // Navigate to ChatWindow instead of inline rendering
      router.push({ pathname: '/ChatWindowScreen', params: { chatId: targetChatId, chatName: name, isGroup: 'true' } } as any);
    } else {
      Alert.alert(
        "Join Group",
        `Do you want to join ${name}?`,
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Join", 
            onPress: async () => {
              try {
                await axiosInstance.post(`/groups/${item._id}/join`);
                Toast.show({ type: 'success', text1: `Joined ${name}!` });
                router.push({ pathname: '/ChatWindowScreen', params: { chatId: targetChatId, chatName: name, isGroup: 'true' } } as any);
              } catch(e) {
                Toast.show({ type: 'error', text1: "Failed to join group" });
              }
            }
          }
        ]
      );
    }
  };

  const filteredCommunities = communities.filter(c => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const cName = (c.name || c.groupName || '').toLowerCase();
    const cDesc = (c.description || c.latestMessage || '').toLowerCase();
    return cName.includes(query) || cDesc.includes(query);
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* ── Native Stack Header ── */}
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
                  placeholder="Search groups..."
                  placeholderTextColor={isDark ? '#888' : '#9CA3AF'}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                <TouchableOpacity
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  onPress={() => { setIsSearchMode(false); setSearchQuery(''); }}
                >
                  <Ionicons name="close-circle" size={20} color={isDark ? '#888' : '#9CA3AF'} style={{ marginRight: 10 }} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 5 }}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Community</Text>
                <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} onPress={() => setIsSearchMode(true)}>
                  <Ionicons name="search" size={22} color={colors.text} />
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

      {/* ── Scrollable Filter Bar ── */}
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
                    borderColor: isActive ? '#7C3AED' : isDark ? '#333' : '#E5E7EB' 
                  }
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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── Communities / Groups Feed ── */}
        {isLoading ? (
          <View style={styles.feedPlaceholder}>
            <ActivityIndicator color={colors.purple} size="large" />
          </View>
        ) : filteredCommunities.length === 0 ? (
          <View style={styles.feedPlaceholder}>
            <Ionicons name="people-outline" size={60} color={isDark ? '#444' : '#ccc'} />
            <Text style={[styles.placeholderText, { color: isDark ? '#666' : '#999' }]}>
              {searchQuery ? "No groups found for your search." : "No communities found in this category."}
            </Text>
          </View>
        ) : (
          filteredCommunities.map((item) => {
            const unreadCount: number = item.unreadCount || 0;
            const latestMsg: string = item.latestMessage || item.description || 'Welcome to the group!';
            const timestamp: string = item.updatedAt
              ? new Date(item.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '';

            return (
              <TouchableOpacity
                key={item._id}
                style={[styles.groupRow, { borderBottomColor: isDark ? '#2A2A2A' : '#F0F0F0' }]}
                onPress={() => handleGroupPress(item)}
                activeOpacity={0.75}
              >
                {/* 48x48 rounded-xl icon */}
                <View style={[styles.iconContainer, { backgroundColor: isDark ? '#2A2A2A' : 'rgba(124,58,237,0.08)' }]}>
                  {item.groupAvatar || item.avatar ? (
                    <Image source={{ uri: item.groupAvatar || item.avatar }} style={styles.iconImage} />
                  ) : (
                    <Ionicons name="terminal" size={22} color="#7C3AED" />
                  )}
                </View>

                {/* Text block */}
                <View style={styles.textBlock}>
                  {/* Top row: name + timestamp */}
                  <View style={styles.topRow}>
                    <Text style={[styles.groupName, { color: colors.text, fontWeight: unreadCount > 0 ? '700' : '600' }]} numberOfLines={1}>
                      {item.groupName || item.name || 'Tech Hub'}
                    </Text>
                    <Text style={[styles.timestamp, { color: unreadCount > 0 ? '#7C3AED' : isDark ? '#666' : '#aaa' }]}>
                      {timestamp}
                    </Text>
                  </View>

                  {/* Bottom row: snippet + badge */}
                  <View style={styles.bottomRow}>
                    <Text style={[styles.snippet, { color: unreadCount > 0 ? colors.text : isDark ? '#777' : '#888', fontWeight: unreadCount > 0 ? '600' : '400' }]} numberOfLines={1}>
                      {latestMsg}
                    </Text>
                    {unreadCount > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  searchBarContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 20, height: 40 },
  searchInput: { flex: 1, paddingHorizontal: 10, fontSize: 15 },
  filterContainer: { paddingVertical: 12 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  scrollContent: { paddingBottom: 100 }, // Ensures floating AI button has clearance
  feedPlaceholder: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  placeholderText: { marginTop: 15, fontSize: 16, fontWeight: '500' },
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