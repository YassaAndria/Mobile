import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/theme/ThemeContext";
import { spacing as Spacing } from "../../src/theme/design-system";
import { typography as Typography } from "../../src/theme/typography";
import {
  getCommunity,
  leaveCommunity,
  manageJoinRequest,
  inviteCommunityMember,
  removeCommunityMember,
  searchUsers,
} from "../../src/api/community";
import { normalizeId } from "../../src/utils/chatMessage";
import { isCommunityAdmin } from "../../src/utils/community";
import { getApiErrorMessage } from "../../src/api/getApiErrorMessage";
import { useAppSelector } from "../../src/store/hooks";

type Member = { _id: string; fullName?: string; avatar?: string };
type JoinRequest = {
  _id?: string;
  userId: Member | string;
  status?: string;
};

export default function GroupDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ communityId?: string; chatId?: string }>();
  const communityId = Array.isArray(params.communityId)
    ? params.communityId[0]
    : params.communityId;
  const chatIdParam = Array.isArray(params.chatId) ? params.chatId[0] : params.chatId;
  const { colors, isDark } = useTheme();
  const authUser = useAppSelector((s) => s.auth.user);
  const myId = normalizeId(
    (authUser as { _id?: string; id?: string } | null)?._id ||
      (authUser as { _id?: string; id?: string } | null)?.id,
  );

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("Group");
  const [description, setDescription] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [resolvedChatId, setResolvedChatId] = useState(chatIdParam ?? "");
  const [ownerId, setOwnerId] = useState("");
  const [adminIds, setAdminIds] = useState<string[]>([]);
  const [inviteQuery, setInviteQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    if (!communityId) return;
    setLoading(true);
    try {
      const res = await getCommunity(communityId);
      const c = res.data?.data?.community;
      if (!c) return;
      setName(c.name ?? "Group");
      setDescription(c.description ?? "");
      const cid = normalizeId(c.chatId?._id ?? c.chatId);
      setResolvedChatId(cid);
      setOwnerId(normalizeId(c.owner?._id ?? c.owner));
      setAdminIds(
        (c.admins ?? []).map((a: Member & { _id?: string }) =>
          normalizeId(a._id ?? a),
        ),
      );
      setMembers(
        (c.members ?? []).map((m: Member & { _id?: string }) => ({
          _id: normalizeId(m._id ?? m),
          fullName: m.fullName ?? "Member",
          avatar: m.avatar,
        })),
      );
      setJoinRequests(
        (c.joinRequests ?? []).filter(
          (r: JoinRequest) => r.status === "pending",
        ),
      );
    } catch {
      Alert.alert("Error", "Could not load group details.");
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    load();
  }, [load]);

  const isAdmin = isCommunityAdmin({ ownerId, adminIds }, myId);
  const isOwner = ownerId === myId;

  const handleSearchInvite = async () => {
    if (!inviteQuery.trim()) return;
    setSearching(true);
    try {
      const res = await searchUsers(inviteQuery.trim());
      const users = res.data?.data?.users ?? res.data?.users ?? [];
      setSearchResults(
        users.map((u: Record<string, unknown>) => ({
          _id: normalizeId(u._id ?? u.id),
          fullName: String(u.fullName ?? "User"),
          avatar: u.avatar as string | undefined,
        })),
      );
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleInvite = async (userId: string) => {
    if (!communityId) return;
    try {
      await inviteCommunityMember(communityId, userId);
      Alert.alert("Sent", "Invitation sent to this user.");
      setInviteQuery("");
      setSearchResults([]);
      await load();
    } catch (e) {
      Alert.alert("Error", getApiErrorMessage(e, "Could not invite user."));
    }
  };

  const handleRequest = async (userId: string, action: "accept" | "reject") => {
    if (!communityId) return;
    try {
      await manageJoinRequest(communityId, userId, action);
      await load();
    } catch (e) {
      Alert.alert("Error", getApiErrorMessage(e, "Could not update request."));
    }
  };

  const handleRemoveMember = (userId: string, displayName: string) => {
    if (!communityId) return;
    Alert.alert("Remove member", `Remove ${displayName} from the group?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await removeCommunityMember(communityId, userId);
            await load();
          } catch (e) {
            Alert.alert("Error", getApiErrorMessage(e, "Could not remove member."));
          }
        },
      },
    ]);
  };

  const handleLeave = () => {
    if (!communityId) return;
    if (isOwner) {
      Alert.alert("Cannot leave", "Community owners cannot leave. Delete the group instead.");
      return;
    }
    Alert.alert("Leave group", `Leave ${name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            await leaveCommunity(communityId);
            router.replace("/community");
          } catch (e) {
            Alert.alert("Error", getApiErrorMessage(e, "Could not leave group."));
          }
        },
      },
    ]);
  };

  const requestUser = (r: JoinRequest): Member | null => {
    const u = r.userId;
    if (typeof u === "object" && u) {
      return {
        _id: normalizeId(u._id ?? u),
        fullName: u.fullName ?? "User",
        avatar: u.avatar,
      };
    }
    return null;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { borderBottomColor: isDark ? "#333" : "#eee" }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={{ fontSize: 22, color: colors.purple }}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {name}
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.purple} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }}>
          {description ? (
            <Text style={{ color: colors.textMuted, marginBottom: Spacing.lg, lineHeight: 20 }}>
              {description}
            </Text>
          ) : null}

          <View style={styles.actionRow}>
            {resolvedChatId ? (
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.purple, flex: 1 }]}
                onPress={() =>
                  router.push({
                    pathname: "/ChatWindowScreen",
                    params: {
                      chatId: resolvedChatId,
                      chatName: name,
                      isGroup: "true",
                      communityId: communityId ?? "",
                    },
                  } as never)
                }
              >
                <Ionicons name="chatbubbles-outline" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>Chat</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.purple10, flex: 1 }]}
              onPress={() =>
                router.push({
                  pathname: "/community-feed",
                  params: { communityId: communityId ?? "", name },
                } as never)
              }
            >
              <Ionicons name="newspaper-outline" size={18} color={colors.purple} />
              <Text style={[styles.primaryBtnText, { color: colors.purple }]}>Feed</Text>
            </TouchableOpacity>
          </View>

          {isAdmin && joinRequests.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Join requests ({joinRequests.length})
              </Text>
              {joinRequests.map((r, idx) => {
                const u = requestUser(r);
                if (!u) return null;
                return (
                  <View
                    key={u._id || idx}
                    style={[styles.memberRow, { borderBottomColor: colors.border }]}
                  >
                    <Text style={{ color: colors.text, flex: 1, fontWeight: "600" }}>
                      {u.fullName}
                    </Text>
                    <TouchableOpacity
                      style={[styles.smallBtn, { backgroundColor: colors.purple10 }]}
                      onPress={() => handleRequest(u._id, "accept")}
                    >
                      <Text style={{ color: colors.purple, fontWeight: "700" }}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.smallBtn, { marginLeft: 8 }]}
                      onPress={() => handleRequest(u._id, "reject")}
                    >
                      <Text style={{ color: colors.textMuted, fontWeight: "600" }}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </>
          )}

          {isAdmin && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Invite member</Text>
              <View style={styles.searchRow}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                    },
                  ]}
                  placeholder="Search users by name..."
                  placeholderTextColor={colors.textMuted}
                  value={inviteQuery}
                  onChangeText={setInviteQuery}
                  onSubmitEditing={handleSearchInvite}
                />
                <TouchableOpacity
                  style={[styles.searchBtn, { backgroundColor: colors.purple }]}
                  onPress={handleSearchInvite}
                >
                  {searching ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={{ color: "#fff", fontWeight: "700" }}>Go</Text>
                  )}
                </TouchableOpacity>
              </View>
              {searchResults.map((u) => (
                <TouchableOpacity
                  key={u._id}
                  style={[styles.memberRow, { borderBottomColor: colors.border }]}
                  onPress={() => handleInvite(u._id)}
                >
                  <Text style={{ color: colors.text, flex: 1 }}>{u.fullName}</Text>
                  <Text style={{ color: colors.purple, fontWeight: "700" }}>Invite</Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Members ({members.length})
          </Text>
          {members.map((item) => {
            const isSelf = item._id === myId;
            const isGroupOwner = item._id === ownerId;
            const canRemove = isAdmin && !isSelf && !isGroupOwner;
            return (
              <View
                key={item._id}
                style={[styles.memberRow, { borderBottomColor: colors.border }]}
              >
                {item.avatar ? (
                  <Image source={{ uri: item.avatar }} style={styles.memberAvatar} />
                ) : (
                  <View style={[styles.memberAvatar, { backgroundColor: colors.purple10 }]}>
                    <Text style={{ color: colors.purple, fontWeight: "700" }}>
                      {(item.fullName ?? "?")[0]}
                    </Text>
                  </View>
                )}
                <Text style={{ color: colors.text, fontWeight: "600", flex: 1 }}>
                  {item.fullName}
                  {isGroupOwner ? " (owner)" : ""}
                  {adminIds.includes(item._id) && !isGroupOwner ? " (admin)" : ""}
                </Text>
                {canRemove && (
                  <TouchableOpacity onPress={() => handleRemoveMember(item._id, item.fullName ?? "member")}>
                    <Ionicons name="person-remove-outline" size={22} color={colors.errorText || "#ef4444"} />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          {!isOwner && (
            <TouchableOpacity
              style={[styles.leaveBtn, { borderColor: colors.errorText || "#ef4444" }]}
              onPress={handleLeave}
            >
              <Text style={{ color: colors.errorText || "#ef4444", fontWeight: "700" }}>
                Leave group
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  title: { fontSize: Typography.h1?.fontSize || 20, fontWeight: "700", flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginTop: Spacing.lg, marginBottom: Spacing.sm },
  actionRow: { flexDirection: "row", gap: 10, marginBottom: Spacing.md },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
  searchRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  searchBtn: {
    paddingHorizontal: 16,
    justifyContent: "center",
    borderRadius: 10,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  smallBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  leaveBtn: {
    marginTop: Spacing.xl,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
});
