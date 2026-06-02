/* eslint-disable @typescript-eslint/no-explicit-any */
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../src/store/slices/authSlice";
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import type { RootState } from "../../src/store/store";
import { useTheme } from "../../src/theme/ThemeContext";
import { typography } from "../../src/theme/typography";

interface SettingsState {
  notifications: {
    chatMessages: boolean;
    communityMentions: boolean;
    aiJobMatches: boolean;
    inAppSounds: boolean;
  };
  privacy: {
    showOnlineStatus: boolean;
    showJobTitle: boolean;
    publicProfile: boolean;
  };
}

export default function SettingsScreen() {
  const user = useSelector((s: RootState) => s.auth.user);
  const router = useRouter();
  const dispatch = useDispatch();
  const { colors, isDark, toggleTheme, mode } = useTheme();

  const getInitials = (name?: string) => {
    if (!name) return "??";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  };

  const [settings, setSettings] = useState<SettingsState>(
    user?.settings || {
      notifications: {
        chatMessages: true,
        communityMentions: true,
        aiJobMatches: true,
        inAppSounds: true,
      },
      privacy: {
        showOnlineStatus: true,
        showJobTitle: true,
        publicProfile: true,
      },
    },
  );

  const handleToggle = (section: keyof SettingsState, field: string) => {
    setSettings((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: !prev[section][field],
      },
    }));
    Toast.show({ type: "success", text1: "Preference updated" });
  };

  const handleLogout = async () => {
    try {
      // 1. تسجيل الخروج من جلسة جوجل (عشان الشاشة تظهر تاني المرة الجاية)
      // Disabled because this project currently runs on Expo Go. RNGoogleSignin requires native build / prebuild.

      try {
        await GoogleSignin.signOut();
        // await GoogleSignin.revokeAccess(); // (اختياري) لفك ارتباط الاكونت
      } catch (googleError) {
        // Ignore Google sign out error (e.g. if the user didn't log in via Google)
      }


      // 2. مسح التوكن وبيانات المستخدم باستخدام Redux slice
      dispatch(logout());
      Toast.show({ type: "success", text1: "Logged out successfully" });

      // 3. التوجيه بيتم تلقائياً بناءً على حالة الـ isAuthenticated في الـ router/useEffect
    } catch (error) {
      console.error('Logout Error:', error);
      Toast.show({ type: "error", text1: "Failed to logout completely" });
    }
  };

  const card = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Text style={[typography.h2, { color: colors.text, marginBottom: 32, paddingHorizontal: 8 }]}>Settings</Text>

      <Pressable onPress={() => router.push("/profile")} style={[styles.profileCard, card]}>
        <View style={{ position: "relative" }}>
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatarImg} contentFit="cover" />
          ) : (
            <View style={[styles.avatarFallback, { borderColor: colors.purple, backgroundColor: colors.bg }]}>
              <Text style={{ color: colors.purple, fontWeight: "800", fontSize: 20 }}>{getInitials(user?.fullName)}</Text>
            </View>
          )}
          <View style={[styles.onlineDot, { borderColor: colors.surface, backgroundColor: colors.successText }]} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: colors.text }]}>{user?.fullName || "Guest User"}</Text>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            {user?.jobTitle && user?.location
              ? `${user.jobTitle} • ${user.location}`
              : user?.jobTitle
                ? user.jobTitle
                : user?.location
                  ? user.location
                  : ""}
          </Text>
        </View>
      </Pressable>

      <View style={[styles.section, card]}>
        <Text style={[styles.sectionLbl, { color: colors.text }]}>ACCOUNT</Text>
        <Pressable
          style={[styles.row, { borderBottomColor: colors.border }]}
          onPress={() => router.push("/privacy")}
        >
          <View style={[styles.iconBox, { backgroundColor: colors.successBg }]}>
            <MaterialIcons name="lock" size={22} color={colors.successText} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Privacy</Text>
            <Text style={[styles.rowSub, { color: colors.textSubtle }]}>Last seen</Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={colors.textSubtle} />
        </Pressable>
      </View>

      <View style={[styles.section, card]}>
        <Text style={[styles.sectionLbl, { color: colors.text }]}>PREFERENCES</Text>
        <Pressable style={[styles.row, { borderBottomColor: colors.border }]} onPress={toggleTheme}>
          <View style={[styles.iconBox, { backgroundColor: colors.purple10 }]}>
            <MaterialIcons name={mode === "dark" ? "dark-mode" : "light-mode"} size={22} color={colors.purple} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Appearance</Text>
            <Text style={[styles.rowSub, { color: colors.textSubtle }]}>Dark mode, Light mode</Text>
          </View>
          <View style={[styles.toggleTrack, { backgroundColor: mode === "dark" ? colors.purple : colors.border }]}>
            <View style={[styles.toggleKnob, mode === "dark" && { transform: [{ translateX: 20 }] }]} />
          </View>
        </Pressable>

        <Pressable
          style={[styles.row, { borderBottomColor: colors.border }]}
          onPress={() => router.push("/notifications")}
        >
          <View style={[styles.iconBox, { backgroundColor: colors.errorBg }]}>
            <MaterialIcons name="notifications" size={22} color={colors.errorText} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Notifications</Text>
            <Text style={[styles.rowSub, { color: colors.textSubtle }]}>Messages, Groups, Job Alerts</Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={colors.textSubtle} />
        </Pressable>

        <Pressable style={styles.row} onPress={() => handleToggle("notifications", "aiJobMatches")}>
          <View style={[styles.iconBox, { backgroundColor: colors.purple10 }]}>
            <MaterialIcons name="bolt" size={22} color={colors.purple} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Rabta AI Assistant</Text>
            <Text style={[styles.rowSub, { color: colors.textSubtle }]}>Job matching, recommendations</Text>
          </View>
          <View style={[styles.toggleTrack, { backgroundColor: settings.notifications.aiJobMatches ? colors.purple : colors.border }]}>
            <View style={[styles.toggleKnob, settings.notifications.aiJobMatches && { transform: [{ translateX: 20 }] }]} />
          </View>
        </Pressable>
      </View>

      <Pressable
        style={[styles.logout, { backgroundColor: colors.errorBg, borderColor: colors.errorBorder }]}
        onPress={handleLogout}
      >
        <View style={[styles.iconBox, { backgroundColor: colors.errorBg }]}>
          <MaterialIcons name="logout" size={22} color={colors.errorText} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typography.body, { color: colors.errorText, fontWeight: "700" }]}>Log Out</Text>
          <Text style={[typography.bodySmall, { color: colors.errorText, marginTop: 2 }]}>Sign out of your account securely</Text>
        </View>
      </Pressable>

      <Text style={[typography.caption, { color: colors.textMuted, textAlign: "center", marginTop: 24 }]}>Rabta for ITI Community • Version 1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 24, paddingBottom: 48, maxWidth: 672, width: "100%", alignSelf: "center" },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  avatarImg: { width: 64, height: 64, borderRadius: 32, borderWidth: 2 },
  avatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  onlineDot: { position: "absolute", bottom: 0, right: 0, width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  name: { fontSize: 18, fontWeight: "800" },
  meta: { fontSize: 14, marginTop: 4 },
  section: { borderRadius: 16, borderWidth: 1, overflow: "hidden", marginBottom: 16 },
  sectionLbl: { fontSize: 10, fontWeight: "800", letterSpacing: 2, opacity: 0.4, paddingHorizontal: 16, paddingVertical: 8 },
  row: { flexDirection: "row", alignItems: "center", padding: 16, gap: 16, borderBottomWidth: 1 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontSize: 14, fontWeight: "600" },
  rowSub: { fontSize: 12, marginTop: 2 },
  toggleTrack: { width: 40, height: 20, borderRadius: 10, justifyContent: "center", paddingHorizontal: 2 },
  toggleKnob: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#fff", transform: [{ translateX: 0 }] },
  logout: { flexDirection: "row", alignItems: "center", gap: 16, padding: 16, borderRadius: 16, borderWidth: 1, marginTop: 24, marginBottom: 8 },
});
