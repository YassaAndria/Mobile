/* eslint-disable @typescript-eslint/no-explicit-any */
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import axiosInstance from "../../../src/api/axiosInstance";
import { useAppDispatch } from "../../../src/store/hooks";
import { updateProfile } from "../../../src/store/slices/authSlice";
import { useTheme } from "../../../src/theme/ThemeContext";

export default function FreelancerProfileViewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors, isDark } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const response = await axiosInstance.get(`/users/${id}`);
        setUser(response.data.data.user);
      } catch {
        Toast.show({ type: "error", text1: "Failed to load profile" });
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const toggleSave = async () => {
    try {
      setSaving(true);
      const res = await axiosInstance.post(`/users/toggle-save-freelancer/${id}`);
      dispatch(updateProfile(res.data.data.user));
      Toast.show({ type: "success", text1: res.data.message });
    } catch (e: any) {
      Toast.show({ type: "error", text1: e.response?.data?.message || "Failed" });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.purple} />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 24 }}>
      <Pressable onPress={() => router.back()} style={{ marginBottom: 16 }}>
        <Text style={{ color: colors.purple, fontWeight: "700" }}>← Back</Text>
      </Pressable>
      <View style={{ alignItems: "center", marginBottom: 24 }}>
        <View style={[styles.avatar, { backgroundColor: colors.purple }]}>
          {user.avatar ? (
            <Image source={{ uri: user.avatar }} style={{ width: "100%", height: "100%" }} />
          ) : (
            <Text style={{ color: "#fff", fontSize: 32, fontWeight: "900" }}>{user.fullName?.charAt(0)}</Text>
          )}
        </View>
        <Text style={[styles.name, { color: colors.text }]}>{user.fullName}</Text>
        <Text style={{ color: colors.purple, fontWeight: "600" }}>{user.jobTitle}</Text>
      </View>
      <Pressable style={[styles.btn, { backgroundColor: colors.purple }]} onPress={toggleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "800" }}>Toggle Save</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  avatar: { width: 96, height: 96, borderRadius: 48, overflow: "hidden", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  name: { fontSize: 24, fontWeight: "900" },
  btn: { padding: 16, borderRadius: 12, alignItems: "center" },
});
