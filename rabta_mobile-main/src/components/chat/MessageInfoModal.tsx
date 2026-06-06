import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useTheme } from '../../theme/ThemeContext';
import type { MessageType } from '../../types';

const { width } = Dimensions.get('window');

interface MessageInfoModalProps {
  visible: boolean;
  onClose: () => void;
  message: MessageType | null;
  chatUsers: any[];
  currentUserId: string;
  isGroup: boolean;
}

export default function MessageInfoModal({
  visible,
  onClose,
  message,
  chatUsers,
  currentUserId,
  isGroup,
}: MessageInfoModalProps) {
  const { colors, isDark } = useTheme();

  if (!message) return null;

  // Format full date & time for display
  const fullDate = message.createdAt
    ? new Date(message.createdAt).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const fullTime = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '';

  // Determine read status
  const readBySet = new Set(message.readBy || []);
  
  // Find members who have read it
  const readMembers = chatUsers.filter((u) => {
    const uid = u._id || u.id;
    return uid !== currentUserId && readBySet.has(uid);
  });

  // Find members who haven't read it yet (for group chats)
  const unreadMembers = chatUsers.filter((u) => {
    const uid = u._id || u.id;
    return uid !== currentUserId && !readBySet.has(uid);
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF', borderBottomColor: isDark ? '#3A3A3C' : '#E5E5EA' }]}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.purple} />
            <Text style={[styles.backText, { color: colors.purple }]}>Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Message Info</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Message Preview Card */}
          <View style={[styles.card, { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' }]}>
            <Text style={[styles.cardTitle, { color: colors.textMuted }]}>Message</Text>
            <View style={[styles.previewBubble, { backgroundColor: isDark ? '#3A3A3C' : '#E9E9EB' }]}>
              <Text style={[styles.previewText, { color: colors.text }]}>
                {message.type === 'text' ? message.content : `📎 [${message.type || 'Attachment'}]`}
              </Text>
              <Text style={[styles.previewTime, { color: colors.textMuted }]}>{message.time}</Text>
            </View>
          </View>

          {/* Time & Delivery Details */}
          <View style={[styles.card, { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' }]}>
            <Text style={[styles.cardTitle, { color: colors.textMuted }]}>Details</Text>
            
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={20} color={colors.purple} style={styles.detailIcon} />
              <View>
                <Text style={[styles.detailLabel, { color: colors.text }]}>Sent</Text>
                <Text style={[styles.detailValue, { color: colors.textMuted }]}>{fullDate} at {fullTime}</Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: isDark ? '#3A3A3C' : '#E5E5EA' }]} />

            <View style={styles.detailRow}>
              <Ionicons
                name={message.status === 'read' ? 'checkmark-done' : 'checkmark'}
                size={20}
                color={message.status === 'read' ? '#34C759' : colors.textMuted}
                style={styles.detailIcon}
              />
              <View>
                <Text style={[styles.detailLabel, { color: colors.text }]}>Status</Text>
                <Text style={[styles.detailValue, { color: colors.textMuted }]}>
                  {message.status === 'read' ? 'Read' : message.status === 'delivered' ? 'Delivered' : 'Sent'}
                </Text>
              </View>
            </View>
          </View>

          {/* Read By List (Groups or 1:1) */}
          {isGroup ? (
            <>
              <View style={[styles.card, { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' }]}>
                <Text style={[styles.cardTitle, { color: colors.textMuted }]}>Read By ({readMembers.length})</Text>
                {readMembers.length > 0 ? (
                  readMembers.map((member, idx) => (
                    <View key={member._id || member.id}>
                      <View style={styles.memberRow}>
                        <View style={[styles.avatarContainer, { backgroundColor: colors.purple + '20' }]}>
                          {member.avatar || member.profilePicture ? (
                            <Image source={{ uri: member.avatar || member.profilePicture }} style={styles.avatar} contentFit="cover" />
                          ) : (
                            <Text style={[styles.initials, { color: colors.purple }]}>
                              {(member.fullName || member.name || '?').charAt(0).toUpperCase()}
                            </Text>
                          )}
                        </View>
                        <Text style={[styles.memberName, { color: colors.text }]}>
                          {member.fullName || member.name}
                        </Text>
                      </View>
                      {idx < readMembers.length - 1 && (
                        <View style={[styles.divider, { backgroundColor: isDark ? '#3A3A3C' : '#E5E5EA', marginLeft: 48 }]} />
                      )}
                    </View>
                  ))
                ) : (
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>No one has read this message yet.</Text>
                )}
              </View>

              <View style={[styles.card, { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' }]}>
                <Text style={[styles.cardTitle, { color: colors.textMuted }]}>Delivered To ({unreadMembers.length})</Text>
                {unreadMembers.length > 0 ? (
                  unreadMembers.map((member, idx) => (
                    <View key={member._id || member.id}>
                      <View style={styles.memberRow}>
                        <View style={[styles.avatarContainer, { backgroundColor: colors.purple + '20' }]}>
                          {member.avatar || member.profilePicture ? (
                            <Image source={{ uri: member.avatar || member.profilePicture }} style={styles.avatar} contentFit="cover" />
                          ) : (
                            <Text style={[styles.initials, { color: colors.purple }]}>
                              {(member.fullName || member.name || '?').charAt(0).toUpperCase()}
                            </Text>
                          )}
                        </View>
                        <Text style={[styles.memberName, { color: colors.text }]}>
                          {member.fullName || member.name}
                        </Text>
                      </View>
                      {idx < unreadMembers.length - 1 && (
                        <View style={[styles.divider, { backgroundColor: isDark ? '#3A3A3C' : '#E5E5EA', marginLeft: 48 }]} />
                      )}
                    </View>
                  ))
                ) : (
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>All members have read this message.</Text>
                )}
              </View>
            </>
          ) : (
            message.status === 'read' && (
              <View style={[styles.card, { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' }]}>
                <Text style={[styles.cardTitle, { color: colors.textMuted }]}>Read By</Text>
                {chatUsers.filter(u => u._id !== currentUserId || u.id !== currentUserId).map((member) => (
                  <View key={member._id || member.id} style={styles.memberRow}>
                    <View style={[styles.avatarContainer, { backgroundColor: colors.purple + '20' }]}>
                      {member.avatar || member.profilePicture ? (
                        <Image source={{ uri: member.avatar || member.profilePicture }} style={styles.avatar} contentFit="cover" />
                      ) : (
                        <Text style={[styles.initials, { color: colors.purple }]}>
                          {(member.fullName || member.name || '?').charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.memberName, { color: colors.text }]}>
                      {member.fullName || member.name}
                    </Text>
                  </View>
                ))}
              </View>
            )
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 60,
  },
  backText: {
    fontSize: 17,
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  previewBubble: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: width - 64,
  },
  previewText: {
    fontSize: 16,
    lineHeight: 22,
  },
  previewTime: {
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  detailIcon: {
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  detailLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  initials: {
    fontSize: 14,
    fontWeight: '700',
  },
  memberName: {
    fontSize: 15,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});
