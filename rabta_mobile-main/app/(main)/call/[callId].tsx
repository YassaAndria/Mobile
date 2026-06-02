/**
 * app/(main)/call/[callId].tsx
 *
 * ZegoCloud one-on-one call screen (voice & video).
 *
 * Route params (all passed via router.push):
 *   callId       – a unique room ID (we use chatId or a UUID)
 *   callType     – 'voice' | 'video'
 *   recipientId  – ZegoCloud userId of the other participant
 *   recipientName – display name shown in the call UI
 *   zegoToken    – server-generated Token04 for this session
 *   zegoAppId    – numeric ZegoCloud AppID (comes from env / backend response)
 *
 * The caller fetches zegoToken + zegoAppId from
 *   POST /api/v1/calls/zego-token
 * before pushing to this route (see ChatWindowScreen).
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, StatusBar, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../src/store/store';

import {
  ZegoUIKitPrebuiltCall,
  ONE_ON_ONE_VIDEO_CALL_CONFIG,
  ONE_ON_ONE_VOICE_CALL_CONFIG,
  ZegoMenuBarButtonName,
} from '@zegocloud/zego-uikit-prebuilt-call-rn';

// ─────────────────────────────────────────────────────────────────────────────
export default function CallScreen() {
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
  const currentUser = useSelector((s: RootState) => s.auth.user);

  const {
    callId,
    callType,
    recipientId,
    recipientName,
    zegoToken,
    zegoAppId: zegoAppIdParam,
  } = useLocalSearchParams<{
    callId: string;
    callType: 'voice' | 'video';
    recipientId: string;
    recipientName: string;
    zegoToken: string;
    zegoAppId: string;
  }>();

  const isVideo    = callType === 'video';
  const appId      = Number(zegoAppIdParam || '0');
  const myUserId   = (currentUser?._id || currentUser?.id || '') as string;
  const myUserName = (currentUser?.fullName || currentUser?.name || 'Me') as string;

  // Hide the status bar for a true full-screen call experience.
  useEffect(() => {
    StatusBar.setHidden(true);
    return () => {
      StatusBar.setHidden(false);
    };
  }, []);

  // Build the users list for this call room.
  // ZegoCloud needs both participants declared in advance for 1-on-1.
  const users = [
    { userID: myUserId,              userName: myUserName },
    { userID: recipientId as string, userName: recipientName as string },
  ];

  // Pick the right default config and customise the menu bar.
  const baseConfig = isVideo
    ? ONE_ON_ONE_VIDEO_CALL_CONFIG
    : ONE_ON_ONE_VOICE_CALL_CONFIG;

  const callConfig = {
    ...baseConfig,
    // ── Top bar (shown during call) ──────────────────────────────────────
    topMenuBarConfig: {
      ...baseConfig.topMenuBarConfig,
      isVisible: true,
      // Show mute + camera-switch + hang-up
      buttons: isVideo
        ? [
            ZegoMenuBarButtonName.toggleCameraButton,
            ZegoMenuBarButtonName.toggleMicrophoneButton,
            ZegoMenuBarButtonName.switchCameraButton,
            ZegoMenuBarButtonName.hangUpButton,
          ]
        : [
            ZegoMenuBarButtonName.toggleMicrophoneButton,
            ZegoMenuBarButtonName.showMemberListButton,
            ZegoMenuBarButtonName.hangUpButton,
          ],
    },
    // ── Bottom bar buttons ───────────────────────────────────────────────
    bottomMenuBarConfig: {
      ...baseConfig.bottomMenuBarConfig,
      maxCount: 5,
      buttons: isVideo
        ? [
            ZegoMenuBarButtonName.toggleCameraButton,
            ZegoMenuBarButtonName.toggleMicrophoneButton,
            ZegoMenuBarButtonName.switchCameraButton,
            ZegoMenuBarButtonName.hangUpButton,
          ]
        : [
            ZegoMenuBarButtonName.toggleSpeakerButton,
            ZegoMenuBarButtonName.toggleMicrophoneButton,
            ZegoMenuBarButtonName.hangUpButton,
          ],
    },
    // ── Callbacks ────────────────────────────────────────────────────────
    onHangUp: () => {
      // Navigate back to the chat window when the call ends / is hung up.
      router.back();
    },
    onHangUpConfirmation: async () => {
      // No confirmation dialog — hang up immediately.
      return true;
    },
  };

  return (
    <View
      style={[
        styles.container,
        // On iOS respect the safe-area so the call UI isn't hidden under
        // the notch. On Android the status bar is hidden so top = 0.
        { paddingTop: Platform.OS === 'ios' ? insets.top : 0 },
      ]}
    >
      <ZegoUIKitPrebuiltCall
        appID={appId}
        // appSign is NOT used — we authenticate with a server token (Token04).
        appSign=""
        userID={myUserId}
        userName={myUserName}
        callID={callId as string}
        // Server-generated Token04 — required when appSign is blank.
        token={zegoToken as string}
        config={callConfig}
        // Users in the room (1-on-1: caller + callee)
        invitees={users.filter((u) => u.userID !== myUserId)}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
