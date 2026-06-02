/* eslint-disable @typescript-eslint/no-explicit-any */
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import axiosInstance from "../../src/api/axiosInstance";
import { useTheme } from "../../src/theme/ThemeContext";
import { Button } from "../../src/components/ui/Button";
import { typography } from "../../src/theme/typography";

export default function FreelancerDashboardScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [applications, setApplications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const response = await axiosInstance.get("/jobs/applied");
        setApplications(response.data.data.applications);
      } catch {
        Toast.show({ type: "error", text1: "Failed to load your applications." });
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const statusColor = (status: string) => {
    if (status === "Pending") return { bg: colors.surface2, text: colors.textSubtle };
    if (status === "Reviewed") return { bg: colors.purple10, text: colors.purple };
    if (status === "Accepted") return { bg: colors.successBg, text: colors.successText };
    return { bg: colors.surface, text: colors.textMuted };
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={styles.headRow}>
        <View>
          <Text style={[typography.h1, { color: colors.text }]}>Freelancer Dashboard</Text>
          <Text style={[typography.body, { color: colors.textSubtle, fontWeight: "500", marginTop: 4 }]}>
            Manage your job applications and track your success.
          </Text>
        </View>
        <Button
          title="Find More Jobs"
          onPress={() => router.push("/jobs")}
          size="sm"
          icon={<MaterialIcons name="search" size={18} color="#fff" />}
        />
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.cardHead, { borderBottomColor: colors.border }]}>
          <MaterialIcons name="work" size={22} color={colors.purple} />
          <Text style={[typography.h3, { color: colors.text }]}>Applied Projects ({applications.length})</Text>
        </View>
        {isLoading ? (
          <ActivityIndicator style={{ margin: 40 }} color={colors.purple} />
        ) : applications.length === 0 ? (
          <View style={styles.empty}>
            <MaterialIcons name="assignment" size={40} color={colors.textMuted} />
            <Text style={[typography.body, { color: colors.textSubtle, marginTop: 12 }]}>You haven&apos;t applied to any projects yet.</Text>
          </View>
        ) : (
          <FlatList
            data={applications}
            keyExtractor={(item, i) => item._id || String(i)}
            scrollEnabled={false}
            renderItem={({ item }) => {
              const st = statusColor(item.status || "Pending");
              return (
                <Pressable style={[styles.row, { borderBottomColor: colors.border }]} onPress={() => item.jobId && router.push(`/jobs/${item.jobId}`)}>
                  <Text style={[styles.cell, { color: colors.text, fontWeight: "700", flex: 2 }]} numberOfLines={1}>
                    {item.jobTitle || "Project"}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: st.bg }]}>
                    <Text style={{ color: st.text, fontSize: 12, fontWeight: "800" }}>{item.status || "Pending"}</Text>
                  </View>
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16 },
  headRow: { marginBottom: 32, gap: 16 },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 8, padding: 24, borderBottomWidth: 1 },
  empty: { padding: 48, alignItems: "center" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1 },
  cell: { fontSize: 14 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
});
