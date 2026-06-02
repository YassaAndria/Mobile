import { Redirect, Stack, useRouter, useSegments } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSelector } from "react-redux";
import { Image } from "expo-image";
import type { RootState } from "../../src/store/store";
import { useTheme } from "../../src/theme/ThemeContext";

import { MainLayout } from "../../src/components/layout/MainLayout";

function HeaderAvatar() {
  const user = useSelector((s: RootState) => s.auth.user);
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const initials = React.useMemo(() => {
    if (user?.fullName) {
      const parts = user.fullName.trim().split(" ");
      return parts.length > 1
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : parts[0].substring(0, 2).toUpperCase();
    }
    return user?.email?.substring(0, 2).toUpperCase() || "?";
  }, [user]);

  return (
    <Pressable onPress={() => router.push("/profile")} style={{ paddingRight: 15 }}>
      <View style={[styles.avatar, { backgroundColor: colors.purple, borderColor: isDark ? "#444" : "#E5E5E5" }]}>
        {user?.avatar ? (
          <Image source={{ uri: user.avatar }} style={styles.avatarImg} contentFit="cover" />
        ) : (
          <Text style={styles.avatarInitials}>{initials}</Text>
        )}
      </View>
    </Pressable>
  );
}

export default function MainGroupLayout() {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const { isDark } = useTheme();
  const segments = useSegments();

  const isAuthRoute = segments.length === 1 || segments.includes("index") || (segments.length === 1 && segments[0] === "(main)") || segments.includes("login") || segments.includes("signup") || segments.includes("forgot-password") || segments.includes("login-success") || segments.includes("setup-profile");

  if (!isAuthenticated && !isAuthRoute) {
    return <Redirect href="/login" />;
  }

  return (
    <MainLayout>
      <Stack
        screenOptions={{
          headerShown: true,
          headerTitle: "",
          headerBackVisible: false,
          headerStyle: { backgroundColor: isDark ? "#171717" : "#FFFFFF" },
          headerShadowVisible: false,
          headerRight: () => <HeaderAvatar />,
        }}
      />
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 35, height: 35, borderRadius: 17.5, borderWidth: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImg: { width: "100%", height: "100%" },
  avatarInitials: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});
