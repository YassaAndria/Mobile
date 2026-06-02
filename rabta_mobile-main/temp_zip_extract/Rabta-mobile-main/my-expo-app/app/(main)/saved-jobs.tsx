/* eslint-disable @typescript-eslint/no-explicit-any */
import { MaterialIcons } from "@expo/vector-icons";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRouter } from "expo-router";
import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import axiosInstance from "../../src/api/axiosInstance";
import { useAppSelector } from "../../src/store/hooks";
import { useTheme } from "../../src/theme/ThemeContext";
import { typography } from "../../src/theme/typography";

interface SavedJob {
  _id: string;
  title: string;
  companyName?: string;
  salaryOrBudget?: string;
  projectType?: string;
  location?: string;
}

export default function SavedJobsScreen() {
  const router      = useRouter();
  const navigation  = useNavigation();
  const { colors }  = useTheme();
  const user        = useAppSelector((s) => s.auth.user);

  const [jobs, setJobs]       = useState<SavedJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ── Native header with back arrow ─────────────────────────────────────────
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 5 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
          <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>
            Saved Jobs
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, router, colors]);

  // ── Fetch saved jobs using IDs from Redux user.savedProjects ──────────────
  useEffect(() => {
    const ids: string[] = user?.savedProjects ?? [];
    if (ids.length === 0) {
      setIsLoading(false);
      return;
    }

    (async () => {
      try {
        // Fetch all saved job details in parallel
        const results = await Promise.allSettled(
          ids.map((id) => axiosInstance.get(`/jobs/${id}`))
        );
        const loaded: SavedJob[] = [];
        for (const r of results) {
          if (r.status === "fulfilled") {
            const raw = r.value.data?.data?.job as any;
            if (!raw) continue;
            const pub = raw.publisherId || {};
            loaded.push({
              _id:            raw._id,
              title:          raw.title || "Untitled",
              companyName:    pub.companyName || pub.fullName || "Unknown",
              salaryOrBudget: raw.budgetOrSalary || "Negotiable",
              projectType:    (raw.jobType || "freelance").toUpperCase(),
              location:       pub.location || raw.location || "Remote",
            });
          }
        }
        setJobs(loaded);
      } catch {
        Toast.show({ type: "error", text1: "Failed to load saved jobs." });
      } finally {
        setIsLoading(false);
      }
    })();
  }, [user?.savedProjects]);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.purple} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <FlatList
        data={jobs}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="bookmark-border" size={52} color={colors.textMuted} />
            <Text style={[typography.body, { color: colors.textMuted, marginTop: 16, textAlign: "center" }]}>
              No saved jobs yet.{"\n"}Tap the bookmark icon on any job to save it.
            </Text>
            <Pressable
              onPress={() => router.push("/jobs")}
              style={[styles.browseBtn, { borderColor: colors.purple }]}
            >
              <Text style={{ color: colors.purple, fontWeight: "700" }}>Browse Jobs</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/jobs/${item._id}`)}
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[typography.h3, { color: colors.text }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[typography.bodySmall, { color: colors.textMuted, marginTop: 4 }]}>
                {item.companyName} · {item.location}
              </Text>
            </View>
            <View style={styles.meta}>
              <Text style={[styles.badge, { backgroundColor: colors.purple10, color: colors.purple }]}>
                {item.projectType}
              </Text>
              <Text style={[typography.bodySmall, { color: colors.purple, fontWeight: "700", marginTop: 6 }]}>
                {item.salaryOrBudget}
              </Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} style={{ marginTop: 4 }} />
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:      { flex: 1 },
  center:    { flex: 1, justifyContent: "center", alignItems: "center" },
  list:      { padding: 16, paddingBottom: 40 },
  empty:     { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 },
  browseBtn: { marginTop: 24, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24, borderWidth: 1.5 },
  card: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    padding:        20,
    borderRadius:   16,
    borderWidth:    1,
    marginBottom:   12,
  },
  meta:  { alignItems: "flex-end" },
  badge: { fontSize: 11, fontWeight: "800", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, overflow: "hidden" },
});
