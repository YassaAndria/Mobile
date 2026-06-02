/**
 * src/components/chat/ChatHeader.tsx
 *
 * Changes from original:
 *  - Added `callLoading` prop so the header can show a spinner on the call
 *    icon buttons while the Zego token is being fetched (prevents double-tap).
 *  - All existing layout, styling, and dropdown menu logic is untouched.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface ChatHeaderProps {
  chatId: string;
  userId?: string;
  chatName: string;
  avatar?: string;
  isGroup?: boolean;
  isOnline?: boolean;
  isTyping?: boolean;
  onVoiceCall: () => void;
  onVideoCall: () => void;
  /**
   * When true, the call icon buttons show a spinner and are disabled.
   * Set this while the parent is fetching the ZegoCloud token.
   */
  callLoading?: boolean;
  /** Optional: open a bottom-sheet or modal instead of navigating */
  onOpenDetails?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dropdown menu item definition
// ─────────────────────────────────────────────────────────────────────────────
interface MenuItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  onPress: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export const ChatHeader: React.FC<ChatHeaderProps> = ({
  chatId,
  userId,
  chatName,
  avatar,
  isGroup,
  isOnline,
  isTyping,
  onVoiceCall,
  onVideoCall,
  callLoading = false,
  onOpenDetails,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);

  // ── Status text ────────────────────────────────────────────────────────
  const statusLabel = isTyping
    ? 'typing...'
    : isGroup
    ? 'Group Chat'
    : isOnline
    ? 'Online'
    : 'Offline';

  // ── Navigate to info screen ────────────────────────────────────────────
  const navigateToInfo = () => {
    if (onOpenDetails) {
      onOpenDetails();
      return;
    }
    if (isGroup) {
      router.push({
        pathname: '/GroupDetailsScreen',
        params: {
          groupId:     chatId,
          groupName:   chatName,
          groupAvatar: avatar ?? '',
        },
      });
    } else {
      router.push({
        pathname: '/chat-info',
        params: {
          chatId,
          userId:     userId ?? '',
          userName:   chatName,
          userAvatar: avatar ?? '',
          isOnline:   isOnline ? 'true' : 'false',
        },
      });
    }
  };

  // ── Navigate to profile ────────────────────────────────────────────────
  const navigateToProfile = () => {
    setMenuVisible(false);
    if (isGroup) {
      router.push({
        pathname: '/GroupDetailsScreen',
        params: {
          groupId:     chatId,
          groupName:   chatName,
          groupAvatar: avatar ?? '',
        },
      });
    } else if (userId) {
      router.push(`/freelancer-profile/${userId}`);
    }
  };

  // ── Dropdown menu items ────────────────────────────────────────────────
  const menuItems: MenuItem[] = [
    {
      label:   isGroup ? 'Group Info' : 'Contact Info',
      icon:    'information-circle-outline',
      onPress: () => { setMenuVisible(false); navigateToInfo(); },
    },
    {
      label:   'View Profile',
      icon:    'person-outline',
      onPress: navigateToProfile,
    },
    {
      label:   'Search in Chat',
      icon:    'search-outline',
      onPress: () => setMenuVisible(false),
    },
    {
      label:   'Mute Notifications',
      icon:    'notifications-off-outline',
      onPress: () => setMenuVisible(false),
    },
    ...(!isGroup
      ? [
          {
            label:   'Block User',
            icon:    'ban-outline' as keyof typeof Ionicons.glyphMap,
            color:   colors.red,
            onPress: () => setMenuVisible(false),
          },
        ]
      : []),
  ];

  // ── Colors ─────────────────────────────────────────────────────────────
  const headerBg   = isDark ? '#171717' : '#FFFFFF';
  const dropdownBg = isDark ? '#262626' : '#FFFFFF';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor:  headerBg,
          borderBottomColor: colors.border,
          paddingTop: Platform.OS === 'ios' ? insets.top : 8,
        },
      ]}
    >
      {/* ── Left side ─────────────────────────────────────────────────────── */}
      <View style={styles.leftSide}>
        {/* Back button */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={26} color={colors.purple} />
        </TouchableOpacity>

        {/* Avatar — tappable to open info */}
        <TouchableOpacity
          onPress={navigateToInfo}
          activeOpacity={0.82}
          style={[styles.avatarContainer, { backgroundColor: colors.purple }]}
        >
          {avatar ? (
            <Image
              source={{ uri: avatar }}
              style={styles.avatarImg}
              contentFit="cover"
            />
          ) : (
            <Text style={styles.avatarInitials}>
              {chatName ? chatName.charAt(0).toUpperCase() : '?'}
            </Text>
          )}

          {/* Online indicator dot */}
          {!isGroup && isOnline && <View style={styles.onlineDot} />}
        </TouchableOpacity>

        {/* Name + Status — tappable to open info */}
        <TouchableOpacity
          style={styles.textContainer}
          onPress={navigateToInfo}
          activeOpacity={0.7}
        >
          <Text
            style={[styles.nameText, { color: colors.text }]}
            numberOfLines={1}
          >
            {chatName}
          </Text>
          <Text
            style={[
              styles.statusText,
              { color: isTyping ? colors.green : colors.textMuted },
            ]}
          >
            {statusLabel}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Right side ────────────────────────────────────────────────────── */}
      <View style={styles.rightSide}>
        {/*
         * While fetching the Zego token, replace the two call buttons with a
         * single compact spinner so the user knows something is happening.
         */}
        {callLoading ? (
          <View style={styles.iconBtn}>
            <ActivityIndicator size="small" color={colors.purple} />
          </View>
        ) : (
          <>
            <TouchableOpacity
              onPress={onVideoCall}
              style={styles.iconBtn}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              disabled={callLoading}
            >
              <Ionicons name="videocam-outline" size={24} color={colors.purple} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onVoiceCall}
              style={styles.iconBtn}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              disabled={callLoading}
            >
              <Ionicons name="call-outline" size={22} color={colors.purple} />
            </TouchableOpacity>
          </>
        )}

        {/* Three-dot dropdown trigger */}
        <TouchableOpacity
          onPress={() => setMenuVisible(true)}
          style={styles.iconBtn}
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        >
          <Ionicons name="ellipsis-vertical" size={22} color={colors.purple} />
        </TouchableOpacity>
      </View>

      {/* ── Dropdown Menu Modal (unchanged) ──────────────────────────────── */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setMenuVisible(false)}
        >
          <View
            style={[
              styles.dropdownMenu,
              {
                backgroundColor: dropdownBg,
                borderColor:     colors.border,
                top: Platform.OS === 'ios' ? insets.top + 50 : 60,
              },
            ]}
          >
            {menuItems.map((item, idx) => (
              <React.Fragment key={item.label}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={item.icon}
                    size={18}
                    color={item.color ?? colors.textMuted}
                    style={styles.menuIcon}
                  />
                  <Text
                    style={[
                      styles.menuItemText,
                      { color: item.color ?? colors.text },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
                {idx < menuItems.length - 1 && (
                  <View
                    style={[
                      styles.menuDivider,
                      { backgroundColor: isDark ? '#38383A' : '#E5E5EA' },
                    ]}
                  />
                )}
              </React.Fragment>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles (unchanged from original)
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: 8,
    paddingBottom:     10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  leftSide: {
    flexDirection: 'row',
    alignItems:    'center',
    flex:          1,
    minWidth:      0,
  },
  backButton: {
    padding:    8,
    marginLeft: -4,
  },
  avatarContainer: {
    width:          40,
    height:         40,
    borderRadius:   20,
    justifyContent: 'center',
    alignItems:     'center',
    marginRight:    10,
    overflow:       'visible',
    position:       'relative',
  },
  avatarImg: {
    width:        40,
    height:       40,
    borderRadius: 20,
  },
  avatarInitials: {
    color:      '#fff',
    fontSize:   16,
    fontWeight: '700',
  },
  onlineDot: {
    position:        'absolute',
    bottom:          0,
    right:           0,
    width:           12,
    height:          12,
    borderRadius:    6,
    backgroundColor: '#4ade80',
    borderWidth:     2,
    borderColor:     '#fff',
  },
  textContainer: {
    flex:           1,
    justifyContent: 'center',
    minWidth:       0,
  },
  nameText: {
    fontSize:     16,
    fontWeight:   '600',
    marginBottom: 1,
  },
  statusText: {
    fontSize: 12,
  },
  rightSide: {
    flexDirection: 'row',
    alignItems:    'center',
  },
  iconBtn: {
    padding:    8,
    marginLeft: 2,
  },
  modalOverlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  dropdownMenu: {
    position:      'absolute',
    right:         12,
    width:         210,
    borderRadius:  12,
    borderWidth:   StyleSheet.hairlineWidth,
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius:  12,
    elevation:     8,
    overflow:      'hidden',
    paddingVertical: 4,
  },
  menuItem: {
    flexDirection:   'row',
    alignItems:      'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  menuIcon: {
    marginRight: 12,
  },
  menuItemText: {
    fontSize:   15,
    fontWeight: '400',
  },
  menuDivider: {
    height:      StyleSheet.hairlineWidth,
    marginLeft:  48,
  },
});
