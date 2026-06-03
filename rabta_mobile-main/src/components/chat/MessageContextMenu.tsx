import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import type { MessageType } from '../../types';

const { width, height } = Dimensions.get('window');

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🎉'];

interface MessageContextMenuProps {
  visible: boolean;
  message: MessageType | null;
  onClose: () => void;
  onReact: (messageId: string, emoji: string) => void;
  onReply: (message: MessageType) => void;
  onForward: (message: MessageType) => void;
  onCopy: (content: string) => void;
  onDelete: (messageId: string) => void;
  onPin: (messageId: string) => void;
  onStar?: (messageId: string) => void;
  isGroup?: boolean;
  onTranslate?: (message: MessageType) => void;
  onSmartReplies?: (message: MessageType) => void;
}

export default function MessageContextMenu({
  visible,
  message,
  onClose,
  onReact,
  onReply,
  onForward,
  onCopy,
  onDelete,
  onPin,
  onStar,
  isGroup,
  onTranslate,
  onSmartReplies,
}: MessageContextMenuProps) {
  const { colors, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 120,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }).start(() => scaleAnim.setValue(0));
    }
  }, [visible]);

  if (!message) return null;

  const menuBg = isDark ? '#2c2c2e' : '#ffffff';
  const dividerColor = isDark ? '#3a3a3c' : '#f0f0f0';
  const textColor = colors.text;
  const deleteColor = '#FF3B30';

  const menuItems = [
    {
      icon: 'arrow-undo-outline' as any,
      label: 'Reply',
      onPress: () => { onReply(message); onClose(); },
      iconLib: 'Ionicons',
    },
    ...(onTranslate && (message.type === 'text' || !message.type) ? [{
      icon: 'language-outline' as any,
      label: 'Translate',
      onPress: () => { onTranslate(message); onClose(); },
      iconLib: 'Ionicons',
    }] : []),
    ...(onSmartReplies && !message.isMine ? [{
      icon: 'bulb-outline' as any,
      label: 'Smart Replies',
      onPress: () => { onSmartReplies(message); onClose(); },
      iconLib: 'Ionicons',
    }] : []),
    {
      icon: 'share-outline' as any,
      label: 'Forward',
      onPress: () => { onForward(message); onClose(); },
      iconLib: 'Ionicons',
    },
    {
      icon: 'copy-outline' as any,
      label: 'Copy',
      onPress: () => { onCopy(message.content); onClose(); },
      iconLib: 'Ionicons',
    },
    ...(onStar ? [{
      icon: 'star-outline' as any,
      label: 'Star',
      onPress: () => { onStar!(message.id); onClose(); },
      iconLib: 'Ionicons',
    }] : []),
    {
      icon: 'pin-outline' as any,
      label: message.isPinned ? 'Unpin' : 'Pin',
      onPress: () => { onPin(message.id); onClose(); },
      iconLib: 'Ionicons',
    },
    {
      icon: 'information-circle-outline' as any,
      label: 'Info',
      onPress: onClose,
      iconLib: 'Ionicons',
    },
    {
      icon: 'trash-outline' as any,
      label: 'Delete',
      onPress: () => { onDelete(message.id); onClose(); },
      iconLib: 'Ionicons',
      isDanger: true,
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.menuContainer,
                {
                  opacity: opacityAnim,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              {/* Reaction Row */}
              <View style={[styles.reactionsRow, { backgroundColor: menuBg }]}>
                {REACTIONS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={styles.reactionBtn}
                    onPress={() => {
                      onReact(message.id, emoji);
                      onClose();
                    }}
                  >
                    <Text style={styles.reactionEmoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.reactionBtn}>
                  <Ionicons name="add" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Message Preview */}
              <View style={[styles.msgPreview, { backgroundColor: isDark ? '#1c1c1e' : '#f8f8f8' }]}>
                <View style={[styles.msgPreviewAccent, { backgroundColor: colors.purple }]} />
                <Text style={[styles.msgPreviewText, { color: textColor }]} numberOfLines={2}>
                  {message.content || '📎 Attachment'}
                </Text>
                <Text style={[styles.msgPreviewTime, { color: colors.textMuted }]}>{message.time}</Text>
              </View>

              {/* Menu Items (2 columns) */}
              <View style={[styles.menuItems, { backgroundColor: menuBg }]}>
                {menuItems.map((item, idx) => {
                  const isLast = idx === menuItems.length - 1;
                  return (
                    <View key={item.label}>
                      <TouchableOpacity
                        style={styles.menuItem}
                        onPress={item.onPress}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.menuLabel, { color: item.isDanger ? deleteColor : textColor }]}>
                          {item.label}
                        </Text>
                        <Ionicons
                          name={item.icon}
                          size={20}
                          color={item.isDanger ? deleteColor : colors.textMuted}
                        />
                      </TouchableOpacity>
                      {!isLast && (
                        <View style={[styles.divider, { backgroundColor: dividerColor }]} />
                      )}
                    </View>
                  );
                })}
              </View>

              {/* More button */}
              <TouchableOpacity style={[styles.moreBtn, { backgroundColor: menuBg }]} onPress={onClose}>
                <Text style={[styles.menuLabel, { color: textColor }]}>More...</Text>
                <Ionicons name="ellipsis-horizontal-circle-outline" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  menuContainer: {
    width: width - 40,
    maxWidth: 340,
    borderRadius: 14,
    overflow: 'hidden',
    gap: 2,
  },
  reactionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    marginBottom: 2,
  },
  reactionBtn: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionEmoji: { fontSize: 28 },
  msgPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    borderRadius: 10,
    marginBottom: 2,
  },
  msgPreviewAccent: { width: 3, height: '100%', borderRadius: 2, minHeight: 30 },
  msgPreviewText: { flex: 1, fontSize: 14, lineHeight: 20 },
  msgPreviewTime: { fontSize: 11 },
  menuItems: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  menuLabel: { fontSize: 17 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 0 },
  moreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 2,
  },
});
