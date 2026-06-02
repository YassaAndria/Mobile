/* eslint-disable @typescript-eslint/no-explicit-any */
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Toast from "react-native-toast-message";
import axiosInstance from "../../../src/api/axiosInstance";
import { useTheme } from "../../../src/theme/ThemeContext";
import { Button } from "../../../src/components/ui/Button";
import { typography } from "../../../src/theme/typography";

export default function EditProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const response = await axiosInstance.get(`/jobs/${id}`);
        const job = response.data.data.job;
        setTitle(job.title || "");
        setDescription(job.description || "");
      } catch {
        Toast.show({ type: "error", text1: "Failed to load job" });
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const save = async () => {
    try {
      setSaving(true);
      await axiosInstance.patch(`/jobs/${id}`, { title, description });
      Toast.show({ type: "success", text1: "Updated" });
      router.back();
    } catch (e: any) {
      Toast.show({ type: "error", text1: e.response?.data?.message || "Failed" });
    } finally {
      setSaving(false);
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
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 24 }}>
      <Text style={[typography.h1, { color: colors.text, marginBottom: 24 }]}>Edit Project</Text>
      <Text style={[typography.label, { color: colors.text, marginBottom: 8 }]}>Title</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
      />
      <Text style={[typography.label, { color: colors.text, marginTop: 16, marginBottom: 8 }]}>Description</Text>
      <TextInput
        multiline
        value={description}
        onChangeText={setDescription}
        style={[
          styles.input,
          { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface, minHeight: 160, textAlignVertical: "top" },
        ]}
      />
      <Button
        title="Save"
        variant="primary"
        onPress={save}
        isLoading={saving}
        style={{ marginTop: 24 }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16 },
});
