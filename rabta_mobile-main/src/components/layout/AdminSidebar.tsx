import { MaterialIcons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useDispatch } from "react-redux";
import { logout } from "../../store/slices/authSlice";
import { useTheme } from "../../theme/ThemeContext";

const links: { path: string; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { path: "/admin/overview",      label: "Overview",      icon: "show-chart"    },
  { path: "/admin/users",         label: "Users",         icon: "people"        },
  { path: "/admin/jobs",          label: "Jobs",          icon: "work"          },
  { path: "/admin/groups",        label: "Communities",   icon: "layers"        },
  { path: "/admin/add-admin",     label: "Add Admin",     icon: "person-add"    },
  { path: "/admin/verifications", label: "Verifications", icon: "verified-user" },
  { path: "/admin/logs",          label: "Activity Logs", icon: "history"       },
];

export function AdminSidebar({ closeMenu }: { closeMenu?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();
  const { mode, toggleTheme, isDark, colors } = useTheme();

  const bgColor     = colors.bgAlt;
  const borderColor = colors.borderStrong;
  const textPrimary = colors.text;
  const textMuted   = colors.textMuted;
  const textActive  = colors.purple;
  const activeBg    = colors.purple10;
  const surfaceBg   = colors.surface2;

  const handleNav = (path: string) => {
    router.push(path as any);
    if (closeMenu) closeMenu();
  };

  return (
    <View style={[styles.side, { backgroundColor: bgColor, borderRightColor: borderColor, width: 280 }]}>
      {/* Logo */}
      <View style={styles.logoRow}>
        <Text style={[styles.logo, { color: textActive }]}>Rabta Admin</Text>
      </View>

      {/* Nav Links */}
      <View style={{ flex: 1, marginTop: 24, gap: 8 }}>
        {links.map((l) => {
          const active = pathname === l.path;
          return (
            <Pressable
              key={l.path}
              onPress={() => handleNav(l.path)}
              style={[
                styles.link,
                active
                  ? { backgroundColor: activeBg, borderLeftColor: textActive, borderLeftWidth: 3 }
                  : { borderLeftColor: "transparent", borderLeftWidth: 3 },
              ]}
            >
              <MaterialIcons name={l.icon} size={22} color={active ? textActive : textMuted} />
              <Text
                style={{ color: active ? textActive : textPrimary, fontWeight: active ? "700" : "500", flexShrink: 1 }}
                numberOfLines={1}
              >
                {l.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Theme Toggle */}
      <Pressable
        onPress={toggleTheme}
        style={[styles.themeToggle, { backgroundColor: surfaceBg, borderColor }]}
      >
        <MaterialIcons
          name={isDark ? "light-mode" : "dark-mode"}
          size={20}
          color={textActive}
        />
        <Text style={[styles.themeToggleText, { color: textPrimary }]}>
          {isDark ? "Light Mode" : "Dark Mode"}
        </Text>
        <View style={[styles.togglePill, { backgroundColor: isDark ? colors.surface : colors.border }]}>
          <View
            style={[
              styles.toggleKnob,
              {
                backgroundColor: textActive,
                alignSelf: isDark ? "flex-end" : "flex-start",
              },
            ]}
          />
        </View>
      </Pressable>

      {/* Footer */}
      <View style={[styles.foot, { borderTopColor: borderColor }]}>
        <Pressable
          style={styles.footBtn}
          onPress={() => {
            router.replace("/chats");
            if (closeMenu) closeMenu();
          }}
        >
          <MaterialIcons name="home" size={20} color={textMuted} />
          <Text style={{ color: textMuted }} numberOfLines={1}>Return to App</Text>
        </Pressable>

        <Pressable
          style={styles.footBtn}
          onPress={() => {
            dispatch(logout());
            router.replace("/login");
          }}
        >
          <MaterialIcons name="logout" size={20} color="#EF4444" />
          <Text style={{ color: "#EF4444" }} numberOfLines={1}>Logout</Text>
        </Pressable>

        {closeMenu && (
          <Pressable style={[styles.footBtn, { marginTop: 16 }]} onPress={closeMenu}>
            <MaterialIcons name="close" size={24} color={textMuted} />
            <Text style={{ color: textMuted, fontWeight: "600" }} numberOfLines={1}>Close Menu</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  side: {
    borderRightWidth: 1,
    paddingVertical: 24,
    paddingHorizontal: 16,
    minHeight: "100%",
  },
  logoRow: {
    height: 32,
    justifyContent: "center",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingLeft: 16,
  },
  logo: {
    fontSize: 20,
    fontWeight: "900",
  },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  themeToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginHorizontal: 0,
    marginBottom: 8,
  },
  themeToggleText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  togglePill: {
    width: 36,
    height: 20,
    borderRadius: 10,
    padding: 2,
    justifyContent: "center",
  },
  toggleKnob: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  foot: {
    borderTopWidth: 1,
    paddingTop: 16,
    gap: 8,
  },
  footBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
});
