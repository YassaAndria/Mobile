/* eslint-disable @typescript-eslint/no-explicit-any */
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { isAxiosError, type AxiosResponse } from "axios";
import axiosInstance from "../../../src/api/axiosInstance";
import { useAppDispatch, useAppSelector } from "../../../src/store/hooks";
import { updateProfile } from "../../../src/store/slices/authSlice";
import { useTheme } from "../../../src/theme/ThemeContext";
import { Button } from "../../../src/components/ui/Button";
import { typography } from "../../../src/theme/typography";

export interface JobDetailType {
  _id: string;
  title: string;
  companyName: string;
  companyLogo: string;
  location: string;
  postedAt: string;
  projectType: string;
  salaryOrBudget: string;
  tags: string[];
  aboutJob: string;
  responsibilities: string[];
  requiredSkills: string[];
  companyDescription: string;
  matchPercentage: number;
  publisherId?: any;
}

interface JobDetailApiResponse {
  status: string;
  data: {
    job: JobDetailType;
    hasApplied?: boolean;
    matchPercentage?: number;
  };
}

export default function JobDetailsScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const { colors, isDark } = useTheme();

  const [job, setJob] = useState<JobDetailType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [applicationNote, setApplicationNote] = useState("");
  const [cvFile, setCvFile] = useState<{ uri: string; name: string; mimeType?: string | null } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchJobDetails = async () => {
      try {
        setIsLoading(true);
        setErr(null);
        const response: AxiosResponse<JobDetailApiResponse> = await axiosInstance.get(`/jobs/${jobId}`);
        const rawJob = response.data.data.job as any;
        const publisher = rawJob.publisherId || {};
        const formattedJob: JobDetailType = {
          _id: rawJob._id,
          title: rawJob.title || "Untitled Job",
          companyName: publisher.companyName || publisher.fullName || "Unknown Company",
          companyLogo: publisher.avatar || "",
          location: publisher.location || rawJob.location || "Remote",
          postedAt: rawJob.createdAt || new Date().toISOString(),
          projectType: (rawJob.jobType || "freelance").replace("_", "-").toUpperCase(),
          salaryOrBudget: rawJob.budgetOrSalary || "Negotiable",
          tags: rawJob.requiredSkills || [],
          aboutJob: rawJob.description || "No description provided.",
          responsibilities: rawJob.responsibilities || [],
          requiredSkills: rawJob.requiredSkills || [],
          companyDescription: publisher.industry || "No company description available.",
          matchPercentage: (response.data.data as any).matchPercentage || 85,
          publisherId: rawJob.publisherId,
        };
        setJob(formattedJob);
        setHasApplied((response.data.data as any).hasApplied === true);
      } catch (e: unknown) {
        if (isAxiosError(e)) {
          setErr(e.response?.data?.message || "Failed to load job details.");
        } else {
          setErr("An unexpected error occurred.");
        }
      } finally {
        setIsLoading(false);
      }
    };
    if (jobId) void fetchJobDetails();
  }, [jobId]);

  const isSaved = user?.savedProjects?.includes(job?._id || jobId);

  const handleSaveJob = async () => {
    if (isSaved) {
      Toast.show({ type: "info", text1: "Already Saved", text2: "This job is already in your saved list." });
      return;
    }
    const targetId = job?._id || jobId;
    if (!targetId) return;
    try {
      setIsSaving(true);
      const res = await axiosInstance.post(`/users/toggle-save-project/${targetId}`);
      dispatch(updateProfile(res.data.data.user));
      Toast.show({
        type: "success",
        text1: "Saved",
        text2: "Job has been added to your saved list.",
      });
    } catch (error: any) {
      Toast.show({ type: "error", text1: error.response?.data?.message || "Failed to save job." });
    } finally {
      setIsSaving(false);
    }
  };

  const pickCv = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"] });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    setCvFile({ uri: a.uri, name: a.name, mimeType: a.mimeType });
  };

  const handleApply = async () => {
    try {
      setIsSending(true);
      const formData = new FormData();
      formData.append("note", applicationNote);
      if (cvFile) {
        formData.append("cv", { uri: cvFile.uri, name: cvFile.name, type: cvFile.mimeType || "application/pdf" } as any);
      }
      await axiosInstance.post(`/jobs/${jobId}/apply`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      Toast.show({ type: "success", text1: "Application submitted!", text2: "Redirecting to your dashboard..." });
      setHasApplied(true);
      setIsModalOpen(false);
      setApplicationNote("");
      setCvFile(null);
      // Navigate to freelancer dashboard after a brief delay so the toast is visible
      setTimeout(() => router.push("/freelancer-profile/freelancer-dashboard"), 1200);
    } catch (error: any) {
      Toast.show({ type: "error", text1: error.response?.data?.message || "Failed to send application." });
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.purple} size="large" />
        <Text style={[typography.body, { color: colors.textSubtle, marginTop: 12 }]}>Loading job details...</Text>
      </View>
    );
  }

  if (err || !job) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg, padding: 24 }]}>
        <MaterialIcons name="error-outline" size={48} color={colors.errorText} />
        <Text style={[typography.h3, { color: colors.errorText, marginTop: 12 }]}>{err || "Job not found"}</Text>
        <Button
          title="Back to Jobs"
          variant="ghost"
          onPress={() => router.push("/jobs")}
          icon={<MaterialIcons name="arrow-back" size={18} color={colors.purple} />}
          style={{ marginTop: 24 }}
        />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Pressable onPress={() => router.push("/jobs")} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 24 }}>
        <MaterialIcons name="arrow-back" size={20} color={colors.textSubtle} />
        <Text style={[typography.bodySmall, { color: colors.textSubtle }]}>Back to Jobs</Text>
      </Pressable>

      <View style={{ gap: 32 }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            <Text style={[typography.caption, styles.badgeGreen]}>OPEN</Text>
            <Text style={[typography.caption, styles.badgePur, { color: colors.purple, backgroundColor: colors.purple10 }]}>{job.projectType}</Text>
            <Text style={[typography.caption, styles.badgeGray, { color: colors.textMuted, backgroundColor: colors.surface2 }]}>{job.location}</Text>
          </View>
          <Text style={[typography.h1, { color: colors.text }]}>{job.title}</Text>
          <Text style={[typography.bodySmall, { color: colors.textSubtle, marginTop: 8 }]}>
            Posted {new Date(job.postedAt).toLocaleDateString()} • {job.matchPercentage || 24} proposals received
          </Text>

          <View style={[styles.hr, { backgroundColor: colors.border }]} />

          <Text style={[typography.h3, { color: colors.text, marginBottom: 16 }]}>Job Description</Text>
          <Text style={[typography.body, { color: colors.textSubtle, lineHeight: 24 }]}>{job.aboutJob}</Text>

          <Text style={[typography.h3, { color: colors.text, marginTop: 24, marginBottom: 16 }]}>Key Responsibilities</Text>
          {job.responsibilities.map((resp, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
              <MaterialIcons name="check-circle" size={22} color={colors.purple} />
              <Text style={[typography.body, { color: colors.textSubtle, flex: 1 }]}>{resp}</Text>
            </View>
          ))}

          <Text style={[typography.h3, { color: colors.text, marginTop: 24, marginBottom: 16 }]}>Required Skills</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {job.tags.map((skill) => (
              <Text key={skill} style={[typography.label, styles.skill, { backgroundColor: colors.purpleSoft, color: colors.purple }]}>
                {skill}
              </Text>
            ))}
          </View>

          <View style={[styles.clientCard, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
            <View style={[styles.cliAva, { backgroundColor: colors.purple }]}>
              {job.companyLogo ? (
                <Image source={{ uri: job.companyLogo }} style={{ width: "100%", height: "100%" }} />
              ) : (
                <Text style={[typography.h2, { color: "#fff" }]}>{job.companyName.charAt(0)}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.h3, { color: colors.text }]}>{job.companyName}</Text>
              <Text style={[typography.bodySmall, { color: colors.textSubtle, marginTop: 4 }]}>
                {job.companyDescription} • {job.location}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.side, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[typography.h3, { color: colors.text, marginBottom: 24 }]}>Job Summary</Text>
          <View style={styles.sumRow}>
            <MaterialIcons name="payments" size={24} color={colors.purple} style={{ padding: 12, backgroundColor: colors.purple10, borderRadius: 12 }} />
            <View>
              <Text style={[typography.caption, { color: colors.textSubtle, letterSpacing: 1 }]}>SALARY RANGE</Text>
              <Text style={[typography.body, { color: colors.text, fontWeight: "700" }]}>{job.salaryOrBudget}</Text>
            </View>
          </View>
          {user?.role === "freelancer" && (
            <View style={{ gap: 12, marginTop: 16 }}>
              <TouchableOpacity
                onPress={() => !hasApplied && setIsModalOpen(true)}
                disabled={hasApplied}
                activeOpacity={0.7}
                style={{
                  width: "100%",
                  backgroundColor: hasApplied 
                    ? (isDark ? "rgba(107, 114, 128, 0.15)" : "#F3F4F6") 
                    : (isDark ? "rgba(139, 92, 246, 0.15)" : "#F3E8FF"),
                  borderRadius: 10,
                  paddingVertical: 14,
                  paddingHorizontal: 20,
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  justifyContent: "space-between",
                  opacity: hasApplied ? 0.7 : 1,
                }}
              >
                <View style={{ flexDirection: "row-reverse", alignItems: "center" }}>
                  <MaterialIcons 
                    name={hasApplied ? "check-circle" : "work"} 
                    size={20} 
                    color={hasApplied ? colors.textMuted : colors.purple} 
                    style={{ marginLeft: 12 }} 
                  />
                  <Text style={{ 
                    fontSize: 16, 
                    fontWeight: "700", 
                    color: hasApplied ? colors.textMuted : colors.purpleDark 
                  }}>
                    {hasApplied ? "Applied" : "Apply Now"}
                  </Text>
                </View>
                {!hasApplied && (
                  <MaterialIcons name="chevron-left" size={20} color={colors.purple} style={{ opacity: 0.5 }} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveJob}
                disabled={isSaving || isSaved}
                activeOpacity={0.7}
                style={{
                  width: "100%",
                  backgroundColor: isDark ? "rgba(139, 92, 246, 0.05)" : "#FAF5FF",
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(139, 92, 246, 0.2)" : "#E9D5FF",
                  paddingVertical: 14,
                  paddingHorizontal: 20,
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  justifyContent: "space-between",
                  opacity: (isSaving || isSaved) ? 0.7 : 1,
                }}
              >
                <View style={{ flexDirection: "row-reverse", alignItems: "center" }}>
                  <MaterialIcons 
                    name={isSaved ? "bookmark" : "bookmark-border"} 
                    size={20} 
                    color={colors.purple} 
                    style={{ marginLeft: 12 }} 
                  />
                  <Text style={{ fontSize: 16, fontWeight: "700", color: colors.purpleDark }}>
                    {isSaved ? "Saved" : "Save Job"}
                  </Text>
                </View>
                {!isSaved && (
                  <MaterialIcons name="chevron-left" size={20} color={colors.purple} style={{ opacity: 0.5 }} />
                )}
              </TouchableOpacity>
            </View>
          )}
          {user?.role === "employer" &&
            job.publisherId &&
            String(user?._id) === String(job.publisherId._id ?? job.publisherId) && (
            <Button
              title="View Applicants"
              variant="primary"
              onPress={() => router.push(`/manage-project/${jobId}`)}
              icon={<MaterialIcons name="group" size={18} color="#fff" />}
            />
          )}
        </View>
      </View>

      <Modal visible={isModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.modalHead, { borderBottomColor: colors.border }]}>
              <Text style={[typography.h3, { color: colors.text, flex: 1 }]}>Apply for {job.title}</Text>
              <Pressable onPress={() => setIsModalOpen(false)}>
                <MaterialIcons name="close" size={24} color={colors.textSubtle} />
              </Pressable>
            </View>
            <View style={{ padding: 24 }}>
              <Text style={[typography.label, { color: colors.text, marginBottom: 8 }]}>Upload CV / Resume *</Text>
              <Pressable style={[styles.uploadZone, { borderColor: colors.borderStrong, backgroundColor: colors.surface2 }]} onPress={pickCv}>
                <MaterialIcons name="cloud-upload" size={40} color={colors.textSubtle} />
                <Text style={[typography.body, { color: colors.textSubtle, marginTop: 8 }]}>Tap to upload</Text>
                {cvFile ? <Text style={[typography.bodySmall, { color: colors.purple, marginTop: 8 }]} numberOfLines={1}>{cvFile.name}</Text> : null}
              </Pressable>

              <Text style={[typography.label, { color: colors.text, marginTop: 24, marginBottom: 8 }]}>Cover Letter / Notes</Text>
              <TextInput
                multiline
                numberOfLines={4}
                value={applicationNote}
                onChangeText={setApplicationNote}
                placeholder="Why are you a great fit for this role?"
                placeholderTextColor={colors.textSubtle}
                style={[
                  styles.area,
                  { color: colors.text, borderColor: colors.borderStrong, backgroundColor: colors.surface2 },
                ]}
              />
            </View>
            <View style={[styles.modalActions, { borderTopColor: colors.border, backgroundColor: colors.surface2 }]}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => setIsModalOpen(false)}
              />
              <Button
                title="Send Application"
                variant="primary"
                onPress={handleApply}
                disabled={!cvFile || isSending}
                isLoading={isSending}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: 24, paddingBottom: 48 },
  badgeGreen: { backgroundColor: "#DCFCE7", color: "#15803D", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  badgePur: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  badgeGray: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  hr: { height: 1, marginVertical: 24 },
  skill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  clientCard: { flexDirection: "row", gap: 20, padding: 24, borderRadius: 16, borderWidth: 1, marginTop: 24 },
  cliAva: { width: 64, height: 64, borderRadius: 32, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  side: { borderRadius: 16, borderWidth: 1, padding: 24 },
  sumRow: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 24 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 16 },
  modalBox: { borderRadius: 16, borderWidth: 1, overflow: "hidden", maxWidth: 520, width: "100%", alignSelf: "center" },
  modalHead: { flexDirection: "row", alignItems: "center", padding: 24, borderBottomWidth: 1 },
  uploadZone: { borderWidth: 2, borderStyle: "dashed", borderRadius: 12, padding: 32, alignItems: "center" },
  area: { borderWidth: 1, borderRadius: 12, padding: 16, minHeight: 100, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12, padding: 24, borderTopWidth: 1 },
});
