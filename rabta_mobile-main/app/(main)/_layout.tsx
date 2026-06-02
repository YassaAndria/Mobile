import { Redirect, Stack, useSegments, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../src/store/store";
import { useTheme } from "../../src/theme/ThemeContext";
import { MainLayout } from "../../src/components/layout/MainLayout";

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
