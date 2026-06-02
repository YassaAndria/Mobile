import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import { useTheme } from "../../src/theme/ThemeContext";
import { typography } from "../../src/theme/typography";

export default function PrivacyScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [privacySettings, setPrivacySettings] = useState({
    showOnlineStatus: true,
    allowDirectMessages: false,
  });

  const toggleSetting = (key: keyof typeof privacySettings) => {
    setPrivacySettings((prev) => ({ ...prev, [key]: !prev[key] }));
    Toast.show({ type: "success", text1: "Privacy setting updated" });
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <View style={styles.top}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textSubtle} />
        </Pressable>
        <Text style={[typography.h2, { color: colors.text }]}>Privacy</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[typography.caption, { color: colors.textSubtle, letterSpacing: 2, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.04)" }]}>PROFILE VISIBILITY</Text>
        <Pressable
          style={[styles.row, { borderBottomColor: colors.border }]}
          onPress={() => toggleSetting("showOnlineStatus")}
        >
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text style={[typography.body, { color: colors.text, fontWeight: "600" }]}>Show Online Status</Text>
            <Text style={[typography.caption, { color: colors.textSubtle, marginTop: 4, lineHeight: 18 }]}>
              Let connections see when you are active on Rabta.
            </Text>
          </View>
          <View style={[styles.toggleTrack, { backgroundColor: privacySettings.showOnlineStatus ? colors.purple : colors.borderStrong }]}>
            <View style={[styles.knob, privacySettings.showOnlineStatus && { transform: [{ translateX: 22 }] }]} />
          </View>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 24, maxWidth: 672, width: "100%", alignSelf: "center" },
  top: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 32 },
  back: { padding: 8, borderRadius: 999 },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1 },
  toggleTrack: { width: 48, height: 28, borderRadius: 14, padding: 3, justifyContent: "center" },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 2 },
});
