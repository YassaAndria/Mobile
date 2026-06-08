/* eslint-disable @typescript-eslint/no-explicit-any */
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import axiosInstance from "../../../src/api/axiosInstance";
import { useTheme } from "../../../src/theme/ThemeContext";
import { Button } from "../../../src/components/ui/Button";
import { typography } from "../../../src/theme/typography";

export default function ManageProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setIsLoading(true);
        const [jobRes, applicantsRes] = await Promise.all([
          axiosInstance.get(`/jobs/${id}`),
          axiosInstance.get(`/jobs/${id}/applicants`),
        ]);
        setProject(jobRes.data.data.job);
        setApplicants(applicantsRes.data.data.applicants || []);
      } catch {
        Toast.show({ type: "error", text1: "Failed to load project" });
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);

  const handleDelete = () => {
    Alert.alert("Delete project", "Are you sure? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setIsDeleting(true);
            await axiosInstance.delete(`/jobs/${id}`);
            Toast.show({ type: "success", text1: "Project deleted" });
            router.replace("/employer-dashboard");
          } catch {
            Toast.show({ type: "error", text1: "Failed to delete" });
            setIsDeleting(false);
          }
        },
      },
    ]);
  };

  if (isLoading || !project) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.purple} size="large" />
        <Text style={[typography.body, { color: colors.textSubtle, marginTop: 12 }]}>Loading project details...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 24 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <Pressable onPress={() => router.push("/employer-dashboard")} style={[styles.back, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MaterialIcons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[typography.h1, { color: colors.text }]}>{project.title}</Text>
          <Text style={[typography.bodySmall, { color: colors.textMuted, fontWeight: "500" }]}>Project Management Dashboard</Text>
        </View>
      </View>

      <Text style={[typography.h2, { color: colors.text, marginBottom: 16 }]}>Applicants ({applicants.length})</Text>
      {applicants.map((a, i) => (
        <View key={a._id || i} style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[typography.body, { color: colors.text, fontWeight: "700" }]}>{a.freelancerId?.fullName || "Applicant"}</Text>
          <Text style={[typography.bodySmall, { color: colors.textSubtle }]} numberOfLines={2}>
            {a.proposal || a.note || ""}
          </Text>
        </View>
      ))}

      <Button
        title="Edit Job"
        variant="primary"
        onPress={() => router.push(`/edit-project/${id}`)}
        style={{ marginTop: 24 }}
      />
      <Button
        title="Delete Project"
        variant="danger"
        onPress={handleDelete}
        isLoading={isDeleting}
        style={{ marginTop: 12 }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  back: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  row: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12, gap: 8 },
});
