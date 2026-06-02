/* eslint-disable @typescript-eslint/no-explicit-any */
import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator, FlatList, StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { listCommunities } from "../../src/api/community";
import { mapCommunityFromApi } from "../../src/utils/community";
import { normalizeId } from "../../src/utils/chatMessage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../src/theme/ThemeContext";
import { typography } from "../../src/theme/typography";

export default function GroupsScreen() {
  const { colors, isDark } = useTheme();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("user");
        const uid = stored
          ? normalizeId(JSON.parse(stored)._id ?? JSON.parse(stored).id)
          : "";
        const res = await listCommunities();
        const raw = res.data.data?.communities ?? [];
        setGroups(raw.map((c: Record<string, unknown>) => mapCommunityFromApi(c, uid)));
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
          <TouchableOpacity
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => {
              router.push({
                pathname: '/ChatWindowScreen',
                params: {
                  chatId: item.chatId,
                  chatName: item.name || 'Community',
                  isGroup: 'true',
                  communityId: item._id,
                },
              } as never);
            }}
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
          </TouchableOpacity>
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
