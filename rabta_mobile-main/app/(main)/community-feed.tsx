import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TextInput,
  Alert,
  RefreshControl,
  Linking,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "../../src/theme/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import {
  addPostComment,
  createCommunityPost,
  getCommunityFeed,
  togglePostLike,
} from "../../src/api/community";
import { getApiErrorMessage } from "../../src/api/getApiErrorMessage";
import { normalizeId } from "../../src/utils/chatMessage";
import { useAppSelector } from "../../src/store/hooks";

type Post = {
  _id: string;
  content?: string;
  authorId?: { _id?: string; fullName?: string };
  media?: { fileUrl: string; fileType: string }[];
  likes?: string[];
  comments?: { userId?: { fullName?: string }; commentText?: string }[];
  createdAt?: string;
};

export default function CommunityFeedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ communityId?: string; name?: string }>();
  const communityId = Array.isArray(params.communityId)
    ? params.communityId[0]
    : params.communityId;
  const groupName = Array.isArray(params.name) ? params.name[0] : params.name ?? "Group";
  const { colors, isDark } = useTheme();
  const authUser = useAppSelector((s) => s.auth.user);
  const myId = normalizeId(
    (authUser as { _id?: string; id?: string } | null)?._id ||
      (authUser as { _id?: string; id?: string } | null)?.id,
  );

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [attachedFiles, setAttachedFiles] = useState<any[]>([]);

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

  const handlePickImage = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 1,
        allowsMultipleSelection: true,
      });
      if (!res.canceled && res.assets) {
        const picked = res.assets.map((asset) => {
          const uri = asset.uri;
          const name = uri.split("/").pop() || "image.jpg";
          const type = asset.mimeType || "image/jpeg";
          return { uri, name, type, isImage: true };
        });
        setAttachedFiles((prev) => [...prev, ...picked]);
      }
    } catch (err) {
      console.error("[CommunityFeed] Image pick failed:", err);
    }
  };

  const handlePickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (!res.canceled && res.assets) {
        const picked = res.assets.map((asset) => {
          const uri = asset.uri;
          const name = asset.name || uri.split("/").pop() || "file";
          const type = asset.mimeType || "application/octet-stream";
          const isImage = type.startsWith("image/");
          return { uri, name, type, isImage };
        });
        setAttachedFiles((prev) => [...prev, ...picked]);
      }
    } catch (err) {
      console.error("[CommunityFeed] Document pick failed:", err);
    }
  };

  const removeAttachedFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const load = useCallback(
    async (silent = false) => {
      if (!communityId) return;
      if (!silent) setLoading(true);
      try {
        const res = await getCommunityFeed(communityId);
        setPosts(res.data?.data?.posts ?? []);
      } catch {
        setPosts([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [communityId],
  );

  useEffect(() => {
    load();
  }, [load]);

  const handleCreatePost = async () => {
    const text = newPost.trim();
    if (!text && attachedFiles.length === 0) return;
    if (!communityId) return;
    setPosting(true);
    try {
      await createCommunityPost(communityId, text, attachedFiles);
      setNewPost("");
      setAttachedFiles([]);
      await load(true);
    } catch (e) {
      Alert.alert("Error", getApiErrorMessage(e, "Could not post."));
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      await togglePostLike(postId);
      await load(true);
    } catch {
      /* ignore */
    }
  };

  const handleComment = async (postId: string) => {
    const text = (commentDraft[postId] ?? "").trim();
    if (!text) return;
    try {
      await addPostComment(postId, text);
      setCommentDraft((d) => ({ ...d, [postId]: "" }));
      await load(true);
    } catch (e) {
      Alert.alert("Error", getApiErrorMessage(e, "Could not comment."));
    }
  };

  const renderPost = ({ item }: { item: Post }) => {
    const authorName = item.authorId?.fullName ?? "Member";
    const liked = (item.likes ?? []).some(
      (id) => normalizeId(id) === myId,
    );
    const time = item.createdAt
      ? new Date(item.createdAt).toLocaleString([], {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

    return (
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text style={{ color: colors.text, fontWeight: "700" }}>{authorName}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 8 }}>
          {time}
        </Text>
        <Text style={{ color: colors.text, lineHeight: 20 }}>{item.content}</Text>

        {/* Post Media / Attachments Display */}
        {item.media && item.media.length > 0 && (
          <View style={{ marginTop: 12, gap: 10 }}>
            {item.media.map((med, idx) => {
              const url = resolveMediaUrl(med.fileUrl);
              const isImg = med.fileType?.startsWith("image/") || /\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i.test(url);
              if (isImg) {
                return (
                  <TouchableOpacity key={idx} onPress={() => Linking.openURL(url).catch(e => console.error(e))}>
                    <Image
                      source={{ uri: url }}
                      style={{
                        width: "100%",
                        height: 200,
                        borderRadius: 10,
                        backgroundColor: isDark ? "#2D2D2D" : "#E5E7EB",
                      }}
                      contentFit="cover"
                    />
                  </TouchableOpacity>
                );
              }
              const label = url.split("/").pop() || "Attachment";
              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => Linking.openURL(url).catch(e => console.error(e))}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    padding: 12,
                    borderRadius: 10,
                    backgroundColor: isDark ? "#1E1E1E" : "#F9FAFB",
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Ionicons name="document-text-outline" size={22} color={colors.purple} />
                  <Text style={{ color: colors.text, fontSize: 13, flex: 1, fontWeight: "500" }} numberOfLines={1}>
                    {label}
                  </Text>
                  <Ionicons name="download-outline" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={styles.postActions}>
          <TouchableOpacity onPress={() => handleLike(item._id)}>
            <Text style={{ color: liked ? colors.purple : colors.textMuted, fontWeight: "600" }}>
              {liked ? "♥" : "♡"} {(item.likes ?? []).length}
            </Text>
          </TouchableOpacity>
        </View>

        {(item.comments ?? []).length > 0 && (
          <View style={styles.commentsBox}>
            {item.comments!.map((c, i) => (
              <Text key={i} style={{ color: colors.textMuted, fontSize: 13, marginBottom: 4 }}>
                <Text style={{ fontWeight: "700", color: colors.text }}>
                  {c.userId?.fullName ?? "User"}:{" "}
                </Text>
                {c.commentText}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.commentRow}>
          <TextInput
            style={[
              styles.commentInput,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg },
            ]}
            placeholder="Write a comment..."
            placeholderTextColor={colors.textMuted}
            value={commentDraft[item._id] ?? ""}
            onChangeText={(t) => setCommentDraft((d) => ({ ...d, [item._id]: t }))}
          />
          <TouchableOpacity onPress={() => handleComment(item._id)}>
            <Text style={{ color: colors.purple, fontWeight: "700" }}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 22, color: colors.purple }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontWeight: "700", fontSize: 18, flex: 1 }} numberOfLines={1}>
          {groupName} Feed
        </Text>
      </View>

      <View style={[styles.compose, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <TextInput
          style={[styles.composeInput, { color: colors.text }]}
          placeholder="Share something with the group..."
          placeholderTextColor={colors.textMuted}
          value={newPost}
          onChangeText={setNewPost}
          multiline
        />

        {/* Attached Files Preview Grid/List */}
        {attachedFiles.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
            <View style={{ flexDirection: "row", gap: 10, paddingVertical: 4 }}>
              {attachedFiles.map((file, idx) => (
                <View
                  key={idx}
                  style={{
                    width: 70,
                    height: 70,
                    borderRadius: 8,
                    backgroundColor: isDark ? "#2D2D2D" : "#E5E7EB",
                    position: "relative",
                    justifyContent: "center",
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  {file.isImage ? (
                    <Image source={{ uri: file.uri }} style={{ width: "100%", height: "100%", borderRadius: 8 }} />
                  ) : (
                    <View style={{ padding: 4, alignItems: "center" }}>
                      <Ionicons name="document-text" size={24} color={colors.purple} />
                      <Text style={{ fontSize: 9, color: colors.text, marginTop: 2, textAlign: "center" }} numberOfLines={1}>
                        {file.name}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => removeAttachedFile(idx)}
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      backgroundColor: "#EF4444",
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      justifyContent: "center",
                      alignItems: "center",
                      elevation: 2,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.2,
                      shadowRadius: 1,
                    }}
                  >
                    <Ionicons name="close" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        {/* Action Bar */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
          <View style={{ flexDirection: "row", gap: 16 }}>
            <TouchableOpacity onPress={handlePickImage} style={{ padding: 6 }}>
              <Ionicons name="image-outline" size={24} color={colors.purple} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePickDocument} style={{ padding: 6 }}>
              <Ionicons name="document-attach-outline" size={24} color={colors.purple} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.postBtn, { backgroundColor: colors.purple, opacity: posting ? 0.6 : 1 }]}
            onPress={handleCreatePost}
            disabled={posting}
          >
            {posting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "700" }}>Post</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.purple} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p._id}
          renderItem={renderPost}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />
          }
          ListEmptyComponent={
            <Text style={{ textAlign: "center", color: colors.textMuted, marginTop: 40 }}>
              No posts yet. Be the first to share!
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  compose: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  composeInput: { minHeight: 60, fontSize: 15, textAlignVertical: "top" },
  postBtn: {
    alignSelf: "flex-end",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  postActions: { flexDirection: "row", marginTop: 12, gap: 16 },
  commentsBox: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(128,128,128,0.2)",
  },
  commentRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
});
