import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import type { MessageType } from '../../types';

const { width } = Dimensions.get('window');

interface MoreActionsModalProps {
  visible: boolean;
  onClose: () => void;
  message: MessageType | null;
  onEdit: (message: MessageType) => void;
  onCopy: (content: string) => void;
  onTranslate?: (message: MessageType) => void;
  onSmartReplies?: (message: MessageType) => void;
  onVoiceRead?: (message: MessageType) => void;
}

export default function MoreActionsModal({
  visible,
  onClose,
  message,
  onEdit,
  onCopy,
  onTranslate,
  onSmartReplies,
  onVoiceRead,
}: MoreActionsModalProps) {
  const { colors, isDark } = useTheme();

  if (!message) return null;

  const modalBg = isDark ? '#2C2C2E' : '#FFFFFF';
  const dividerColor = isDark ? '#3A3A3C' : '#E5E5EA';

  const handleShare = async () => {
    try {
      if (message.content) {
        await Share.share({
          message: message.content,
        });
      }
      onClose();
    } catch (error) {
      console.error('[MoreActionsModal] Error sharing:', error);
    }
  };

  const isTextMessage = message.type === 'text' || !message.type;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalContainer, { backgroundColor: modalBg }]}>
              {/* Header */}
              <View style={[styles.header, { borderBottomColor: dividerColor }]}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>More Options</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Options */}
              <View style={styles.optionsList}>
                {/* EDIT MESSAGE (Own text messages only) */}
                {message.isMine && isTextMessage && (
                  <TouchableOpacity
                    style={styles.optionRow}
                    onPress={() => {
                      onEdit(message);
                      onClose();
                    }}
                  >
                    <Ionicons name="pencil-outline" size={22} color={colors.purple} style={styles.optionIcon} />
                    <Text style={[styles.optionLabel, { color: colors.text }]}>Edit Message</Text>
                  </TouchableOpacity>
                )}

                {/* COPY */}
                {message.content ? (
                  <TouchableOpacity
                    style={styles.optionRow}
                    onPress={() => {
                      onCopy(message.content);
                      onClose();
                    }}
                  >
                    <Ionicons name="copy-outline" size={22} color={colors.purple} style={styles.optionIcon} />
                    <Text style={[styles.optionLabel, { color: colors.text }]}>Copy Text</Text>
                  </TouchableOpacity>
                ) : null}

                {/* TRANSLATE */}
                {isTextMessage && onTranslate && (
                  <TouchableOpacity
                    style={styles.optionRow}
                    onPress={() => {
                      onTranslate(message);
                      onClose();
                    }}
                  >
                    <Ionicons name="language-outline" size={22} color={colors.purple} style={styles.optionIcon} />
                    <Text style={[styles.optionLabel, { color: colors.text }]}>Translate Message</Text>
                  </TouchableOpacity>
                )}

                {/* SMART REPLIES (Partner only) */}
                {!message.isMine && isTextMessage && onSmartReplies && (
                  <TouchableOpacity
                    style={styles.optionRow}
                    onPress={() => {
                      onSmartReplies(message);
                      onClose();
                    }}
                  >
                    <Ionicons name="bulb-outline" size={22} color={colors.purple} style={styles.optionIcon} />
                    <Text style={[styles.optionLabel, { color: colors.text }]}>Smart Replies</Text>
                  </TouchableOpacity>
                )}

                {/* SHARE EXTERNALLY */}
                {message.content ? (
                  <TouchableOpacity
                    style={styles.optionRow}
                    onPress={handleShare}
                  >
                    <Ionicons name="share-social-outline" size={22} color={colors.purple} style={styles.optionIcon} />
                    <Text style={[styles.optionLabel, { color: colors.text }]}>Share Externally</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContainer: {
    width: width - 48,
    maxWidth: 320,
    borderRadius: 16,
    overflow: 'hidden',
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  optionsList: {
    paddingVertical: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionIcon: {
    marginRight: 16,
    width: 24,
    textAlign: 'center',
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
});
