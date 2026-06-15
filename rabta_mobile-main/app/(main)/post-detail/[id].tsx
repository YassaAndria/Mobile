/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import axiosInstance from '../../../src/api/axiosInstance';
import { useAppSelector } from '../../../src/store/hooks';
import { useTheme } from '../../../src/theme/ThemeContext';
import { typography } from '../../../src/theme/typography';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommentAuthor {
  _id: string;
  name: string;
  fullName?: string;
  avatar?: string;
}

interface Comment {
  _id: string;
  text?: string;
  content?: string;
  author?: CommentAuthor;
  userId?: CommentAuthor;
  likesCount: number;
  isLiked: boolean;
  createdAt: string;
}

interface Post {
  _id: string;
  content?: string;
  authorId?: { _id?: string; fullName?: string; avatar?: string };
  likes?: string[];
  createdAt?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

const getInitials = (name?: string) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
};

// ─── Comment Skeleton ─────────────────────────────────────────────────────────

function CommentSkeleton({ colors }: { colors: any }) {
  return (
    <View style={[styles.commentRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.avatarSkeleton, { backgroundColor: colors.surface2 }]} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={{ height: 12, borderRadius: 6, backgroundColor: colors.surface2, width: '40%' }} />
        <View style={{ height: 10, borderRadius: 6, backgroundColor: colors.surface2, width: '80%' }} />
        <View style={{ height: 10, borderRadius: 6, backgroundColor: colors.surface2, width: '60%' }} />
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function PostDetailScreen() {
  const { id: postId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const currentUser = useAppSelector(s => s.auth.user) as any;
  const myId: string = currentUser?._id || currentUser?.id || '';

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingPost, setLoadingPost] = useState(true);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);

  const inputRef = useRef<TextInput>(null);

  // ── Load post ──────────────────────────────────────────────────────────────

  const fetchPost = useCallback(async () => {
    try {
      const res = await axiosInstance.get(`/posts/${postId}`);
      setPost(res.data?.data?.post ?? res.data?.data ?? null);
    } catch {
      /* ignore */
    } finally {
      setLoadingPost(false);
    }
  }, [postId]);

  // ── Load comments ──────────────────────────────────────────────────────────

  const fetchComments = useCallback(async () => {
    try {
      setLoadingComments(true);
      const res = await axiosInstance.get(`/posts/${postId}/comments`);
      const raw: any[] = res.data?.data?.comments ?? res.data?.data ?? [];
      setComments(raw);
    } catch {
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  }, [postId]);

  useEffect(() => {
    if (postId) {
      fetchPost();
      fetchComments();
    }
  }, [postId, fetchPost, fetchComments]);

  // ── Add comment ────────────────────────────────────────────────────────────

  const handleAddComment = async () => {
    const text = commentText.trim();
    if (!text || sending) return;
    setSending(true);
    // Optimistic insert
    const tempId = `temp-${Date.now()}`;
    const optimistic: Comment = {
      _id: tempId,
      content: text,
      text,
      author: { _id: myId, name: currentUser?.fullName || 'You', avatar: currentUser?.avatar },
      likesCount: 0,
      isLiked: false,
      createdAt: new Date().toISOString(),
    };
    setComments(prev => [optimistic, ...prev]);
    setCommentText('');
    inputRef.current?.blur();
    try {
      await axiosInstance.post(`/posts/${postId}/comments`, { content: text });
      // Refetch to get real data
      await fetchComments();
    } catch {
      // Rollback
      setComments(prev => prev.filter(c => c._id !== tempId));
      setCommentText(text);
      Toast.show({ type: 'error', text1: 'Failed to post comment' });
    } finally {
      setSending(false);
    }
  };

  // ── Like comment ───────────────────────────────────────────────────────────

  const handleLikeComment = async (commentId: string) => {
    // Optimistic toggle
    setComments(prev =>
      prev.map(c =>
        c._id === commentId
          ? { ...c, isLiked: !c.isLiked, likesCount: c.isLiked ? c.likesCount - 1 : c.likesCount + 1 }
          : c,
      ),
    );
    try {
      await axiosInstance.post(`/posts/${postId}/comments/${commentId}/like`);
    } catch {
      // Rollback
      setComments(prev =>
        prev.map(c =>
          c._id === commentId
            ? { ...c, isLiked: !c.isLiked, likesCount: c.isLiked ? c.likesCount - 1 : c.likesCount + 1 }
            : c,
        ),
      );
    }
  };

  // ── Delete comment ─────────────────────────────────────────────────────────

  const handleDeleteComment = (commentId: string) => {
    Alert.alert('Delete Comment', 'Are you sure you want to delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setComments(prev => prev.filter(c => c._id !== commentId));
          try {
            await axiosInstance.delete(`/posts/${postId}/comments/${commentId}`);
            Toast.show({ type: 'success', text1: 'Comment deleted' });
          } catch {
            await fetchComments();
            Toast.show({ type: 'error', text1: 'Failed to delete comment' });
          }
        },
      },
    ]);
  };

  // ── Render comment item ────────────────────────────────────────────────────

  const renderComment = ({ item }: { item: Comment }) => {
    const author = item.author || item.userId;
    const authorName = author?.name || author?.fullName || 'User';
    const authorAvatar = author?.avatar;
    const authorId = author?._id || '';
    const isOwner = authorId === myId;
    const text = item.text || item.content || '';
    const liked = item.isLiked;

    return (
      <Pressable
        onLongPress={() => isOwner && handleDeleteComment(item._id)}
        style={[styles.commentRow, { borderBottomColor: colors.border }]}
      >
        {/* Avatar */}
        {authorAvatar && authorAvatar.length > 0 ? (
          <Image source={{ uri: authorAvatar }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.purple + '30' }]}>
            <Text style={[typography.caption, { color: colors.purple, fontWeight: '800' }]}>
              {getInitials(authorName)}
            </Text>
          </View>
        )}

        {/* Body */}
        <View style={{ flex: 1 }}>
          <View style={styles.commentHeader}>
            <Text style={[typography.caption, { color: colors.text, fontWeight: '700' }]}>
              {authorName}
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted, fontSize: 11 }]}>
              {formatTime(item.createdAt)}
            </Text>
          </View>
          <Text style={[typography.body, { color: colors.textSubtle, marginTop: 4, lineHeight: 20 }]}>
            {text}
          </Text>

          {/* Actions row */}
          <View style={styles.commentActions}>
            <TouchableOpacity
              onPress={() => handleLikeComment(item._id)}
              style={styles.likeBtn}
            >
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={16}
                color={liked ? '#EF4444' : colors.textMuted}
              />
              {item.likesCount > 0 && (
                <Text style={[typography.caption, { color: liked ? '#EF4444' : colors.textMuted, marginLeft: 4, fontWeight: '600' }]}>
                  {item.likesCount}
                </Text>
              )}
            </TouchableOpacity>

            {isOwner && (
              <TouchableOpacity
                onPress={() => handleDeleteComment(item._id)}
                style={styles.deleteBtn}
              >
                <MaterialIcons name="delete-outline" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  // ── Post header component ──────────────────────────────────────────────────

  const PostHeader = () => {
    if (loadingPost) {
      return (
        <View style={[styles.postCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ActivityIndicator color={colors.purple} />
        </View>
      );
    }
    if (!post) return null;
    const authorName = post.authorId?.fullName || 'Member';
    const authorAvatar = post.authorId?.avatar;
    const time = post.createdAt ? formatTime(post.createdAt) : '';

    return (
      <View style={[styles.postCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.postAuthorRow}>
          {authorAvatar && authorAvatar.length > 0 ? (
            <Image source={{ uri: authorAvatar }} style={styles.postAvatar} contentFit="cover" />
          ) : (
            <View style={[styles.postAvatarPlaceholder, { backgroundColor: colors.purple + '30' }]}>
              <Text style={[typography.body, { color: colors.purple, fontWeight: '800' }]}>
                {getInitials(authorName)}
              </Text>
            </View>
          )}
          <View>
            <Text style={[typography.body, { color: colors.text, fontWeight: '700' }]}>{authorName}</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>{time}</Text>
          </View>
        </View>
        <Text style={[typography.body, { color: colors.text, lineHeight: 22, marginTop: 12 }]}>
          {post.content}
        </Text>
        <View style={[styles.postDivider, { backgroundColor: colors.border }]} />
        <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '700', letterSpacing: 0.5 }]}>
          COMMENTS · {comments.length}
        </Text>
      </View>
    );
  };

  const ListHeader = () => (
    <>
      <PostHeader />
      {loadingComments && (
        <View style={{ marginTop: 8 }}>
          {[1, 2, 3].map(i => <CommentSkeleton key={i} colors={colors} />)}
        </View>
      )}
    </>
  );

  const ListEmpty = () => {
    if (loadingComments) return null;
    return (
      <View style={styles.emptyBox}>
        <Ionicons name="chatbubble-outline" size={40} color={colors.textMuted} />
        <Text style={[typography.body, { color: colors.textMuted, marginTop: 12, textAlign: 'center' }]}>
          No comments yet.{'\n'}Be the first!
        </Text>
      </View>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen
        options={{
          title: 'Post',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ paddingLeft: 8 }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <FlatList
        data={loadingComments ? [] : comments}
        keyExtractor={item => item._id}
        renderItem={renderComment}
        ListHeaderComponent={<ListHeader />}
        ListEmptyComponent={<ListEmpty />}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      />

      {/* Sticky comment input */}
      <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {currentUser?.avatar && currentUser.avatar.length > 0 ? (
          <Image source={{ uri: currentUser.avatar }} style={styles.inputAvatar} contentFit="cover" />
        ) : (
          <View style={[styles.inputAvatarPlaceholder, { backgroundColor: colors.purple + '30' }]}>
            <Text style={{ color: colors.purple, fontWeight: '800', fontSize: 12 }}>
              {getInitials(currentUser?.fullName)}
            </Text>
          </View>
        )}

        <TextInput
          ref={inputRef}
          style={[styles.input, { color: colors.text, backgroundColor: colors.bg, borderColor: colors.border }]}
          placeholder="Write a comment..."
          placeholderTextColor={colors.textMuted}
          value={commentText}
          onChangeText={setCommentText}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={handleAddComment}
        />

        <TouchableOpacity
          onPress={handleAddComment}
          disabled={!commentText.trim() || sending}
          style={[
            styles.sendBtn,
            {
              backgroundColor: commentText.trim() ? colors.purple : colors.surface2,
              opacity: sending ? 0.6 : 1,
            },
          ]}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={18} color={commentText.trim() ? '#fff' : colors.textMuted} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Post card
  postCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  postAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  postAvatar: { width: 44, height: 44, borderRadius: 22 },
  postAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postDivider: { height: 1, marginVertical: 16 },

  // Comment row
  commentRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  commentActions: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 16 },
  likeBtn: { flexDirection: 'row', alignItems: 'center' },
  deleteBtn: { padding: 2 },

  // Avatars
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSkeleton: { width: 36, height: 36, borderRadius: 18 },

  // Empty state
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
  },
  inputAvatar: { width: 34, height: 34, borderRadius: 17, marginBottom: 4 },
  inputAvatarPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 120,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
});
