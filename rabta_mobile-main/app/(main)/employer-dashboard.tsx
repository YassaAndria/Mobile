/* eslint-disable @typescript-eslint/no-explicit-any */
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import axiosInstance from "../../src/api/axiosInstance";
import { useSelector } from "react-redux";
import type { RootState } from "../../src/store/store";
import { useTheme } from "../../src/theme/ThemeContext";
import { Button } from "../../src/components/ui/Button";
import { typography } from "../../src/theme/typography";

export default function EmployerDashboardScreen() {
  const router = useRouter();
  const user = useSelector((s: RootState) => s.auth.user);
  const { colors, isDark } = useTheme();
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const response = await axiosInstance.get("/jobs");
        const allJobs = response.data.data.jobs || [];
        const myJobs = allJobs.filter(
          (job: any) => job.publisherId?._id === user?._id || job.publisherId === user?._id,
        );
        setJobs(myJobs);
      } catch {
        /* ignore */
      } finally {
        setIsLoading(false);
      }
    })();
  }, [user?._id]);

  const activeProjects = jobs.length;
  const totalApplicants = jobs.reduce((sum, job) => sum + (job.applicantsCount || 0), 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={styles.top}>
        <View>
          <Text style={[typography.h1, { color: colors.text }]}>Employer Workspace</Text>
          <Text style={[typography.body, { color: colors.textSubtle, fontWeight: "500", marginTop: 4 }]}>
            Here is an overview of your hiring activity and projects.
          </Text>
        </View>
        <Button
          title="Post New Job"
          onPress={() => router.push("/post-job")}
          size="sm"
          icon={<MaterialIcons name="add" size={20} color="#fff" />}
        />
      </View>

      <Text style={[typography.h3, { color: colors.text, marginBottom: 16 }]}>
        <MaterialIcons name="bar-chart" size={22} color={colors.purple} /> Projects Overview
      </Text>
      <View style={styles.stats}>
        {[
          { icon: "work" as const, val: isLoading ? "-" : activeProjects, label: "Active Projects", color: colors.purple },
          { icon: "groups" as const, val: isLoading ? "-" : totalApplicants, label: "Total Applicants", color: colors.text },
          { icon: "event-available" as const, val: "0", label: "Interviews", color: colors.successText },
        ].map((s) => (
          <View key={s.label} style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.statIcon, { backgroundColor: `${s.color}22` }]}>
              <MaterialIcons name={s.icon} size={24} color={s.color} />
            </View>
            <Text style={[styles.statNum, { color: colors.text }]}>{s.val}</Text>
            <Text style={[typography.caption, { color: colors.textSubtle, fontWeight: "800", letterSpacing: 1 }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      <Text style={[typography.h3, { color: colors.text, marginTop: 24, marginBottom: 16 }]}>Your Listings</Text>
      {isLoading ? (
        <ActivityIndicator color={colors.purple} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(j) => j._id}
          scrollEnabled={false}
          ListEmptyComponent={<Text style={[typography.body, { color: colors.textSubtle, marginTop: 16 }]}>No jobs posted yet.</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.jobRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push(`/manage-project/${item._id}`)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[typography.body, { color: colors.text, fontWeight: "800" }]} numberOfLines={1}>{item.title}</Text>
                <Text style={[typography.caption, { color: colors.textSubtle, marginTop: 4 }]}>{item.applicantsCount || 0} applicants</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={colors.textSubtle} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16 },
  top: { marginBottom: 32, gap: 16 },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  statCard: { flex: 1, minWidth: 140, borderRadius: 16, borderWidth: 1, padding: 24, alignItems: "center" },
  statIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  statNum: { fontSize: 32, fontWeight: "900", marginBottom: 4 },
  jobRow: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
});
