import { MaterialIcons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import React, { useMemo, useState, useEffect } from "react";
import { Pressable, StyleSheet, View, Keyboard } from "react-native";
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
  { path: "/jobs",      icon: "work-outline",        activeIcon: "work",           label: "Jobs"      },
  { path: "/calls",     icon: "call",                activeIcon: "call",           label: "Calls"     },
  { path: "/chats",     icon: "chat-bubble-outline", activeIcon: "chat-bubble",    label: "Chats"     },
  { path: "/ai-chat",   icon: "auto-awesome",        activeIcon: "auto-awesome",   label: "AI"        },
  { path: "/community", icon: "people-outline",      activeIcon: "people",         label: "Community" },
  { path: "/settings",  icon: "settings",            activeIcon: "settings",       label: "Settings"  },
];

/** Admin variant: Jobs is replaced by Dashboard */
const ADMIN_TABS: TabItem[] = [
  { path: "/admin",     icon: "dashboard",           activeIcon: "dashboard",      label: "Dashboard" },
  { path: "/calls",     icon: "call",                activeIcon: "call",           label: "Calls"     },
  { path: "/chats",     icon: "chat-bubble-outline", activeIcon: "chat-bubble",    label: "Chats"     },
  { path: "/ai-chat",   icon: "auto-awesome",        activeIcon: "auto-awesome",   label: "AI"        },
  { path: "/community", icon: "people-outline",      activeIcon: "people",         label: "Community" },
  { path: "/settings",  icon: "settings",            activeIcon: "settings",       label: "Settings"  },
];

/** Employer variant: Jobs is replaced by Employer Workspace */
const EMPLOYER_TABS: TabItem[] = [
  { path: "/employer-dashboard", icon: "dashboard",           activeIcon: "dashboard",      label: "Workspace" },
  { path: "/calls",              icon: "call",                activeIcon: "call",           label: "Calls"     },
  { path: "/chats",              icon: "chat-bubble-outline", activeIcon: "chat-bubble",    label: "Chats"     },
  { path: "/ai-chat",            icon: "auto-awesome",        activeIcon: "auto-awesome",   label: "AI"        },
  { path: "/community",          icon: "people-outline",      activeIcon: "people",         label: "Community" },
  { path: "/settings",           icon: "settings",            activeIcon: "settings",       label: "Settings"  },
];

const BottomTabBar: React.FC = () => {
  const pathname = usePathname();
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const { colors } = useTheme();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // ── Live auth state from Redux ────────────────────────────────────────────
  const userRole = useSelector((state: RootState) => state.auth.user?.role);

  // Compose tab list based on role
  const tabs = useMemo<TabItem[]>(() => {
    if (userRole === "admin") return ADMIN_TABS;
    if (userRole === "employer") return EMPLOYER_TABS;
    return BASE_TABS;
  }, [userRole]);

  const isActive = (path: string) => pathname.startsWith(path);

  if (keyboardVisible) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          marginBottom: Math.max(insets.bottom, 10),
          marginTop: 4,
        },
      ]}
    >
      {tabs.map((tab) => {
        const active = isActive(tab.path);
        const iconColor  = active ? colors.purple : colors.textMuted;

        return (
          <Pressable
            key={tab.path}
            onPress={() => router.push(tab.path as any)}
            accessibilityLabel={tab.label}
            accessibilityRole="button"
            style={styles.tabItem}
          >
            <View
              style={[
                styles.iconWrapper,
                active && { backgroundColor: colors.purple10 },
              ]}
            >
              <MaterialIcons 
                name={active && tab.activeIcon ? tab.activeIcon : tab.icon} 
                size={22} 
                color={iconColor} 
              />
              {active && (
                <View style={[styles.activeDot, { backgroundColor: colors.purple }]} />
              )}
            </View>
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
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginHorizontal: 16,
    borderRadius: 24,
    justifyContent: "space-around",
    alignItems: "center",
    // Elevation / shadow so it feels elevated above content
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  activeDot: {
    position: "absolute",
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
