/* eslint-disable @typescript-eslint/no-explicit-any */
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { Image } from "expo-image";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSelector } from "react-redux";
import axiosInstance from "../../src/api/axiosInstance";
import type { RootState } from "../../src/store/store";
import { useTheme } from "../../src/theme/ThemeContext";
import { typography } from "../../src/theme/typography";

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterType = "All" | "Unread";

interface Participant {
  _id: string;
  fullName?: string;
  name?: string;
  avatar?: string;
  profilePicture?: {
    image?: string;
    [key: string]: any;
  } | string;
  image?: string;
}

interface LatestMessage {
  content?: string;
  createdAt?: string;
}

interface Chat {
  _id: string;
  isGroup: boolean;
  groupName?: string;
  groupAvatar?: string;
  members?: Participant[];
  participants?: Participant[];
  latestMessage?: LatestMessage;
  unreadCount?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deriveInitials(name: string | undefined | null): string {
  if (!name || !name.trim()) return "?";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

function formatTimestamp(isoString: string | undefined | null): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now  = new Date();
  const isToday =
    date.getDate()    === now.getDate()    &&
    date.getMonth()   === now.getMonth()   &&
    date.getFullYear() === now.getFullYear();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { day: "2-digit", month: "short" });
}

/**
 * For a direct (non-group) chat, find the participant who is NOT the current user.
 */
function getOtherParticipant(
  chat: Chat,
  currentUserId: string | undefined
): Participant | null {
  const list: Participant[] = chat.participants ?? chat.members ?? [];
  if (list.length === 0) return null;
  
  // If we have a currentUserId, find the one that doesn't match
  if (currentUserId) {
    const other = list.find((p) => p._id !== currentUserId);
    if (other) return other;
  }
  
  // Fallback: if it's a 1-on-1 chat and we found only ourselves or nothing yet,
  // we return the first one that isn't null as a last resort, or just null if it's actually me
  return list[0] || null;
}

// ─── Avatar sub-component ────────────────────────────────────────────────────

function ChatAvatar({
  uri,
  initials,
  bgColor,
}: {
  uri: string | null;
  initials: string;
  bgColor: string;
}) {
  const styles = avatarStyles;
  return (
    <View style={[styles.wrap, { backgroundColor: bgColor }]}>
      {uri ? (
        <Image source={{ uri }} style={styles.img} contentFit="cover" />
      ) : (
        <Text style={styles.text}>{initials}</Text>
      )}
    </View>
  );
}

const avatarStyles = StyleSheet.create({
  wrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  img: { width: "100%", height: "100%" },
  text: { color: "#fff", fontSize: 18, fontWeight: "700" },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ChatsScreen() {
  const { colors, isDark } = useTheme();
  const router     = useRouter();
  // ── Live data from Redux ────────────────────────────────────────────────
  const user = useSelector((s: RootState) => s.auth.user);
  const currentUserId = user?._id ?? user?.id;

  // ── API state ──────────────────────────────────────────────────────────
  const [chats,         setChats]         = useState<Chat[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [filter,        setFilter]        = useState<FilterType>("All");
  const [isFilterActive, setIsFilterActive] = useState(false);

  const fetchChats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axiosInstance.get("/chats");
      setChats(res.data?.data?.chats ?? []);
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Failed to load chats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchChats(); }, [fetchChats]);

  // ── Filtering — driven purely by API unreadCount field ─────────────────
  const filteredChats = useMemo<Chat[]>(() => {
    if (filter === "Unread") {
      return chats.filter((c) => (c.unreadCount ?? 0) > 0);
    }
    return chats;
  }, [chats, filter]);

  // ─── Loading ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.purple} size="large" />
        <Text style={[typography.body, { color: colors.textMuted, marginTop: 12 }]}>
          Loading chats…
        </Text>
      </View>
    );
  }

  // ─── Error ──────────────────────────────────────────────────────────────
  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg, padding: 24 }]}>
        <MaterialIcons name="error-outline" size={40} color={colors.errorText} />
        <Text
          style={[typography.body, { color: colors.errorText, textAlign: "center", marginTop: 8 }]}
        >
          {error}
        </Text>
        <Pressable onPress={fetchChats} style={[styles.retryBtn, { borderColor: colors.purple }]}>
          <Text style={{ color: colors.purple, fontWeight: "600" }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* ── Native Stack Header ── */}
      <Stack.Screen
        options={{
          headerBackVisible: false,
          headerLeft: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingLeft: 5 }}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Chats</Text>
              <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="search" size={22} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={() => setIsFilterActive(v => !v)}
              >
                <Ionicons
                  name={isFilterActive ? 'options' : 'options-outline'}
                  size={22}
                  color={isFilterActive ? colors.purple : colors.text}
                />
              </TouchableOpacity>
              <TouchableOpacity
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={() => router.push('/(main)/contacts')}
              >
                <Ionicons name="add" size={26} color={colors.text} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      {/* ── Collapsible Filter Bar (only when isFilterActive) ── */}
      {isFilterActive && (
        <View style={[styles.categoriesBar, { borderBottomColor: colors.border }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            {(["All", "Unread"] as FilterType[]).map((cat) => {
              const active = filter === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setFilter(cat)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? colors.purple : colors.surface,
                      borderColor:     active ? colors.purple : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.bodySmall,
                      {
                        color:      active ? "#FFF" : colors.text,
                        fontWeight: active ? "700"  : "400",
                      },
                    ]}
                  >
                    {cat}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── Chat List ── */}
      <FlatList
        data={filteredChats}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.center}>
            <MaterialIcons name="chat-bubble-outline" size={48} color={colors.textMuted} />
            <Text
              style={[typography.body, { color: colors.textMuted, textAlign: "center", marginTop: 12 }]}
            >
              {filter === "Unread" ? "No unread messages" : "No chats yet"}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          // ── Derive display data from real API response ──────────────────
          let displayName: string = "";
          let avatarUri: string | null = null;
          let avatarInitials: string = "?";
          let userIdParam: string | undefined = undefined;

          if (item.isGroup) {
            displayName    = item.groupName ?? "Group Chat";
            avatarUri      = item.groupAvatar ?? null;
            avatarInitials = deriveInitials(displayName) || "G";
          } else {
            const other    = getOtherParticipant(item, currentUserId);
            const name     = other?.fullName ?? other?.name ?? "User";
            displayName    = name;
            userIdParam    = other?._id;
            
            // Extract avatar from nested properties safely
            const rawAvatar = other?.avatar ?? 
                             (typeof other?.profilePicture === 'string' ? other.profilePicture : other?.profilePicture?.image) ?? 
                             other?.image;
            
            if (typeof rawAvatar === 'string') {
              if (rawAvatar.startsWith('http')) {
                avatarUri = rawAvatar;
              } else if (rawAvatar.startsWith('/')) {
                // If it's a relative path from the backend
                const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5000';
                // Remove /api/v1 if it exists in the base URL, since uploads are usually at the root
                const rootUrl = baseUrl.replace('/api/v1', '');
                avatarUri = `${rootUrl}${rawAvatar}`;
              }
            }
            avatarInitials = deriveInitials(name);
          }

          const lastMsg   = item.latestMessage?.content ?? "No messages yet";
          const timestamp = formatTimestamp(item.latestMessage?.createdAt);
          const unread    = item.unreadCount ?? 0;

          return (
            <Pressable
              style={[styles.row, { borderBottomColor: colors.border }]}
              onPress={() =>
                router.push({
                  pathname: '/ChatWindowScreen',
                  params: {
                    chatId: item._id,
                    chatName: displayName,
                    isGroup: String(item.isGroup),
                    isOnline: 'false', // Assuming false for now as status isn't available
                    ...(userIdParam ? { userId: userIdParam } : {})
                  },
                })
              }
            >
              {/* Left — Avatar */}
              <ChatAvatar
                uri={avatarUri}
                initials={avatarInitials}
                bgColor={colors.purple}
              />

              {/* Center — Name & last message */}
              <View style={styles.centerCol}>
                <Text
                  style={[styles.nameText, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {displayName}
                </Text>
                <Text
                  style={[styles.lastMsgText, { color: colors.textMuted }]}
                  numberOfLines={1}
                >
                  {lastMsg}
                </Text>
              </View>

              {/* Right — Timestamp & unread badge */}
              <View style={styles.rightCol}>
                <Text style={[styles.timeText, { color: colors.textMuted }]}>
                  {timestamp}
                </Text>
                {unread > 0 && (
                  <View style={[styles.badge, { backgroundColor: colors.purple }]}>
                    <Text style={styles.badgeText}>
                      {unread > 99 ? "99+" : String(unread)}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        }}
      />

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:   { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
  },
  headerAvatarImg: {
    width: '100%',
    height: '100%',
  },
  headerAvatarInitials: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', letterSpacing: 0.5, marginLeft: 12 },

  // Category bar
  categoriesBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },

  // List
  listContent: {
    paddingBottom: 100, // room above FAB + bottom tab bar
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  centerCol: {
    flex: 1,
    justifyContent: "center",
  },
  nameText: {
    fontSize: 16,
    fontWeight: "600",
  },
  lastMsgText: {
    fontSize: 14,
    marginTop: 3,
  },
  rightCol: {
    alignItems: "flex-end",
    justifyContent: "flex-start",
    marginLeft: 8,
    minWidth: 48,
  },
  timeText: {
    fontSize: 12,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    paddingHorizontal: 5,
  },
  badgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "700",
  },

  // Retry button
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
});
