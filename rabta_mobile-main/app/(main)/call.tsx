import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';

// Fix for ZegoUIKitPrebuiltCall grantPermissions ReferenceError on New Architecture
if (typeof (global as any).Platform === 'undefined') {
  (global as any).Platform = Platform;
}

import Constants from 'expo-constants';

// @ts-ignore
import { ZegoUIKitPrebuiltCall, ONE_ON_ONE_VIDEO_CALL_CONFIG, ONE_ON_ONE_VOICE_CALL_CONFIG } from '@zegocloud/zego-uikit-prebuilt-call-rn';

const rawZegoAppId = Constants.expoConfig?.extra?.zegoAppId as string | undefined;
const APP_ID = Number(
  (rawZegoAppId && rawZegoAppId !== "EXPO_PUBLIC_ZEGO_APP_ID")
    ? rawZegoAppId
    : (process.env.EXPO_PUBLIC_ZEGO_APP_ID || "0")
);
const APP_SIGN = process.env.EXPO_PUBLIC_ZEGO_APP_SIGN || "";

// Suppress the setOptions error from Zego
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Cannot call setOptions outside a screen')
  ) {
    return;
  }
  originalConsoleError(...args);
};

export default function CallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    callType:        string;
    recipientId:     string;
    recipientName:   string;
    currentUserId:   string;
    currentUserName: string;
    callId?:         string;
  }>();

  const callType        = (params.callType || 'voice') as 'voice' | 'video';
  const recipientId     = params.recipientId     || '';
  const currentUserId   = params.currentUserId   || '';
  const currentUserName = params.currentUserName || 'Me';
  const paramCallId     = params.callId;

  // Restore console.error when leaving screen
  useEffect(() => {
    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  if (!currentUserId || !recipientId) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={{ color: '#fff', marginTop: 12 }}>Connecting...</Text>
      </View>
    );
  }

  const callID = paramCallId || [currentUserId, recipientId].sort().join('_');

  const callConfig = callType === 'video'
    ? { ...ONE_ON_ONE_VIDEO_CALL_CONFIG }
    : { ...ONE_ON_ONE_VOICE_CALL_CONFIG };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ZegoUIKitPrebuiltCall
        appID={APP_ID}
        appSign={APP_SIGN}
        userID={currentUserId}
        userName={currentUserName}
        callID={callID}
        config={{
          ...callConfig,
          onCallEnd: (_callID: string, _reason: string, _duration: number) => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/');
            }
          },
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
});
