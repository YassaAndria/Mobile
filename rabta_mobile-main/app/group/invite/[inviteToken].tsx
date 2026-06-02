/**
 * Deep link handler: rabta://group/invite/:inviteToken
 * Opens join confirmation when user taps invite link from WhatsApp, etc.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Pressable,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import { useSelector } from "react-redux";
import type { RootState } from "../../../src/store/store";
import {
  previewInviteGroup,
  joinGroupViaLink,
} from "../../../src/api/community";
import { getApiErrorMessage } from "../../../src/api/getApiErrorMessage";
import { useTheme } from "../../../src/theme/ThemeContext";
import { getGroupDetailsPalette } from "../../../src/theme/groupDetailsTheme";
import { normalizeId } from "../../../src/utils/chatMessage";

const PENDING_INVITE_KEY = "pendingGroupInviteToken";

type PreviewCommunity = {
  _id: string;
  name: string;
  description?: string;
  avatar?: string;
  memberCount?: number;
  isPublic?: boolean;
};

export default function JoinGroupInviteScreen() {
  const { mode } = useTheme();
  const C = getGroupDetailsPalette(mode);
  const styles = useMemo(() => createStyles(C), [C]);
  const router = useRouter();
  const params = useLocalSearchParams<{ inviteToken?: string }>();
  const inviteToken = Array.isArray(params.inviteToken)
    ? params.inviteToken[0]
    : params.inviteToken;

  const isAuthenticated = useSelector(
    (s: RootState) => s.auth.isAuthenticated,
  );

  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [preview, setPreview] = useState<PreviewCommunity | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = useCallback(async () => {
    if (!inviteToken) {
      setError("Invalid invite link.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await previewInviteGroup(inviteToken);
      const c = res.data?.data?.community;
      if (!c) {
        setError("Group not found.");
        return;
      }
      setPreview({
        _id: normalizeId(c._id),
        name: c.name ?? "Group",
        description: c.description,
        avatar: c.avatar,
        memberCount: c.memberCount ?? c.members?.length,
        isPublic: c.isPublic,
      });
    } catch (e) {
      setError(getApiErrorMessage(e, "This invite link is invalid or expired."));
    } finally {
      setLoading(false);
    }
  }, [inviteToken]);

  useEffect(() => {
    if (!isAuthenticated) {
      if (inviteToken) {
        void AsyncStorage.setItem(PENDING_INVITE_KEY, inviteToken);
      }
      router.replace("/login");
      return;
    }
    void loadPreview();
  }, [isAuthenticated, inviteToken, loadPreview, router]);

  const handleJoin = async () => {
    if (!inviteToken || !preview) return;
    setJoining(true);
    try {
      const res = await joinGroupViaLink(inviteToken);
      const communityId = normalizeId(
        res.data?.data?.communityId ??
          res.data?.data?.community?._id,
      );
      await AsyncStorage.removeItem(PENDING_INVITE_KEY);
      Toast.show({
        type: "success",
        text1: res.data?.message ?? "You joined the group!",
      });
      if (communityId) {
        router.replace({
          pathname: "/GroupDetailsScreen",
          params: { communityId },
        } as never);
      } else {
        router.replace("/community");
      }
    } catch (e) {
      Toast.show({
        type: "error",
        text1: getApiErrorMessage(e, "Could not join group."),
      });
    } finally {
      setJoining(false);
    }
  };

  const handleDecline = () => {
    void AsyncStorage.removeItem(PENDING_INVITE_KEY);
    router.replace("/community");
  };

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={[C.gradientStart, C.gradientMid, C.gradientEnd]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={C.accent} />
            <Text style={styles.loadingText}>Loading invite…</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleDecline}>
              <Text style={styles.secondaryBtnText}>Go back</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Modal visible transparent animationType="fade">
            <Pressable style={styles.backdrop} onPress={handleDecline}>
              <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
                {preview?.avatar ? (
                  <Image
                    source={{ uri: preview.avatar }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarLetter}>
                      {(preview?.name ?? "G")[0]}
                    </Text>
                  </View>
                )}
                <Text style={styles.title}>Join group?</Text>
                <Text style={styles.groupName}>{preview?.name}</Text>
                {preview?.description ? (
                  <Text style={styles.desc} numberOfLines={3}>
                    {preview.description}
                  </Text>
                ) : null}
                <Text style={styles.meta}>
                  {preview?.memberCount ?? 0} members
                  {preview?.isPublic === false ? " · Private" : ""}
                </Text>
                <TouchableOpacity
                  style={styles.joinBtn}
                  onPress={handleJoin}
                  disabled={joining}
                >
                  {joining ? (
                    <ActivityIndicator color={C.accentContrast} />
                  ) : (
                    <Text style={styles.joinBtnText}>Join group</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleDecline}>
                  <Text style={styles.cancelText}>Not now</Text>
                </TouchableOpacity>
              </Pressable>
            </Pressable>
          </Modal>
        )}
      </SafeAreaView>
    </View>
  );
}

const createStyles = (C: ReturnType<typeof getGroupDetailsPalette>) =>
  StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  loadingText: { color: C.textMuted, marginTop: 12 },
  errorText: { color: C.textPrimary, textAlign: "center", marginBottom: 20 },
  backdrop: {
    flex: 1,
    backgroundColor: C.modalBackdrop,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: C.glassBg,
    borderWidth: 1,
    borderColor: C.glassBorder,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
  },
  avatar: { width: 88, height: 88, borderRadius: 44, marginBottom: 16 },
  avatarPlaceholder: {
    backgroundColor: C.glassHighlight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { fontSize: 36, fontWeight: "700", color: C.textPrimary },
  title: { fontSize: 14, color: C.textMuted, marginBottom: 4 },
  groupName: {
    fontSize: 22,
    fontWeight: "700",
    color: C.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  desc: {
    fontSize: 14,
    color: C.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 8,
  },
  meta: { fontSize: 13, color: C.textMuted, marginBottom: 24 },
  joinBtn: {
    width: "100%",
    backgroundColor: C.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  joinBtnText: { color: C.accentContrast, fontWeight: "700", fontSize: 16 },
  cancelBtn: { paddingVertical: 8 },
  cancelText: { color: C.textMuted, fontWeight: "600" },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: C.glassBorder,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  secondaryBtnText: { color: C.textPrimary, fontWeight: "600" },
});
