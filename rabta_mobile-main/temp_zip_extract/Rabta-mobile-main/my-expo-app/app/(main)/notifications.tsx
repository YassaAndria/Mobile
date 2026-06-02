/* eslint-disable @typescript-eslint/no-explicit-any */
import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import axiosInstance from "../../src/api/axiosInstance";
import { useTheme } from "../../src/theme/ThemeContext";
import { typography } from "../../src/theme/typography";

export default function NotificationsScreen() {
  const { colors, isDark } = useTheme();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await axiosInstance.get("/notifications");
      setItems(res.data.data?.notifications || res.data.data || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const markRead = async () => {
    try {
      await axiosInstance.patch("/notifications/read", {});
      Toast.show({ type: "success", text1: "Marked as read" });
      void load();
    } catch (e: any) {
      Toast.show({ type: "error", text1: e.response?.data?.message || "Failed" });
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.purple} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[typography.h2, { color: colors.text }]}>Notifications</Text>
        <Pressable onPress={markRead}>
          <Text style={{ color: colors.purple, fontWeight: "700" }}>Mark all read</Text>
        </Pressable>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item, i) => item._id || String(i)}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={[typography.body, { color: colors.textMuted, textAlign: "center", marginTop: 40 }]}>No notifications.</Text>}
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <MaterialIcons name="notifications" size={22} color={colors.purple} />
            <Text style={[typography.bodySmall, { color: colors.text, flex: 1, marginLeft: 12 }]}>{item.message || item.title || JSON.stringify(item)}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { padding: 20, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  card: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
});
