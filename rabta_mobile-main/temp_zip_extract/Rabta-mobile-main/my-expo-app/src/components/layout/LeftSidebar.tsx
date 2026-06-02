import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { usePathname, useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSelector } from "react-redux";
import { useChat } from "../../context/ChatContext";
import type { RootState } from "../../store/store";
import { useTheme } from "../../theme/ThemeContext";

interface NavItem {
  path: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
}

const LeftSidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);
  const { isConnected } = useChat();
  const { colors, isDark } = useTheme();

  const getInitials = (name: string) => {
    if (!name) return "??";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  };

  const initials = user ? getInitials(user.fullName) : "??";
  const profileImage = user?.avatar || user?.profilePicture || user?.image;

  const navItems: NavItem[] = [
    { path: "/chats", icon: "chat-bubble", label: "Chats" },
    { path: "/groups", icon: "groups", label: "Groups" },
    { path: "/bookmarks", icon: "bookmark", label: "Saved" },
    { path: "/jobs", icon: "work-outline", label: "Jobs" },
    { path: "/calls", icon: "call", label: "Calls" },
  ];

  const isActive = (path: string) => pathname.startsWith(path);

  const sidebarBg = isDark ? "#171717" : "#FFFFFF";
  const borderColor = isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6";

  return (
    <View style={[styles.aside, { backgroundColor: sidebarBg, borderRightColor: borderColor }]}>
      <View style={styles.logoWrap}>
        <Pressable
          onPress={() => router.push("/chats")}
          style={[
            styles.logoBtn,
            { backgroundColor: isDark ? "rgba(139,92,246,0.3)" : "#EDE9FE" },
          ]}
        >
          <MaterialIcons name="device-hub" size={26} color={colors.purple} />
        </Pressable>
        <View
          style={[
            styles.dot,
            {
              borderColor: sidebarBg,
              backgroundColor: isConnected ? "#22C55E" : "#EF4444",
            },
          ]}
        />
      </View>

      <View style={styles.nav}>
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Pressable
              key={item.path}
              onPress={() => router.push(item.path as any)}
              style={[
                styles.navBtn,
                active && { backgroundColor: isDark ? "rgba(139,92,246,0.3)" : "#EDE9FE" },
              ]}
            >
              <MaterialIcons name={item.icon} size={24} color={active ? colors.purple : "#9CA3AF"} />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.bottom}>
        <Pressable
          onPress={() => router.push("/settings")}
          style={[
            styles.navBtn,
            isActive("/settings") && { backgroundColor: isDark ? "rgba(139,92,246,0.3)" : "#EDE9FE" },
          ]}
        >
          <MaterialIcons
            name="settings"
            size={24}
            color={isActive("/settings") ? colors.purple : "#9CA3AF"}
          />
        </Pressable>

        <Pressable onPress={() => router.push("/profile")}>
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: colors.purple,
                borderColor: isDark ? "#6D28D9" : "#DDD6FE",
              },
            ]}
          >
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatarImg} contentFit="cover" />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  aside: {
    width: 64,
    height: "100%",
    borderRightWidth: 1,
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 16,
    zIndex: 20,
  },
  logoWrap: { marginBottom: 32, position: "relative" },
  logoBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  nav: { gap: 20, alignItems: "center", width: "100%" },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  bottom: { marginTop: "auto", gap: 24, alignItems: "center", paddingBottom: 16 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  avatarImg: { width: "100%", height: "100%", borderRadius: 18 },
  avatarText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});

export default LeftSidebar;
