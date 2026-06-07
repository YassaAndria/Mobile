/* eslint-disable @typescript-eslint/no-explicit-any */
import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import axiosInstance from "../../src/api/axiosInstance";
import { useTheme } from "../../src/theme/ThemeContext";
import { typography } from "../../src/theme/typography";

export default function NotificationsScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
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

  const handleNotificationPress = async (item: any) => {
    // Mark as read locally or call mark read on this notification if needed
    try {
      if (item.chatId) {
        router.push({
          pathname: "/ChatWindowScreen",
          params: {
            chatId: item.chatId,
            chatName: item.title || "Chat",
            isGroup: item.type === "communityMentions" ? "true" : "false",
          },
        } as any);
      }
    } catch (err) {
      console.log("[NotificationsScreen] Press navigation error:", err);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.purple} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[typography.h2, { color: colors.text }]}>Notifications</Text>
        <Pressable onPress={markRead} style={styles.markReadBtn}>
          <Text style={{ color: colors.purple, fontWeight: "700", fontSize: 14 }}>Mark all read</Text>
        </Pressable>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item, i) => item._id || String(i)}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 30 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="notifications-none" size={48} color={colors.textMuted} />
            <Text style={[typography.body, { color: colors.textMuted, textAlign: "center", marginTop: 12 }]}>
              No notifications yet.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isUnread = !item.read;
          const isChat = item.type === "chatMessages";
          const isGroup = item.type === "communityMentions";
          
          let iconName = "notifications";
          if (isChat) iconName = "chat-bubble";
          else if (isGroup) iconName = "group";

          return (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => handleNotificationPress(item)}
              disabled={!item.chatId}
              style={[
                styles.card,
                { 
                  backgroundColor: colors.surface, 
                  borderColor: isUnread ? colors.purple : colors.border,
                  borderLeftWidth: isUnread ? 4 : 1,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isDark ? 0.2 : 0.04,
                  shadowRadius: 6,
                  elevation: 2,
                },
              ]}
            >
              <View style={[
                styles.iconContainer, 
                { backgroundColor: isUnread ? "rgba(124, 58, 237, 0.08)" : "rgba(0,0,0,0.03)" }
              ]}>
                <MaterialIcons 
                  name={iconName as any} 
                  size={20} 
                  color={isUnread ? colors.purple : colors.textMuted} 
                />
              </View>
              
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                  <Text style={[typography.body, { color: colors.text, fontWeight: "700", fontSize: 15 }]}>
                    {item.title || "Notification"}
                  </Text>
                  {isUnread && (
                    <View style={[styles.unreadBadge, { backgroundColor: colors.purple }]} />
                  )}
                </View>
                <Text style={[typography.bodySmall, { color: colors.textMuted, lineHeight: 18 }]}>
                  {item.body || item.message || JSON.stringify(item)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { 
    paddingHorizontal: 20, 
    paddingVertical: 16, 
    borderBottomWidth: 1, 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center" 
  },
  markReadBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  card: { 
    flexDirection: "row", 
    alignItems: "center", 
    padding: 14, 
    borderRadius: 14, 
    borderWidth: 1, 
    marginBottom: 10,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 80,
  }
});
