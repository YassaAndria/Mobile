import { Redirect, Stack, useSegments, useRouter } from "expo-router";
import React, { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSelector } from "react-redux";
import type { RootState } from "../../src/store/store";
import { useTheme } from "../../src/theme/ThemeContext";
import { MainLayout } from "../../src/components/layout/MainLayout";
import * as Notifications from "expo-notifications";
import {
  registerForPushNotificationsAsync,
  registerDeviceTokenWithBackend,
  unregisterDeviceTokenWithBackend
} from "../../src/utils/notifications";

const PENDING_INVITE_KEY = "pendingGroupInviteToken";

export default function MainGroupLayout() {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const { isDark } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  const authRoutes = ["login", "signup", "forgot-password", "login-success", "setup-profile", "index"];
  const chatRoutes = ["ChatWindowScreen", "call", "GroupDetailsScreen", "chat-info", "community-feed", "JoinGroupScreen", "create-group"];

  const isAuthRoute = segments.includes("index") || authRoutes.some(r => segments.includes(r));
  const isChatRoute = chatRoutes.some(r => segments.includes(r));

  // Hide tab bar on auth screens AND chat/call screens
  const hideTabBar = isAuthRoute || isChatRoute;

  useEffect(() => {
    if (!isAuthenticated && !isAuthRoute) {
      router.replace("/login");
    }
  }, [isAuthenticated, isAuthRoute]);

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      const pending = await AsyncStorage.getItem(PENDING_INVITE_KEY);
      if (pending) {
        await AsyncStorage.removeItem(PENDING_INVITE_KEY);
        router.push(`/group/invite/${pending}` as never);
      }
    })();
  }, [isAuthenticated, router]);

  // Push notifications handling
  useEffect(() => {
    if (!isAuthenticated) return;

    let isMounted = true;
    let responseListener: any;

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    registerForPushNotificationsAsync().then(async (token) => {
      if (!isMounted) return;
      if (token) {
        console.log('[MainLayout] Got push token:', token);
        await AsyncStorage.setItem('pushToken', token);
        await registerDeviceTokenWithBackend(token);
      }
    });

    responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      console.log('[MainLayout] Push notification clicked with data:', data);
      if (data && data.chatId) {
        router.push({
          pathname: '/ChatWindowScreen',
          params: {
            chatId: data.chatId,
            chatName: data.chatName || data.title || '',
            isGroup: data.type === 'group' ? 'true' : 'false',
          }
        } as any);
      }
    });

    return () => {
      isMounted = false;
      if (responseListener) {
        responseListener.remove();
      }
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      AsyncStorage.removeItem('pushToken');
    }
  }, [isAuthenticated]);

  if (!isAuthenticated && !isAuthRoute) {
    return null;
  }

  return (
    <MainLayout hideTabBar={hideTabBar}>
      <Stack
        screenOptions={{
          // Hide header on auth screens and chat screens (they have their own headers)
          headerShown: !isAuthRoute,
          headerTitle: "",
          headerBackVisible: false,
          headerStyle: { backgroundColor: isDark ? "#171717" : "#FFFFFF" },
          headerShadowVisible: false,
          // No profile picture in header
          headerRight: () => null,
        }}
      />
    </MainLayout>
  );
}
