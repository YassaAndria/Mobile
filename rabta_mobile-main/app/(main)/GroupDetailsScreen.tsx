import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  Share,
  Platform,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from "expo-clipboard";
import Toast from "react-native-toast-message";
import axiosInstance from "../../src/api/axiosInstance";
import {
  fetchGroupDetails,
  generateInviteLink,
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
import { buildGroupInviteDeepLink } from "../../src/utils/groupInvite";
import { useTheme } from "../../src/theme/ThemeContext";
import {
  getGroupDetailsPalette,
  type GroupDetailsPalette,
} from "../../src/theme/groupDetailsTheme";
import * as ImagePicker from 'expo-image-picker';
import { useSyncContacts } from '../../src/hooks/useSyncContacts';

type Member = { _id: string; fullName?: string; avatar?: string; user?: { _id: string, id: string } };
type JoinRequest = {
  _id?: string;
  userId: Member | string;
  status?: string;
};

function GlassCard({
  children,
  style,
  styles,
}: {
  children: React.ReactNode;
  style?: object;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={[styles.glassCard, style]}>
      <View style={styles.glassInner}>{children}</View>
    </View>
  );
}

export default function GroupDetailsScreen() {
  const { mode } = useTheme();
  const C = useMemo(() => getGroupDetailsPalette(mode), [mode]);
  const styles = useMemo(() => createStyles(C), [C]);
  const router = useRouter();
  const params = useLocalSearchParams<{
    communityId?: string;
    chatId?: string;
    groupId?: string;
  }>();
  const communityId = Array.isArray(params.communityId)
    ? params.communityId[0]
    : params.communityId ?? (Array.isArray(params.groupId) ? params.groupId[0] : params.groupId);
  const chatIdParam = Array.isArray(params.chatId) ? params.chatId[0] : params.chatId;

  const authUser = useAppSelector((s) => s.auth.user);
  const myId = normalizeId(
    (authUser as { _id?: string; id?: string } | null)?._id ||
      (authUser as { _id?: string; id?: string } | null)?.id,
  );

  const [loading, setLoading] = useState(true);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [name, setName] = useState("Group");
  const [description, setDescription] = useState("");
  const [avatar, setAvatar] = useState<string | undefined>();
  const [members, setMembers] = useState<Member[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [resolvedChatId, setResolvedChatId] = useState(chatIdParam ?? "");
  const [ownerId, setOwnerId] = useState("");
  const [adminIds, setAdminIds] = useState<string[]>([]);
  const [inviteLink, setInviteLink] = useState("");
  const [participantSearch, setParticipantSearch] = useState("");
  const [showParticipantSearch, setShowParticipantSearch] = useState(false);
  const [inviteQuery, setInviteQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [searching, setSearching] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);

  // Sync Contacts state
  const { unifiedContacts, syncContacts, loading: syncLoading } = useSyncContacts();

  // States for shared media, links, and documents
  const [sharedMedia, setSharedMedia] = useState<{ media: any[]; files: any[]; links: any[] }>({
    media: [],
    files: [],
    links: [],
  });
  const [loadingShared, setLoadingShared] = useState(false);
  const [sharedCategory, setSharedCategory] = useState<"media" | "files" | "links">("media");

  const resolveMediaUrl = (path?: string): string => {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    const base = process.env.EXPO_PUBLIC_API_BASE_URL || "http://192.168.1.3:5000/api/v1";
    try {
      const origin = new URL(base).origin;
      return `${origin}${path.startsWith("/") ? "" : "/"}${path}`;
    } catch {
      return path;
    }
  };

  useEffect(() => {
    if (!resolvedChatId) return;
    let active = true;
    (async () => {
      setLoadingShared(true);
      try {
        const res = await axiosInstance.get(`/chats/${resolvedChatId}/shared`, {
          params: { category: "all" },
        });
        if (active && res.data?.status === "success") {
          const sh = res.data.data?.shared || res.data.data;
          setSharedMedia({
            media: Array.isArray(sh?.media) ? sh.media : [],
            files: Array.isArray(sh?.files) ? sh.files : [],
            links: Array.isArray(sh?.links) ? sh.links : [],
          });
        }
      } catch (err) {
        console.error("[GroupDetails] Failed to load shared files:", err);
      } finally {
        if (active) setLoadingShared(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [resolvedChatId]);

  const loadGroupDetails = useCallback(async () => {
    if (!communityId) return;
    setLoading(true);
    try {
      const res = await fetchGroupDetails(communityId);
      const c = res.data?.data?.community;
      if (!c) return;
      setName(c.name ?? "Group");
      setDescription(c.description ?? "");
      setAvatar(c.avatar);
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
          user: m.user
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

  const loadInviteLink = useCallback(async () => {
    if (!communityId) return;
    setInviteLoading(true);
    try {
      const res = await generateInviteLink(communityId);
      const token = res.data?.data?.inviteToken;
      if (token) {
        setInviteLink(buildGroupInviteDeepLink(token));
      }
    } catch (e) {
      Toast.show({
        type: "error",
        text1: getApiErrorMessage(e, "Could not generate invite link."),
      });
    } finally {
      setInviteLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    void loadGroupDetails();
  }, [loadGroupDetails]);

  useEffect(() => {
    void loadInviteLink();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isAdmin = isCommunityAdmin({ ownerId, adminIds }, myId);
  const isOwner = ownerId === myId;

  const filteredMembers = members.filter((m) =>
    (m.fullName ?? "")
      .toLowerCase()
      .includes(participantSearch.trim().toLowerCase()),
  );

  const memberRole = (memberId: string): "Admin" | "Member" => {
    if (memberId === ownerId) return "Admin";
    if (adminIds.includes(memberId)) return "Admin";
    return "Member";
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleRequest = async (userId: string, action: "accept" | "reject") => {
    if (!communityId) return;
    try {
      await manageJoinRequest(communityId, userId, action);
      await loadGroupDetails();
    } catch (e) {
      Alert.alert("Error", getApiErrorMessage(e, "Could not update request."));
    }
  };

  const initiateZegoCall = useCallback(
    async (type: 'voice' | 'video') => {
      if (!resolvedChatId) {
        Alert.alert('Error', 'Cannot start a call before the chat is loaded.');
        return;
      }
      router.push({
        pathname: '/call',
        params: {
          callType: type,
          recipientId: communityId ?? resolvedChatId,
          recipientName: name,
          currentUserId: myId || '',
          currentUserName: (authUser as any)?.fullName || '',
          callId: resolvedChatId,
        },
      } as any);
    },
    [resolvedChatId, communityId, name, myId, authUser, router],
  );

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    await Clipboard.setStringAsync(inviteLink);
    Toast.show({ type: "success", text1: "Invite link copied" });
  };

  const handleShareLink = async () => {
    if (!inviteLink) return;
    try {
      await Share.share({
        message: `Join "${name}" on Rabta:\n${inviteLink}`,
        url: Platform.OS === "ios" ? inviteLink : undefined,
      });
    } catch {
      /* user cancelled */
    }
  };

  const handleInvite = async (userId: string) => {
    if (!communityId) return;
    try {
      await inviteCommunityMember(communityId, userId);
      Toast.show({ type: "success", text1: "Invitation sent" });
      await loadGroupDetails();
    } catch (e) {
      Alert.alert("Error", getApiErrorMessage(e, "Could not invite user."));
    }
  };

  const handleLeave = () => {
    if (!communityId) return;
    if (isOwner) {
      Alert.alert(
        "Cannot leave",
        "Community owners cannot leave. Delete the group instead.",
      );
      return;
    }
    Alert.alert("Exit group", `Leave ${name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Exit group",
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

  const handleReport = () => {
    Alert.alert(
      "Report group",
      "Thank you. Our team will review this group.",
      [{ text: "OK" }],
    );
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
            await loadGroupDetails();
          } catch (e) {
            Alert.alert("Error", getApiErrorMessage(e, "Could not remove member."));
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

  if (!communityId) {
    return (
      <View style={[styles.root, { backgroundColor: C.screenBg }]}>
        <Text style={{ color: C.textPrimary, textAlign: "center", marginTop: 80 }}>
          Missing group ID
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={[C.gradientStart, C.gradientMid, C.gradientEnd]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={28} color={C.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Group info</Text>
          <View style={{ width: 28 }} />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={C.accent} size="large" />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.hero}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.heroAvatar} />
              ) : (
                <View style={[styles.heroAvatar, styles.heroAvatarPh]}>
                  <Text style={styles.heroLetter}>{(name[0] ?? "G").toUpperCase()}</Text>
                </View>
              )}
              <Text style={styles.heroName}>{name}</Text>
              <Text style={styles.heroMeta}>
                Group · {members.length} members
              </Text>
              {description ? (
                <Text style={styles.heroDesc}>{description}</Text>
              ) : null}
            </View>

            <View style={styles.actionRow}>
              <ActionChip
                icon="call-outline"
                label="Call"
                onPress={() => initiateZegoCall('voice')}
                disabled={!resolvedChatId}
                C={C}
                styles={styles}
              />
              <ActionChip
                icon="videocam-outline"
                label="Video"
                onPress={() => initiateZegoCall('video')}
                disabled={!resolvedChatId}
                C={C}
                styles={styles}
              />
              <ActionChip
                icon="person-add-outline"
                label="Add"
                onPress={() => {
                  setShowAddMember((v) => {
                    if (!v) {
                      syncContacts();
                    }
                    return !v;
                  });
                }}
                C={C}
                styles={styles}
              />
              <ActionChip
                icon="search-outline"
                label="Search"
                onPress={() => {
                  setShowParticipantSearch((v) => !v);
                  if (showParticipantSearch) setParticipantSearch("");
                }}
                C={C}
                styles={styles}
              />
            </View>

            {showAddMember && isAdmin && (
              <GlassCard style={{ marginBottom: 16 }} styles={styles}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={[styles.sectionLabel, { marginTop: 0, marginBottom: 0 }]}>Add from Contacts</Text>
                  <TouchableOpacity onPress={() => setShowAddMember(false)} hitSlop={10}>
                    <Ionicons name="close" size={20} color={C.textMuted} />
                  </TouchableOpacity>
                </View>

                {syncLoading ? (
                  <ActivityIndicator color={C.accent} style={{ marginVertical: 10 }} />
                ) : unifiedContacts.filter(c => c.isRegistered).length === 0 ? (
                  <Text style={{ color: C.textMuted, fontSize: 13, textAlign: 'center', marginVertical: 10 }}>
                    No registered contacts found on Rabta.
                  </Text>
                ) : (
                  <ScrollView style={{ maxHeight: 300 }}>
                    {unifiedContacts.filter(c => c.isRegistered).map(c => {
                      const cId = (c as any).userId ?? (c as any).backendId ?? null;
                      if (!cId) return null;
                      
                      // Skip if already in the group
                      const isMember = members.some(m => (m.user?._id || m.user?.id || m._id) === cId);
                      if (isMember) return null;

                      const cName = c.name || 'Unknown';
                      const cAvatar = c.avatar;

                      return (
                        <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.divider }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.glassBg, justifyContent: 'center', alignItems: 'center', marginRight: 10, overflow: 'hidden' }}>
                              {cAvatar ? (
                                <Image 
                                  source={{ uri: cAvatar.startsWith('http') ? cAvatar : `${process.env.EXPO_PUBLIC_API_BASE_URL?.replace('/api/v1', '')}${cAvatar}` }} 
                                  style={{ width: '100%', height: '100%' }} 
                                />
                              ) : (
                                <Text style={{ color: C.accent, fontWeight: 'bold' }}>{cName[0]?.toUpperCase()}</Text>
                              )}
                            </View>
                            <Text style={{ color: C.textPrimary, fontSize: 15, fontWeight: '500' }}>{cName}</Text>
                          </View>
                          <TouchableOpacity
                            style={{ backgroundColor: C.accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}
                            onPress={() => communityId && cId && handleInvite(cId)}
                          >
                            <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>Add</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </ScrollView>
                )}
              </GlassCard>
            )}

            {/* Invite link */}
            <Text style={styles.sectionLabel}>Invite to group via link</Text>
            <GlassCard styles={styles}>
              {inviteLoading && !inviteLink ? (
                <ActivityIndicator color={C.accent} />
              ) : (
                <>
                  <Text style={styles.linkText} numberOfLines={2} selectable>
                    {inviteLink || "Generating link…"}
                  </Text>
                  <View style={styles.linkActions}>
                    <TouchableOpacity
                      style={styles.linkBtn}
                      onPress={handleCopyLink}
                      disabled={!inviteLink}
                    >
                      <Ionicons name="copy-outline" size={18} color={C.textPrimary} />
                      <Text style={styles.linkBtnText}>Copy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.linkBtn, styles.linkBtnPrimary]}
                      onPress={handleShareLink}
                      disabled={!inviteLink}
                    >
                      <Ionicons name="share-social-outline" size={18} color={C.accentContrast} />
                      <Text style={[styles.linkBtnText, { color: C.accentContrast }]}>
                        Share
                      </Text>
                    </TouchableOpacity>
                  </View>

                </>
              )}
            </GlassCard>

            {isAdmin && joinRequests.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>
                  Join requests ({joinRequests.length})
                </Text>
                <GlassCard styles={styles}>
                  {joinRequests.map((r, idx) => {
                    const u = requestUser(r);
                    if (!u) return null;
                    return (
                      <View key={u._id || idx} style={styles.requestRow}>
                        <Text style={styles.memberName}>{u.fullName}</Text>
                        <TouchableOpacity
                          onPress={() => handleRequest(u._id, "accept")}
                        >
                          <Text style={styles.acceptText}>Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleRequest(u._id, "reject")}
                        >
                          <Text style={styles.rejectText}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </GlassCard>
              </>
            )}

            {/* Participants */}
            <Text style={styles.sectionLabel}>
              {members.length} participants
            </Text>
            {showParticipantSearch && (
              <TextInput
                style={[styles.input, { marginBottom: 12 }]}
                placeholder="Filter members..."
                placeholderTextColor={C.textMuted}
                value={participantSearch}
                onChangeText={setParticipantSearch}
                autoFocus
              />
            )}
            <GlassCard styles={styles}>
              {filteredMembers.map((item) => {
                const role = memberRole(item._id);
                const isSelf = item._id === myId;
                const isGroupOwner = item._id === ownerId;
                const canRemove = isAdmin && !isSelf && !isGroupOwner;
                return (
                  <View key={item._id} style={styles.memberRow}>
                    {item.avatar ? (
                      <Image
                        source={{ uri: item.avatar }}
                        style={styles.memberAvatar}
                      />
                    ) : (
                      <View style={[styles.memberAvatar, styles.memberAvatarPh]}>
                        <Text style={styles.memberInitial}>
                          {(item.fullName ?? "?")[0]}
                        </Text>
                      </View>
                    )}
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>
                        {item.fullName}
                        {isSelf ? " (You)" : ""}
                      </Text>
                      <Text
                        style={[
                          styles.roleBadge,
                          role === "Admin" && styles.roleAdmin,
                        ]}
                      >
                        {isGroupOwner ? "Owner" : role}
                      </Text>
                    </View>
                    {canRemove && (
                      <TouchableOpacity
                        onPress={() =>
                          handleRemoveMember(item._id, item.fullName ?? "member")
                        }
                      >
                        <Ionicons
                          name="person-remove-outline"
                          size={22}
                          color={C.mahoganyLight}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </GlassCard>

            {/* Shared Media, Links & Docs */}
            {resolvedChatId ? (
              <>
                <Text style={styles.sectionLabel}>Shared Media, Links & Docs</Text>
                <GlassCard styles={styles}>
                  {/* Sub-tab selection header */}
                  <View style={{
                    flexDirection: "row",
                    backgroundColor: mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "#F3F4F6",
                    borderRadius: 10,
                    padding: 4,
                    marginBottom: 16,
                  }}>
                    <TouchableOpacity
                      onPress={() => setSharedCategory("media")}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 8,
                        alignItems: "center",
                        backgroundColor: sharedCategory === "media" ? (mode === "dark" ? "#2D2D2D" : "#FFFFFF") : "transparent",
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "600", color: sharedCategory === "media" ? C.accent : C.textMuted }}>
                        Media ({sharedMedia.media.filter(item => /\.(jpe?g|png|gif|webp|bmp|heic)(\?|$)/i.test(item.url || "")).length})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setSharedCategory("files")}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 8,
                        alignItems: "center",
                        backgroundColor: sharedCategory === "files" ? (mode === "dark" ? "#2D2D2D" : "#FFFFFF") : "transparent",
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "600", color: sharedCategory === "files" ? C.accent : C.textMuted }}>
                        Files ({sharedMedia.files.length})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setSharedCategory("links")}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 8,
                        alignItems: "center",
                        backgroundColor: sharedCategory === "links" ? (mode === "dark" ? "#2D2D2D" : "#FFFFFF") : "transparent",
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "600", color: sharedCategory === "links" ? C.accent : C.textMuted }}>
                        Links ({sharedMedia.links.filter(item => !/cloudinary/i.test(item.url || "")).length})
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Sub-tab Content List */}
                  {loadingShared ? (
                    <ActivityIndicator color={C.accent} style={{ marginVertical: 20 }} />
                  ) : (
                    <View style={{ minHeight: 80 }}>
                      {sharedCategory === "media" && (
                        (() => {
                          const imagesOnly = sharedMedia.media.filter(item => 
                            /\.(jpe?g|png|gif|webp|bmp|heic)(\?|$)/i.test(item.url || "")
                          );
                          if (imagesOnly.length === 0) {
                            return (
                              <Text style={{ textAlign: "center", color: C.textMuted, marginVertical: 20, fontSize: 14 }}>
                                No media found in this group
                              </Text>
                            );
                          }
                          return (
                            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                              {imagesOnly.map((item, idx) => {
                                const resolvedUrl = resolveMediaUrl(item.url);
                                return (
                                  <TouchableOpacity
                                    key={idx}
                                    onPress={() => Linking.openURL(resolvedUrl).catch((err) => console.error(err))}
                                    style={{
                                      width: "31%",
                                      aspectRatio: 1,
                                      borderRadius: 8,
                                      backgroundColor: mode === "dark" ? "#2D2D2D" : "#E5E7EB",
                                      overflow: "hidden",
                                    }}
                                  >
                                    <Image source={{ uri: resolvedUrl }} style={{ width: "100%", height: "100%" }} />
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          );
                        })()
                      )}

                      {sharedCategory === "files" && (
                        sharedMedia.files.length === 0 ? (
                          <Text style={{ textAlign: "center", color: C.textMuted, marginVertical: 20, fontSize: 14 }}>
                            No documents found in this group
                          </Text>
                        ) : (
                          <View style={{ gap: 10 }}>
                            {sharedMedia.files.map((item, idx) => {
                              const resolvedUrl = resolveMediaUrl(item.url);
                              const label = item.name || resolvedUrl.split("/").pop() || "Document";
                              return (
                                <TouchableOpacity
                                  key={idx}
                                  onPress={() => Linking.openURL(resolvedUrl).catch((err) => console.error(err))}
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 12,
                                    padding: 12,
                                    borderRadius: 10,
                                    backgroundColor: mode === "dark" ? "#1E1E1E" : "#F9FAFB",
                                    borderWidth: 1,
                                    borderColor: C.glassBorder,
                                  }}
                                >
                                  <Ionicons name="document-text-outline" size={24} color={C.accent} />
                                  <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 14, fontWeight: "600", color: C.textPrimary }} numberOfLines={1}>
                                      {label}
                                    </Text>
                                    <Text style={{ fontSize: 11, color: C.textMuted }}>
                                      Tap to open document
                                    </Text>
                                  </View>
                                  <Ionicons name="download-outline" size={20} color={C.textMuted} />
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )
                      )}

                      {sharedCategory === "links" && (
                        (() => {
                          const webLinksOnly = sharedMedia.links.filter(item => 
                            !/cloudinary/i.test(item.url || "")
                          );
                          if (webLinksOnly.length === 0) {
                            return (
                              <Text style={{ textAlign: "center", color: C.textMuted, marginVertical: 20, fontSize: 14 }}>
                                No links found in this group
                              </Text>
                            );
                          }
                          return (
                            <View style={{ gap: 10 }}>
                              {webLinksOnly.map((item, idx) => (
                                <TouchableOpacity
                                  key={idx}
                                  onPress={() => Linking.openURL(item.url).catch((err) => console.error(err))}
                                  style={{
                                    padding: 12,
                                    borderRadius: 10,
                                    backgroundColor: mode === "dark" ? "#1E1E1E" : "#F9FAFB",
                                    borderWidth: 1,
                                    borderColor: C.glassBorder,
                                  }}
                                >
                                  <Text style={{ fontSize: 14, color: C.accent, fontWeight: "500" }} numberOfLines={2}>
                                    {item.url}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          );
                        })()
                      )}
                    </View>
                  )}
                </GlassCard>
              </>
            ) : null}

            {/* Danger zone */}
            <Text style={[styles.sectionLabel, { color: C.mahoganyLight }]}>
              Danger zone
            </Text>
            <GlassCard style={styles.dangerCard} styles={styles}>
              {!isOwner && (
                <TouchableOpacity
                  style={styles.dangerBtn}
                  onPress={handleLeave}
                >
                  <Ionicons name="exit-outline" size={20} color={C.mahoganyLight} />
                  <Text style={styles.dangerBtnText}>Exit group</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.dangerBtn} onPress={handleReport}>
                <Ionicons name="flag-outline" size={20} color={C.mahoganyLight} />
                <Text style={styles.dangerBtnText}>Report group</Text>
              </TouchableOpacity>
            </GlassCard>

            <TouchableOpacity style={styles.feedLink} onPress={() =>
              router.push({
                pathname: "/community-feed",
                params: { communityId: communityId ?? "", name },
              } as never)
            }>
              <Ionicons name="newspaper-outline" size={20} color={C.accent} />
              <Text style={styles.feedLinkText}>Open community feed</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

function ActionChip({
  icon,
  label,
  onPress,
  disabled,
  C,
  styles,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  C: GroupDetailsPalette;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionChip, disabled && { opacity: 0.4 }]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.actionIconWrap}>
        <Ionicons name={icon} size={22} color={C.accent} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const createStyles = (C: GroupDetailsPalette) =>
  StyleSheet.create({
  root: { flex: 1, backgroundColor: C.screenBg },
  safe: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  topTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: C.textPrimary,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  hero: { alignItems: "center", paddingVertical: 24 },
  heroAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: C.glassBorder,
  },
  heroAvatarPh: {
    backgroundColor: C.glassHighlight,
    alignItems: "center",
    justifyContent: "center",
  },
  heroLetter: { fontSize: 48, fontWeight: "700", color: C.textPrimary },
  heroName: {
    fontSize: 24,
    fontWeight: "700",
    color: C.textPrimary,
    textAlign: "center",
  },
  heroMeta: { fontSize: 14, color: C.textMuted, marginTop: 4 },
  heroDesc: {
    fontSize: 14,
    color: C.textMuted,
    textAlign: "center",
    marginTop: 12,
    paddingHorizontal: 24,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 24,
  },
  actionChip: { alignItems: "center", minWidth: 72 },
  actionIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.glassBg,
    borderWidth: 1,
    borderColor: C.glassBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  actionLabel: { fontSize: 12, color: C.textMuted, fontWeight: "500" },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textMuted,
    marginBottom: 8,
    marginTop: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  glassCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.glassBorder,
    backgroundColor: C.glassBg,
  },
  glassInner: { padding: 16 },
  linkText: {
    color: C.textPrimary,
    fontSize: 13,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    marginBottom: 12,
  },
  linkActions: { flexDirection: "row", gap: 10 },
  linkBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.glassBorder,
    backgroundColor: C.glassHighlight,
  },
  linkBtnPrimary: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  linkBtnText: { color: C.textPrimary, fontWeight: "600", fontSize: 14 },
  refreshLink: {
    color: C.accent,
    fontSize: 12,
    textAlign: "center",
  },
  searchRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.glassBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: C.textPrimary,
    backgroundColor: C.inputBg,
  },
  goBtn: {
    backgroundColor: C.accent,
    paddingHorizontal: 16,
    justifyContent: "center",
    borderRadius: 10,
  },
  goBtnText: { color: C.accentContrast, fontWeight: "700" },
  inviteRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.divider,
  },
  inviteAction: { color: C.accent, fontWeight: "700" },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.divider,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  memberAvatarPh: {
    backgroundColor: C.glassHighlight,
    alignItems: "center",
    justifyContent: "center",
  },
  memberInitial: { color: C.accent, fontWeight: "700", fontSize: 16 },
  memberInfo: { flex: 1 },
  memberName: { color: C.textPrimary, fontWeight: "600", fontSize: 16 },
  roleBadge: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  roleAdmin: { color: C.accent },
  requestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  acceptText: { color: C.accent, fontWeight: "700" },
  rejectText: { color: C.textMuted, fontWeight: "600" },
  dangerCard: { borderColor: C.dangerBorder },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.divider,
  },
  dangerBtnText: {
    color: C.mahoganyLight,
    fontWeight: "600",
    fontSize: 16,
  },
  feedLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  feedLinkText: { color: C.accent, fontWeight: "600" },
});
