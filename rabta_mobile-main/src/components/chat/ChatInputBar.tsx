import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Platform,
  StyleSheet,
  Animated,
  Text,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import EmojiPicker, { EmojiType } from 'rn-emoji-keyboard';
import { useTheme } from '../../theme/ThemeContext';
import { AiAssistant } from '../shared/AiAssistant';
import type { MessageType } from '../../types';

interface ChatInputBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onAttach?: () => void;
  onMicPressIn?: () => void;
  onMicPressOut?: () => void;
  isRecording?: boolean;
  recordingTime?: string;
  placeholder?: string;
  replyingTo?: MessageType | null;
  onCancelReply?: () => void;
  chatId?: string | null;
}

export default function ChatInputBar({
  value,
  onChangeText,
  onSend,
  onAttach,
  onMicPressIn,
  onMicPressOut,
  isRecording = false,
  recordingTime = '00:00',
  placeholder = 'Message',
  replyingTo,
  onCancelReply,
  chatId,
}: ChatInputBarProps) {
  const { colors, isDark } = useTheme();
  const [showEmoji, setShowEmoji] = useState(false);
  const hasText = value.trim().length > 0;

  const handleEmojiSelected = (emoji: EmojiType) => {
    onChangeText(value + emoji.emoji);
  };

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const animateButton = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  };

  const handleSend = () => {
    animateButton();
    onSend();
  };

  const handleMicPressIn = () => {
    animateButton();
    onMicPressIn?.();
  };

  const handleMicPressOut = () => {
    Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }).start();
    onMicPressOut?.();
  };

  const barBg = isDark ? '#262628' : '#F0F2F5';
  const iconColor = isDark ? '#aaaaaa' : '#888888';
  const actionBg = colors.purple;
  const replyBg = isDark ? '#1f1f1f' : '#f0f4ff';
  const replyBorder = colors.purple;

  return (
    <View style={[styles.outerWrapper, { backgroundColor: colors.bg }]}>

      {/* ── Reply Banner ── */}
      {replyingTo && (
        <View style={[styles.replyBanner, { backgroundColor: replyBg, borderLeftColor: replyBorder }]}>
          <View style={styles.replyContent}>
            <Text style={[styles.replyTitle, { color: colors.purple }]}>
              {replyingTo.isMine ? 'You' : (replyingTo.senderName || 'Reply')}
            </Text>
            <Text style={[styles.replyText, { color: colors.textMuted }]} numberOfLines={1}>
              {replyingTo.content || '📎 Attachment'}
            </Text>
          </View>
          <TouchableOpacity onPress={onCancelReply} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Main Input Row ── */}
      <View style={[styles.wrapper, { borderTopColor: isDark ? '#333333' : '#E5E7EB' }]}>

        {/* Left Icon Group */}
        <View style={styles.leftIconsGroup}>
          <TouchableOpacity onPress={() => setShowEmoji(true)} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
            <Ionicons name="happy-outline" size={22} color={iconColor} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onAttach} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
            <MaterialIcons name="attach-file" size={22} color={iconColor} />
          </TouchableOpacity>
          {chatId ? (
            <AiAssistant chatId={chatId} variant="icon" />
          ) : null}
        </View>

        {/* Text Input Capsule */}
        <View style={[styles.inputCapsule, { backgroundColor: barBg }]}>
          {isRecording ? (
            <View style={styles.recordingContainer}>
              <View style={styles.recordingDot} />
              <Text style={[styles.recordingText, { color: colors.text }]}>Recording... {recordingTime}</Text>
            </View>
          ) : (
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder={placeholder}
              placeholderTextColor={isDark ? '#888' : '#aaa'}
              value={value}
              onChangeText={onChangeText}
              multiline
              maxLength={2000}
              scrollEnabled
              textAlignVertical="center"
            />
          )}
        </View>

        {/* Send / Mic Button */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: isRecording ? '#ef4444' : actionBg }]}
            onPress={hasText ? handleSend : undefined}
            onPressIn={!hasText ? handleMicPressIn : undefined}
            onPressOut={!hasText ? handleMicPressOut : undefined}
            activeOpacity={hasText ? 0.85 : 1}
          >
            {hasText ? (
              <Ionicons name="send" size={20} color="#ffffff" style={{ marginLeft: 2 }} />
            ) : (
              <MaterialIcons name="mic" size={24} color="#ffffff" />
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Emoji Picker */}
      <EmojiPicker
        onEmojiSelected={handleEmojiSelected}
        open={showEmoji}
        onClose={() => setShowEmoji(false)}
        theme={{
          backdrop: '#16161888',
          knob: colors.purple,
          container: colors.surface,
          header: colors.text,
          skinTonesContainer: colors.bg,
          category: {
            icon: colors.textMuted,
            iconActive: colors.purple,
            container: colors.surface,
            containerActive: colors.purple10,
          },
        }}
        allowMultipleSelections
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderLeftWidth: 3,
    marginHorizontal: 8,
    marginBottom: 4,
    borderRadius: 6,
    gap: 10,
  },
  replyContent: { flex: 1 },
  replyTitle: { fontSize: 12, fontWeight: '700', marginBottom: 1 },
  replyText: { fontSize: 13 },
  wrapper: {
    flexDirection: 'row',
    direction: 'ltr',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  leftIconsGroup: {
    flexDirection: 'row',
    direction: 'ltr',
    alignItems: 'center',
    paddingBottom: 8,
    gap: 12,
  },
  iconBtn: { alignItems: 'center', justifyContent: 'center' },
  inputCapsule: {
    flex: 1,
    flexDirection: 'row',
    direction: 'ltr',
    alignItems: 'flex-end',
    borderRadius: 20,
    marginHorizontal: 8,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    minHeight: 40,
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    maxHeight: 100,
    paddingVertical: Platform.OS === 'ios' ? 0 : 4,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  recordingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
    marginRight: 8,
  },
  recordingText: { fontSize: 15, fontWeight: '500' },
});
