/* eslint-disable @typescript-eslint/no-explicit-any */
import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import axiosInstance from "../../src/api/axiosInstance";
import { useTheme } from "../../src/theme/ThemeContext";
import { typography } from "../../src/theme/typography";

export default function GroupsScreen() {
  const { colors, isDark } = useTheme();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await axiosInstance.get("/groups");
        setGroups(res.data.data?.communities ?? []);
      } catch {
        setGroups([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.purple} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6" }]}>
        <Text style={[typography.h2, { color: colors.text }]}>Groups</Text>
        <Text style={[typography.body, { color: colors.textMuted }]}>Communities on Rabta</Text>
      </View>
      <FlatList
        data={groups}
        keyExtractor={(item, i) => item._id || String(i)}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={[typography.body, { color: colors.textMuted, textAlign: "center", marginTop: 40 }]}>No groups found.</Text>}
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <MaterialIcons name="groups" size={24} color={colors.purple} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[typography.body, { color: colors.text, fontWeight: "700" }]}>{item.name || "Community"}</Text>
              {item.description ? (
                <Text style={[typography.bodySmall, { color: colors.textMuted, marginTop: 4 }]} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { padding: 20, borderBottomWidth: 1 },
  card: { flexDirection: "row", padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12, alignItems: "center" },
});
