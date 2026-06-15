import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  LayoutAnimation,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import Toast from "react-native-toast-message";

import axiosInstance from "../../src/api/axiosInstance";
import { useTheme } from "../../src/theme/ThemeContext";
import { typography } from "../../src/theme/typography";

interface UserTokenData {
  _id: string;
  fullName: string;
  email: string;
  avatar?: string;
  role: string;
  totalTokensUsed: number;
  tokenUsage?: {
    voiceToText?: number;
    chatSummarization?: number;
    smartSearch?: number;
    fileSummarization?: number;
    suggestedReplies?: number;
    translation?: number;
    appChatbot?: number;
    employerMatching?: number;
  };
}

export default function AdminTokensScreen() {
  const { colors, isDark } = useTheme();
  const [users, setUsers] = useState<UserTokenData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get("/admin/users?sortBy=tokens_desc");
      setUsers(data?.data?.users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to fetch token usage data",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (userId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedUserId(expandedUserId === userId ? null : userId);
  };

  const filteredUsers = users.filter(
    (u) =>
      u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPlatformTokens = users.reduce((acc, u) => acc + (u.totalTokensUsed || 0), 0);
  
  const topUser =
    users.length > 0
      ? users.reduce((prev, curr) =>
          (prev.totalTokensUsed || 0) > (curr.totalTokensUsed || 0) ? prev : curr
        )
      : null;

  const activeAiUsersCount = users.filter((u) => (u.totalTokensUsed || 0) > 0).length;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.purple} />
      </View>
    );
  }

  const UsageCard = ({
    icon,
    title,
    count,
    color,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    count?: number;
    color: string;
  }) => {
    const val = count || 0;
    return (
      <View
        style={[
          styles.usageCard,
          {
            backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#F9FAFB",
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.usageCardHeader}>
          <Ionicons name={icon} size={16} color={color} />
          <Text style={[typography.caption, { color: colors.textMuted, fontWeight: "600" }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
        <Text style={[typography.h3, { color: colors.text, marginTop: 4 }]}>
          {val.toLocaleString()}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ title: "Token Usage" }} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[typography.h2, { color: colors.text }]}>AI Token Usage</Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Monitor platform-wide AI token consumption and feature usage.
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {/* Total Platform Tokens */}
          <View style={[styles.statCardFull, { backgroundColor: colors.purple }]}>
            <View style={styles.statCardHeader}>
              <Text style={[typography.caption, { color: "rgba(255,255,255,0.8)", fontWeight: "600" }]}>
                TOTAL PLATFORM TOKENS
              </Text>
              <Ionicons name="hardware-chip-outline" size={20} color="#FFF" style={{ opacity: 0.8 }} />
            </View>
            <Text style={[styles.statValueLarge, { color: "#FFF" }]}>
              {totalPlatformTokens.toLocaleString()}
            </Text>
          </View>

          {/* Active AI Users */}
          <View style={[styles.statCardHalf, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[typography.caption, { color: colors.textMuted, fontWeight: "600" }]}>
              Active AI Users
            </Text>
            <Text style={[styles.statValue, { color: colors.text, marginTop: 6 }]}>
              {activeAiUsersCount}
            </Text>
          </View>

          {/* Top Consumer */}
          <View style={[styles.statCardHalf, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[typography.caption, { color: colors.textMuted, fontWeight: "600" }]} numberOfLines={1}>
              Top Consumer
            </Text>
            <Text style={[typography.body, { color: colors.text, fontWeight: "700", marginTop: 4 }]} numberOfLines={1}>
              {topUser?.fullName || "N/A"}
            </Text>
            <Text style={[typography.caption, { color: colors.purple, fontWeight: "600", marginTop: 2 }]}>
              {topUser?.totalTokensUsed?.toLocaleString() || 0} Tokens
            </Text>
          </View>
        </View>

        {/* Search */}
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search users..."
            placeholderTextColor={colors.textMuted}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>

        {/* Users list */}
        <View style={styles.listSection}>
          {filteredUsers.map((user) => {
            const isExpanded = expandedUserId === user._id;
            return (
              <View
                key={user._id}
                style={[
                  styles.userRowContainer,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isExpanded ? colors.purple : colors.border,
                  },
                ]}
              >
                {/* Main Row */}
                <TouchableOpacity
                  onPress={() => toggleExpand(user._id)}
                  activeOpacity={0.7}
                  style={styles.userMainRow}
                >
                  <View style={styles.userInfoCol}>
                    <View style={styles.avatarWrap}>
                      {user.avatar ? (
                        <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
                      ) : (
                        <View
                          style={[
                            styles.avatarPh,
                            { backgroundColor: isDark ? "rgba(139,92,246,0.15)" : "#EDE9FE" },
                          ]}
                        >
                          <Text style={[styles.avatarInitial, { color: colors.purple }]}>
                            {user.fullName?.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.bodyLarge, { color: colors.text, fontWeight: "700" }]}>
                        {user.fullName}
                      </Text>
                      <View style={styles.metaRow}>
                        <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={1}>
                          {user.email}
                        </Text>
                        <View style={[styles.roleBadge, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F3F4F6" }]}>
                          <Text style={[typography.caption, { color: colors.text, textTransform: "capitalize", fontSize: 10 }]}>
                            {user.role}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={styles.userTokensCol}>
                    <Text style={[typography.caption, { color: colors.textMuted, fontSize: 10, textAlign: "right" }]}>
                      USED
                    </Text>
                    <Text style={[typography.h3, { color: colors.purple, fontWeight: "800", textAlign: "right" }]}>
                      {(user.totalTokensUsed || 0).toLocaleString()}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Expanded breakdown */}
                {isExpanded && (
                  <View style={[styles.breakdownContainer, { borderTopColor: colors.border }]}>
                    <Text style={[typography.caption, { color: colors.textMuted, fontWeight: "700", marginBottom: 12 }]}>
                      TOKEN USAGE BREAKDOWN
                    </Text>
                    <View style={styles.usageCardsGrid}>
                      <UsageCard icon="mic-outline" title="Voice to Text" count={user.tokenUsage?.voiceToText} color="#3B82F6" />
                      <UsageCard icon="chatbubble-ellipses-outline" title="Chat Summary" count={user.tokenUsage?.chatSummarization} color="#8B5CF6" />
                      <UsageCard icon="search-outline" title="Smart Search" count={user.tokenUsage?.smartSearch} color="#6366F1" />
                      <UsageCard icon="document-text-outline" title="File Summary" count={user.tokenUsage?.fileSummarization} color="#10B981" />
                      <UsageCard icon="arrow-undo-outline" title="Replies" count={user.tokenUsage?.suggestedReplies} color="#F59E0B" />
                      <UsageCard icon="language-outline" title="Translation" count={user.tokenUsage?.translation} color="#EC4899" />
                      <UsageCard icon="logo-android" title="Bot Chat" count={user.tokenUsage?.appChatbot} color="#14B8A6" />
                      {user.role === "employer" && (
                        <UsageCard icon="people-outline" title="Matching" count={user.tokenUsage?.employerMatching} color="#F43F5E" />
                      )}
                    </View>
                  </View>
                )}
              </View>
            );
          })}

          {filteredUsers.length === 0 && (
            <View style={styles.emptyWrap}>
              <Ionicons name="search-outline" size={48} color={colors.textMuted} style={{ marginBottom: 12, opacity: 0.6 }} />
              <Text style={[typography.body, { color: colors.textMuted }]}>No users found</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  statCardFull: {
    width: "100%",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  statCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  statValueLarge: {
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  statCardHalf: {
    flex: 1,
    minWidth: "45%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    justifyContent: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  listSection: {
    gap: 12,
  },
  userRowContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  userMainRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  userInfoCol: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  avatarPh: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: "bold",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
    flexWrap: "wrap",
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  userTokensCol: {
    alignItems: "flex-end",
    marginLeft: 12,
  },
  breakdownContainer: {
    borderTopWidth: 1,
    padding: 16,
  },
  usageCardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  usageCard: {
    width: "48%",
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  usageCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  emptyWrap: {
    padding: 40,
    alignItems: "center",
  },
});
