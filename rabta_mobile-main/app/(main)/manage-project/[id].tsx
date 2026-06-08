/* eslint-disable @typescript-eslint/no-explicit-any */
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import axiosInstance from "../../../src/api/axiosInstance";
import { useTheme } from "../../../src/theme/ThemeContext";
import { Button } from "../../../src/components/ui/Button";
import { typography } from "../../../src/theme/typography";
import { MatchScoreBadge } from "../../../src/components/shared/MatchScoreBadge";

export default function ManageProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortByScore, setSortByScore] = useState(false);
  const [reloadingApplicantId, setReloadingApplicantId] = useState<string | null>(null);

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

  const handleToggleStatus = async () => {
    try {
      const newStatus = project.status === 'closed' ? 'open' : 'closed';
      await axiosInstance.patch(`/jobs/${id}`, { status: newStatus });
      setProject({ ...project, status: newStatus });
      Toast.show({ type: 'success', text1: `Job marked as ${newStatus}` });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to update job status' });
    }
  };

  const handleReEvaluateMatch = async (applicantUserId: string) => {
    try {
      setReloadingApplicantId(applicantUserId);
      const res = await axiosInstance.post(`/jobs/${id}/applicants/${applicantUserId}/re-evaluate`);
      const { matchScore, matchReason } = res.data.data;
      setApplicants(prev => prev.map(app => {
        const appUserId = app.userId?._id || app.userId;
        if (appUserId === applicantUserId) return { ...app, matchScore, matchReason };
        return app;
      }));
      Toast.show({ type: 'success', text1: 'Match score updated!' });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to re-evaluate match' });
    } finally {
      setReloadingApplicantId(null);
    }
  };

  if (isLoading || !project) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.purple} size="large" />
        <Text style={[typography.body, { color: colors.textSubtle, marginTop: 12 }]}>Loading project details...</Text>
      </View>
    );
  }

  const sortedApplicants = [...applicants].sort((a, b) => {
    if (sortByScore) {
      const scoreA = a.matchScore || 0;
      const scoreB = b.matchScore || 0;
      return scoreB - scoreA;
    }
    return new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime();
  });

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 24, paddingBottom: 60 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <Pressable onPress={() => router.push("/employer-dashboard")} style={[styles.back, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MaterialIcons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[typography.h1, { color: colors.text }]} numberOfLines={1}>{project.title}</Text>
          </View>
          <Text style={[typography.bodySmall, { color: colors.textMuted, fontWeight: "500", marginTop: 4 }]}>Project Management Dashboard</Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[typography.h3, { color: colors.text, marginBottom: 8 }]}>Details</Text>
        <Text style={[typography.body, { color: colors.textSubtle, lineHeight: 22 }]}>{project.description}</Text>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
          <Button
            title="Edit Job"
            variant="secondary"
            onPress={() => router.push(`/edit-project/${id}`)}
            style={{ flex: 1 }}
          />
          <Button
            title={project.status === 'closed' ? 'Reopen Job' : 'Close Job'}
            variant="outline"
            onPress={handleToggleStatus}
            style={{ flex: 1 }}
          />
          <Button
            title="Delete"
            variant="danger"
            onPress={handleDelete}
            isLoading={isDeleting}
            style={{ flex: 1 }}
          />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Text style={[typography.h3, { color: colors.text }]}>Applicants ({applicants.length})</Text>
          {applicants.length > 0 && (
            <Pressable 
              onPress={() => setSortByScore(!sortByScore)}
              style={[
                styles.sortBtn, 
                { 
                  backgroundColor: sortByScore ? `${colors.purple}20` : colors.surface2,
                  borderColor: sortByScore ? `${colors.purple}50` : colors.border
                }
              ]}
            >
              <MaterialIcons name="sort" size={16} color={sortByScore ? colors.purple : colors.textSubtle} />
              <Text style={[typography.caption, { color: sortByScore ? colors.purple : colors.textSubtle, fontWeight: 'bold' }]}>
                Sort by Match
              </Text>
            </Pressable>
          )}
        </View>

        {applicants.length === 0 ? (
          <Text style={[typography.body, { color: colors.textSubtle, textAlign: 'center', padding: 24 }]}>
            No applicants yet.
          </Text>
        ) : (
          sortedApplicants.map((applicant: any) => {
            const user = applicant.userId;
            if (!user) return null;
            
            return (
              <View key={applicant._id || user._id} style={[styles.applicantRow, { borderBottomColor: colors.border }]}>
                <View style={styles.applicantHeader}>
                  <View style={[styles.avatar, { backgroundColor: `${colors.purple}20` }]}>
                    {user.avatar ? (
                      <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
                    ) : (
                      <Text style={[typography.h3, { color: colors.purple }]}>{user.fullName?.charAt(0) || '?'}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.body, { color: colors.text, fontWeight: "700" }]}>{user.fullName}</Text>
                    <Text style={[typography.caption, { color: colors.textSubtle }]}>{user.jobTitle || 'Freelancer'}</Text>
                  </View>
                </View>
                
                <View style={styles.applicantActions}>
                  <View style={{ alignItems: 'flex-start' }}>
                    <MatchScoreBadge 
                      score={applicant.matchScore} 
                      reason={applicant.matchReason} 
                      isReloading={reloadingApplicantId === (applicant.userId?._id || applicant.userId)}
                      onReload={() => handleReEvaluateMatch(applicant.userId?._id || applicant.userId)}
                    />
                    <Text style={[typography.caption, { color: colors.textSubtle, marginTop: 4, marginLeft: 4 }]}>
                      Applied {new Date(applicant.appliedAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Button
                    title="View Profile"
                    size="sm"
                    variant="secondary"
                    onPress={() => router.push(`/freelancer-profile/${user._id}`)}
                    style={{ marginTop: 12, width: '100%' }}
                  />
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  back: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  card: { padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  applicantRow: { paddingVertical: 16, borderBottomWidth: 1 },
  applicantHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  applicantActions: { marginTop: 4 },
});
