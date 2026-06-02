import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

const { width } = Dimensions.get('window');

interface ContactDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  name: string;
  avatar?: string;
  isOnline?: boolean;
  isGroup?: boolean;
  memberCount?: number;
  onVoiceCall?: () => void;
  onVideoCall?: () => void;
  onSearch?: () => void;
}

export default function ContactDetailsModal({
  visible,
  onClose,
  name,
  avatar,
  isOnline,
  isGroup,
  memberCount,
  onVoiceCall,
  onVideoCall,
  onSearch,
}: ContactDetailsModalProps) {
  const { colors, isDark } = useTheme();

  const bg = isDark ? '#1a1a1a' : '#f2f2f7';
  const cardBg = isDark ? '#2c2c2e' : '#ffffff';
  const textColor = colors.text;
  const mutedColor = colors.textMuted;
  const accentColor = '#25D366'; // WhatsApp green

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: bg }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: cardBg }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="chevron-back" size={22} color={accentColor} />
            <Text style={[styles.backText, { color: accentColor }]}>Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>
            {isGroup ? 'Group info' : 'Contact info'}
          </Text>
          <TouchableOpacity>
            <Text style={[styles.editText, { color: accentColor }]}>Edit</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Avatar + Name Section */}
          <View style={[styles.profileSection, { backgroundColor: cardBg }]}>
            <View style={styles.avatarWrapper}>
              {avatar ? (
                <Image
                  source={{ uri: avatar }}
                  style={styles.avatar}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: colors.purple }]}>
                  <Text style={styles.avatarInitials}>
                    {name?.charAt(0)?.toUpperCase() ?? '?'}
                  </Text>
                </View>
              )}
            </View>

            <Text style={[styles.nameText, { color: textColor }]}>{name}</Text>

            {isGroup ? (
              <Text style={[styles.subText, { color: accentColor }]}>
                Group · {memberCount ?? 0} members
              </Text>
            ) : (
              <Text style={[styles.subText, { color: mutedColor }]}>
                {isOnline ? '🟢 Online' : '⚫ Offline'}
              </Text>
            )}
          </View>

          {/* Action Buttons */}
          <View style={[styles.actionsRow, { backgroundColor: cardBg }]}>
            <TouchableOpacity style={styles.actionBtn} onPress={onVoiceCall}>
              <Ionicons name="call-outline" size={24} color={accentColor} />
              <Text style={[styles.actionLabel, { color: accentColor }]}>Audio</Text>
            </TouchableOpacity>

            <View style={[styles.actionDivider, { backgroundColor: isDark ? '#3a3a3c' : '#e0e0e0' }]} />

            <TouchableOpacity style={styles.actionBtn} onPress={onVideoCall}>
              <Ionicons name="videocam-outline" size={24} color={accentColor} />
              <Text style={[styles.actionLabel, { color: accentColor }]}>Video</Text>
            </TouchableOpacity>

            <View style={[styles.actionDivider, { backgroundColor: isDark ? '#3a3a3c' : '#e0e0e0' }]} />

            <TouchableOpacity style={styles.actionBtn} onPress={onSearch}>
              <Ionicons name="search-outline" size={24} color={accentColor} />
              <Text style={[styles.actionLabel, { color: accentColor }]}>Search</Text>
            </TouchableOpacity>
          </View>

          {/* Info Rows */}
          <View style={[styles.section, { backgroundColor: cardBg }]}>
            <InfoRow
              icon="image-outline"
              label="Media, links and docs"
              value=""
              iconColor={accentColor}
              textColor={textColor}
              mutedColor={mutedColor}
              isDark={isDark}
            />
            <InfoRow
              icon="star-outline"
              label="Starred"
              value="None"
              iconColor={accentColor}
              textColor={textColor}
              mutedColor={mutedColor}
              isDark={isDark}
            />
            <InfoRow
              icon="notifications-outline"
              label="Notifications"
              value=""
              iconColor={accentColor}
              textColor={textColor}
              mutedColor={mutedColor}
              isDark={isDark}
              isLast
            />
          </View>

          {/* Disappearing messages */}
          <View style={[styles.section, { backgroundColor: cardBg }]}>
            <InfoRow
              icon="time-outline"
              label="Disappearing messages"
              value="Off"
              iconColor={accentColor}
              textColor={textColor}
              mutedColor={mutedColor}
              isDark={isDark}
              isLast
            />
          </View>

          {/* Encryption */}
          <View style={[styles.section, { backgroundColor: cardBg }]}>
            <View style={styles.encryptionRow}>
              <Ionicons name="lock-closed-outline" size={20} color={accentColor} />
              <View style={styles.encryptionText}>
                <Text style={[styles.encTitle, { color: textColor }]}>Encryption</Text>
                <Text style={[styles.encSub, { color: mutedColor }]}>
                  Messages and calls are end-to-end encrypted. Tap to learn more.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={mutedColor} />
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function InfoRow({
  icon,
  label,
  value,
  iconColor,
  textColor,
  mutedColor,
  isDark,
  isLast,
}: {
  icon: any;
  label: string;
  value: string;
  iconColor: string;
  textColor: string;
  mutedColor: string;
  isDark: boolean;
  isLast?: boolean;
}) {
  return (
    <View>
      <TouchableOpacity style={styles.infoRow}>
        <Ionicons name={icon} size={20} color={iconColor} style={styles.infoIcon} />
        <View style={styles.infoContent}>
          <Text style={[styles.infoLabel, { color: textColor }]}>{label}</Text>
          {value ? (
            <Text style={[styles.infoValue, { color: mutedColor }]}>{value}</Text>
          ) : null}
          <Ionicons name="chevron-forward" size={16} color={mutedColor} />
        </View>
      </TouchableOpacity>
      {!isLast && (
        <View style={[styles.rowDivider, { backgroundColor: isDark ? '#3a3a3c' : '#f0f0f0', marginLeft: 52 }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#cccccc44',
  },
  closeBtn: { flexDirection: 'row', alignItems: 'center', minWidth: 60 },
  backText: { fontSize: 17 },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  editText: { fontSize: 17, minWidth: 40, textAlign: 'right' },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 28,
    marginTop: 20,
    marginHorizontal: 0,
  },
  avatarWrapper: { marginBottom: 12 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarFallback: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { color: '#fff', fontSize: 36, fontWeight: '700' },
  nameText: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  subText: { fontSize: 14 },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 12,
    marginHorizontal: 0,
    paddingVertical: 4,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  actionLabel: { fontSize: 12, fontWeight: '500', marginTop: 4 },
  actionDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  section: {
    marginTop: 24,
    borderRadius: 0,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoIcon: { marginRight: 16, width: 24, textAlign: 'center' },
  infoContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoLabel: { fontSize: 16, flex: 1 },
  infoValue: { fontSize: 16, marginRight: 6 },
  rowDivider: { height: StyleSheet.hairlineWidth },
  encryptionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 14,
  },
  encryptionText: { flex: 1 },
  encTitle: { fontSize: 16, marginBottom: 4 },
  encSub: { fontSize: 13, lineHeight: 18 },
});
