/**
 * JobCard — mirrors web JobList JobCard for Saved page; uses same API paths and Redux updateProfile.
 */
import { MaterialIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import axiosInstance from "../api/axiosInstance";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { updateProfile } from "../store/slices/authSlice";
import { useTheme } from "../theme/ThemeContext";

export interface Job {
  id?: string;
  _id?: string;
  title: string;
  company: string;
  location: string;
  salary: {
    min: number;
    max: number;
    currency: string;
  };
  category: string;
  level: string;
  description: string;
  applicants: number;
  postedAt: string;
}

export const JobCard: React.FC<{ job: Job; isSavedPage?: boolean }> = ({ job, isSavedPage }) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { colors, isDark } = useTheme();
  const [isSaving, setIsSaving] = useState(false);

  const jobId = job._id || job.id;
  const isSaved = user?.savedProjects?.includes(jobId);

  const handleSaveJob = async () => {
    if (!jobId) return;
    try {
      setIsSaving(true);
      const res = await axiosInstance.post(`/users/toggle-save-project/${jobId}`);
      dispatch(updateProfile(res.data.data.user));
      Toast.show({ type: "success", text1: res.data.message || "Saved" });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error.response?.data?.message || "Failed to save job.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: isDark ? "#374151" : "#F3F4F6",
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>{job.title}</Text>
          <Text style={[styles.company, { color: isDark ? "#9CA3AF" : "#4B5563" }]}>{job.company}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: colors.purple10 }]}>
          <Text style={[styles.badgeText, { color: colors.purple }]}>{job.level}</Text>
        </View>
      </View>

      <Text style={[styles.desc, { color: colors.text }]} numberOfLines={2}>
        {job.description}
      </Text>

      <View style={styles.metaRow}>
        <Text style={[styles.meta, { color: isDark ? "#9CA3AF" : "#4B5563" }]}>📍 {job.location}</Text>
        <Text style={[styles.meta, { color: isDark ? "#9CA3AF" : "#4B5563" }]}>
          💰 {job.salary.currency}
          {job.salary.min}k - {job.salary.max}k
        </Text>
        <Text style={[styles.meta, { color: isDark ? "#9CA3AF" : "#4B5563" }]}>🏷️ {job.category}</Text>
      </View>

      <View style={[styles.footer, { borderTopColor: isDark ? "#374151" : "#E5E7EB" }]}>
        <Text style={[styles.applicants, { color: isDark ? "#9CA3AF" : "#6B7280" }]}>
          {job.applicants} Applicants
        </Text>
        {user?.role === "freelancer" && (
          <Pressable
            onPress={handleSaveJob}
            disabled={isSaving}
            style={[
              styles.saveBtn,
              isSavedPage && { backgroundColor: isDark ? "rgba(239,68,68,0.2)" : "#FEF2F2" },
              isSaved && !isSavedPage && { backgroundColor: isDark ? "rgba(34,197,94,0.2)" : "#DCFCE7" },
            ]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.purple} />
            ) : (
              <MaterialIcons
                name={isSavedPage ? "delete-outline" : isSaved ? "bookmark" : "bookmark-border"}
                size={22}
                color={isSavedPage ? "#EF4444" : isSaved ? "#16A34A" : "#6B7280"}
              />
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", gap: 16, marginBottom: 12 },
  headerText: { flex: 1 },
  title: { fontSize: 18, fontWeight: "700" },
  company: { fontSize: 14, marginTop: 4 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, alignSelf: "flex-start" },
  badgeText: { fontSize: 12, fontWeight: "600" },
  desc: { fontSize: 14, marginBottom: 12 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginBottom: 12 },
  meta: { fontSize: 14 },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
  },
  applicants: { fontSize: 12 },
  saveBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
});
