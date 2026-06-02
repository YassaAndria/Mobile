import { MaterialIcons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import type { RootState } from "../../store/store";
import { useTheme } from "../../theme/ThemeContext";

interface TabItem {
  path: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  activeIcon?: keyof typeof MaterialIcons.glyphMap;
  label: string;
}

/** Static base tabs shown for every authenticated user */
const BASE_TABS: TabItem[] = [
  { path: "/jobs",      icon: "work-outline",        activeIcon: "work",        label: "Jobs"      },
  { path: "/Calls",     icon: "call",                activeIcon: "call",        label: "Calls"     },
  { path: "/chats",     icon: "chat-bubble-outline", activeIcon: "chat-bubble", label: "Chats"     },
  { path: "/community", icon: "people-outline",      activeIcon: "people",      label: "Community" },
  { path: "/settings",  icon: "settings",            activeIcon: "settings",    label: "Settings"  },
];

/** Admin variant: Jobs is replaced by Dashboard */
const ADMIN_TABS: TabItem[] = [
  { path: "/admin",     icon: "dashboard",           activeIcon: "dashboard",   label: "Dashboard" },
  { path: "/Calls",     icon: "call",                activeIcon: "call",        label: "Calls"     },
  { path: "/chats",     icon: "chat-bubble-outline", activeIcon: "chat-bubble", label: "Chats"     },
  { path: "/community", icon: "people-outline",      activeIcon: "people",      label: "Community" },
  { path: "/settings",  icon: "settings",            activeIcon: "settings",    label: "Settings"  },
];

const BottomTabBar: React.FC = () => {
  const pathname = usePathname();
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const { colors } = useTheme();

  // ── Live auth state from Redux ────────────────────────────────────────────
  const userRole = useSelector((state: RootState) => state.auth.user?.role);

  const isAdmin = userRole === "admin";

  // Compose tab list: admins get Dashboard in place of Jobs
  const tabs = useMemo<TabItem[]>(
    () => (isAdmin ? ADMIN_TABS : BASE_TABS),
    [isAdmin]
  );

  const isActive = (path: string) => pathname.startsWith(path);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderTopColor:  colors.border,
          // Respect safe-area bottom on notched devices; minimum 12 px padding
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      {tabs.map((tab) => {
        const active = isActive(tab.path);
        const iconColor  = active ? colors.purple : colors.textMuted;
        const labelColor = active ? colors.purple : colors.textMuted;

        return (
          <Pressable
            key={tab.path}
            onPress={() => router.push(tab.path as any)}
            accessibilityLabel={tab.label}
            accessibilityRole="button"
            style={styles.tabItem}
          >
            <MaterialIcons 
              name={active && tab.activeIcon ? tab.activeIcon : tab.icon} 
              size={24} 
              color={iconColor} 
            />
            <Text
              style={[
                styles.tabLabel,
                { color: labelColor, fontWeight: active ? "700" : "500" },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

export default BottomTabBar;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    justifyContent: "space-around",
    alignItems: "center",
    // Elevation / shadow so it feels elevated above content
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 3,
  },
});
