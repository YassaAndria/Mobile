import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useNavigation, useRouter } from "expo-router";
import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import axiosInstance from "../../src/api/axiosInstance";
import { useAppSelector } from "../../src/store/hooks";
import { useTheme } from "../../src/theme/ThemeContext";
import { typography } from "../../src/theme/typography";

interface CallUser {
  _id: string;
  fullName: string;
  avatar?: string;
}

interface CallRecord {
  _id: string;
  caller: CallUser;
  receiver: CallUser;
  type: string;
  status: string;
  createdAt: string;
}

// ─── Dummy Data (Fallback) ───────────────────────────────────────────────────
const DUMMY_CALLS = [
  {
    _id: "c1",
    caller: { _id: "u1", fullName: "Meeza Alshahrani", avatar: "https://i.pravatar.cc/150?u=1" },
    receiver: { _id: "me", fullName: "Me" },
    type: "audio",
    status: "missed",
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    _id: "c2",
    caller: { _id: "me", fullName: "Me" },
    receiver: { _id: "u2", fullName: "Sarah Connor", avatar: "https://i.pravatar.cc/150?u=2" },
    type: "video",
    status: "completed",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatDate = (isoStr: string) => {
  const d = new Date(isoStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 3600 * 24));

  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else {
    return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
  }
};

export default function CallsScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const currentUser = useAppSelector((state) => state.auth.user);

  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");

  // Action Sheet State
  const [selectedUser, setSelectedUser] = useState<CallUser | null>(null);

  // Filter State
  const [activeFilter, setActiveFilter] = useState<"All" | "Missed" | "Meetings">("All");

  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackVisible: false,
      headerTitle: "",
      headerLeft: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingLeft: 5 }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>Calls</Text>
          <Ionicons
            name={'options-outline'}
            size={22}
            color={colors.text}
          />
        </View>
      ),
    });
  }, [navigation, colors]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await axiosInstance.get("/calls/history");
        const apiCalls = res.data.data?.calls ?? [];
        const newCalls = apiCalls.length > 0 ? apiCalls : DUMMY_CALLS;
        
        if (isMounted) {
          // State Guard: Only update if the data has actually changed
          setCalls((prev) => {
            if (JSON.stringify(prev) !== JSON.stringify(newCalls)) {
              return newCalls as any;
            }
            return prev;
          });
        }
      } catch {
        if (isMounted) {
          setCalls((prev) => {
            if (JSON.stringify(prev) !== JSON.stringify(DUMMY_CALLS)) {
              return DUMMY_CALLS as any;
            }
            return prev;
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Determine Call Status UI
  const getCallInfo = (item: CallRecord) => {
    if (!item) return { otherUser: {} as CallUser, iconName: "call", iconColor: colors.textMuted, statusText: "Unknown" };

    const isIncoming = item.receiver?._id === currentUser?._id || item.receiver?._id === "me";
    const otherUser = isIncoming ? { ...(item.caller || {} as CallUser) } : { ...(item.receiver || {} as CallUser) };

    if (otherUser.avatar) {
      if (!otherUser.avatar.startsWith("http")) {
        const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:5000";
        const rootUrl = baseUrl.replace("/api/v1", "");
        otherUser.avatar = `${rootUrl}${otherUser.avatar.startsWith("/") ? "" : "/"}${otherUser.avatar}`;
      }
    }

    let iconName = "call-made";
    let iconColor = colors.textMuted;
    let statusText = "Outgoing";

    if (isIncoming) {
      if (item.status === "missed") {
        iconName = "call-missed";
        iconColor = colors.errorText; // Red for missed
        statusText = "Missed";
      } else {
        iconName = "call-received";
        iconColor = colors.successText; // Green for received
        statusText = "Incoming";
      }
    } else {
      if (item.status === "missed") {
        iconName = "call-made";
        iconColor = colors.errorText; // Unanswered outgoing
        statusText = "Unanswered";
      }
    }

    return { otherUser, iconName, iconColor, statusText };
  };

  // Filtered Calls
  const filteredCalls = useMemo(() => {
    return calls.filter((item) => {
      const { otherUser, statusText } = getCallInfo(item);
      const matchesFilter =
        activeFilter === "All" ||
        (activeFilter === "Missed" && statusText === "Missed") ||
        (activeFilter === "Meetings" && !!(item as any).chatId?.isGroup);
        
      if (!searchQuery.trim()) return matchesFilter;
      const q = searchQuery.toLowerCase();
      return matchesFilter && (otherUser?.fullName || "").toLowerCase().includes(q);
    });
  }, [calls, searchQuery, activeFilter, currentUser?._id]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.purple} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      
      <View style={styles.heroPad}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MaterialIcons name="search" size={22} color={colors.textSubtle} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search calls, names, or history..."
            placeholderTextColor={colors.textSubtle}
            style={{ flex: 1, marginLeft: 8, color: colors.text, fontWeight: "500" }}
          />
        </View>
      </View>

      {/* Filter Pills */}
      <View style={[styles.filterRow, { borderBottomColor: colors.border }]}>
        {(["All", "Missed", "Meetings"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setActiveFilter(f)}
            style={[
              styles.filterPill,
              {
                backgroundColor: activeFilter === f ? colors.purple : colors.surface2,
                borderColor: activeFilter === f ? colors.purple : colors.border,
              },
            ]}
          >
            <Text
              style={{
                color: activeFilter === f ? "#fff" : colors.textMuted,
                fontSize: 12,
                fontWeight: "700",
              }}
            >
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredCalls}
        keyExtractor={(item, index) => item?._id || String(index)}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="phone-disabled" size={52} color={colors.textMuted} />
            <Text style={[typography.body, { color: colors.textMuted, marginTop: 16 }]}>
              {searchQuery ? "No calls found." : "No calls yet."}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const { otherUser, iconName, iconColor, statusText } = getCallInfo(item);
          const isVideo = item.type === "video";

          return (
            <Pressable
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"
                },
                pressed && { backgroundColor: isDark ? "#262626" : "#F3F4F6" }
              ]}
              onPress={() => setSelectedUser(otherUser)}
            >
              {/* Right Group (Avatar + Info) */}
              <View style={styles.rightGroup}>
                {/* Avatar (Far Right) */}
                <View style={[styles.avatarWrap, { backgroundColor: colors.purple }]}>
                  {otherUser?.avatar ? (
                    <Image source={{ uri: otherUser.avatar }} style={styles.avatarImg} contentFit="cover" />
                  ) : (
                    <Text style={styles.avatarText}>
                      {otherUser?.fullName ? otherUser.fullName.charAt(0).toUpperCase() : "?"}
                    </Text>
                  )}
                </View>

                {/* Info (Text Content) */}
                <View style={styles.infoCol}>
                  {/* Top Line: Caller Name */}
                  <Text style={[styles.nameText, { color: colors.text }]} numberOfLines={1}>
                    {otherUser?.fullName || "User"}
                  </Text>
                  {/* Bottom Line: Status Icon + Timestamp */}
                  <View style={styles.statusRow}>
                    <MaterialIcons name={iconName as any} size={14} color={iconColor} />
                    <Text style={[styles.statusText, { color: colors.textSubtle }]}>
                      {statusText} • {formatDate(item.createdAt)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Left Side - Communication Icons (Far Left) */}
              <View style={styles.leftCol}>
                <Pressable hitSlop={10} onPress={() => setSelectedUser(otherUser)}>
                  <MaterialIcons
                    name={isVideo ? "videocam" : "call"}
                    size={22}
                    color={colors.purple}
                  />
                </Pressable>
              </View>
            </Pressable>
          );
        }}
      />

      {/* ── Action Sheet Modal ───────────────────────────────────────────── */}
      <Modal
        visible={!!selectedUser}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedUser(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedUser(null)}
        >
          <Pressable
            style={[styles.actionSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={(e) => e.stopPropagation()} // Prevent closing when tapping inside
          >
            {/* Sheet Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHandle} />
              <View style={[styles.sheetAvatar, { backgroundColor: colors.purple }]}>
                {selectedUser?.avatar ? (
                  <Image source={{ uri: selectedUser.avatar }} style={styles.avatarImg} contentFit="cover" />
                ) : (
                  <Text style={styles.avatarText}>
                    {selectedUser?.fullName ? selectedUser.fullName.charAt(0).toUpperCase() : "?"}
                  </Text>
                )}
              </View>
              <Text style={[typography.h3, { color: colors.text, marginTop: 12 }]}>
                {selectedUser?.fullName ?? "caller"}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.sheetContent}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.surface2, borderColor: colors.border }]}
                onPress={() => {
                  Alert.alert("Video Call", "Starting video call with " + (selectedUser?.fullName || "caller"));
                  setSelectedUser(null);
                }}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: colors.purple10 }]}>
                  <Ionicons name="videocam" size={20} color={colors.purple} />
                </View>
                <Text style={[typography.body, { color: colors.text, fontWeight: "600" }]}>Video Call</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.surface2, borderColor: colors.border }]}
                onPress={() => {
                  Alert.alert("Voice Call", "Starting voice call with " + (selectedUser?.fullName || "User"));
                  setSelectedUser(null);
                }}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: colors.purple10 }]}>
                  <Ionicons name="call" size={20} color={colors.purple} />
                </View>
                <Text style={[typography.body, { color: colors.text, fontWeight: "600" }]}>Voice Call</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.surface2, borderColor: colors.border }]}
                onPress={() => {
                  if (selectedUser) {
                    const userId = selectedUser._id;
                    const chatName = selectedUser.fullName;
                    setSelectedUser(null);
                    router.push({
                      pathname: '/ChatWindowScreen',
                      params: { userId, chatName, isGroup: 'false', isOnline: 'false' }
                    } as any);
                  }
                }}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: colors.purple10 }]}>
                  <Ionicons name="chatbubble" size={20} color={colors.purple} />
                </View>
                <Text style={[typography.body, { color: colors.text, fontWeight: "600" }]}>Send Message</Text>
              </TouchableOpacity>
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: isDark ? "#262626" : "#F3F4F6" }]}
              onPress={() => setSelectedUser(null)}
            >
              <Text style={[typography.body, { color: colors.text, fontWeight: "700" }]}>Cancel</Text>
            </TouchableOpacity>

          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  heroPad:   { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 },
  searchBox: { flexDirection: "row", alignItems: "center", borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14 },

  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },

  // List
  listContainer: { paddingVertical: 12, paddingHorizontal: 16, paddingBottom: 40 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 },

  // Card
  card: {
    display: "flex",
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },

  rightGroup: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
  },
  avatarWrap: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarText: { color: "#FFF", fontSize: 16, fontWeight: "700" },

  // Info
  infoCol: {
    flex: 1,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  nameText: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "right",
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
  },
  statusText: {
    fontSize: 13,
    textAlign: "right",
  },

  leftCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },

  // Action Sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  actionSheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  sheetHeader: { alignItems: "center", marginBottom: 24 },
  sheetHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#D1D5DB",
  },
  sheetAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    overflow: "hidden",
  },
  sheetContent: { gap: 12 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  cancelBtn: {
    marginTop: 20,
    padding: 18,
    borderRadius: 20,
    alignItems: "center",
  },
});