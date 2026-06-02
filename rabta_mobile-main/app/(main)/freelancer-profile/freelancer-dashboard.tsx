/* eslint-disable @typescript-eslint/no-explicit-any */
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useRouter } from "expo-router";
import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import axiosInstance from "../../../src/api/axiosInstance";
import { useTheme } from "../../../src/theme/ThemeContext";
import { typography } from "../../../src/theme/typography";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Application {
  id: string;
  title?: string;
  employer?: string;
  status?: string;
  appliedAt?: string;
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  pending:       { label: "Pending",       bg: "#FFF3CD", text: "#92400E", icon: "hourglass-empty" },
  "under review":{ label: "Under Review",  bg: "#DBEAFE", text: "#1D4ED8", icon: "visibility"      },
  reviewed:      { label: "Under Review",  bg: "#DBEAFE", text: "#1D4ED8", icon: "visibility"      },
  accepted:      { label: "Accepted",      bg: "#D1FAE5", text: "#065F46", icon: "check-circle"    },
  rejected:      { label: "Closed",        bg: "#F3F4F6", text: "#6B7280", icon: "cancel"          },
  closed:        { label: "Closed",        bg: "#F3F4F6", text: "#6B7280", icon: "cancel"          },
};
const getStatus = (s?: string) =>
  STATUS_CONFIG[(s ?? "").toLowerCase()] ?? { label: s || "Pending", bg: "#FFF3CD", text: "#92400E", icon: "hourglass-empty" };

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FreelancerDashboardScreen() {
  const router      = useRouter();
  const navigation  = useNavigation();
  const { colors, isDark } = useTheme();

  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [searchQuery, setSearchQuery]   = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // ── Native header: back arrow ───────────────────────────────────────────────
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 5 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
          <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>My Applications</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, router, colors]);

  // ── Fetch ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await axiosInstance.get("/jobs/applied");
        setApplications(res.data.data?.applications ?? []);
      } catch {
        Toast.show({ type: "error", text1: "Failed to load your applications." });
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // ── Derived stats ───────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:    applications.length,
    accepted: applications.filter(a => (a.status ?? "").toLowerCase() === "accepted").length,
    pending:  applications.filter(a => ["pending", "under review", "reviewed"].includes((a.status ?? "").toLowerCase())).length,
  }), [applications]);

  // ── Filtered list ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = applications;
    if (statusFilter !== "all") {
      list = list.filter(a => {
        const s = (a.status ?? "").toLowerCase();
        if (statusFilter === "pending")  return ["pending", "under review", "reviewed"].includes(s);
        if (statusFilter === "accepted") return s === "accepted";
        if (statusFilter === "closed")   return ["rejected", "closed"].includes(s);
        return true;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a =>
        (a.title ?? "").toLowerCase().includes(q) ||
        (a.employer ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [applications, statusFilter, searchQuery]);

  // ── Status filter chips ─────────────────────────────────────────────────────
  const FILTERS = [
    { key: "all",      label: "All"          },
    { key: "pending",  label: "In Progress"  },
    { key: "accepted", label: "Accepted"     },
    { key: "closed",   label: "Closed"       },
  ];

  // ── Render card ─────────────────────────────────────────────────────────────
  const renderCard = ({ item }: { item: Application }) => {
    const st = getStatus(item.status);
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Top row: title + status badge */}
        <View style={styles.cardTop}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={[typography.h3, { color: colors.text }]} numberOfLines={2}>
              {item.title || "Untitled Project"}
            </Text>
            <Text style={[typography.bodySmall, { color: colors.textMuted, marginTop: 3 }]}>
              {item.employer || "Unknown client"}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: st.bg }]}>
            <MaterialIcons name={st.icon as any} size={13} color={st.text} />
            <Text style={[styles.badgeText, { color: st.text }]}>{st.label}</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Bottom row: date + quick view */}
        <View style={styles.cardBottom}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <MaterialIcons name="calendar-today" size={14} color={colors.textMuted} />
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              Applied {formatDate(item.appliedAt)}
            </Text>
          </View>
          <Pressable
            onPress={() => item.id && router.push(`/jobs/${item.id}`)}
            style={[styles.viewBtn, { borderColor: colors.purple }]}
          >
            <Text style={{ color: colors.purple, fontSize: 12, fontWeight: "700" }}>View Job</Text>
            <MaterialIcons name="arrow-forward" size={13} color={colors.purple} />
          </Pressable>
        </View>
      </View>
    );
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.purple} size="large" />
        <Text style={[typography.body, { color: colors.textMuted, marginTop: 12 }]}>
          Loading your applications…
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      <View style={[styles.statsRow, { borderBottomColor: colors.border }]}>
        {[
          { label: "Total",    value: stats.total,    color: colors.text   },
          { label: "Active",   value: stats.pending,  color: "#1D4ED8"     },
          { label: "Accepted", value: stats.accepted, color: "#065F46"     },
        ].map(s => (
          <View key={s.label} style={styles.statItem}>
            <Text style={{ fontSize: 24, fontWeight: "800", color: s.color }}>{s.value}</Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>{s.label}</Text>
          </View>
        ))}
        <Pressable
          onPress={() => router.push("/jobs")}
          style={[styles.findBtn, { backgroundColor: colors.purple }]}
        >
          <Ionicons name="search" size={15} color="#FFF" />
          <Text style={{ color: "#FFF", fontSize: 12, fontWeight: "700" }}>Find Jobs</Text>
        </Pressable>
      </View>

      {/* ── Search + Filter bar ───────────────────────────────────────────── */}
      <View style={styles.searchRow}>
        {/* Search input */}
        <View style={[
          styles.searchWrap,
          { backgroundColor: isDark ? "#262626" : "#F5F5F5", borderColor: colors.border },
        ]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search title or company..."
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Filter button */}
        <Pressable
          onPress={() => {
            const keys = FILTERS.map(f => f.key);
            const next = keys[(keys.indexOf(statusFilter) + 1) % keys.length];
            setStatusFilter(next);
          }}
          style={[
            styles.filterBtn,
            {
              backgroundColor: statusFilter !== "all" ? colors.purple : (isDark ? "#262626" : "#F5F5F5"),
              borderColor:     statusFilter !== "all" ? colors.purple : colors.border,
            },
          ]}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={statusFilter !== "all" ? "#FFF" : colors.textMuted}
          />
        </Pressable>
      </View>

      {/* Active filter label — only shown when a filter is selected */}
      {statusFilter !== "all" && (
        <View style={styles.activeFilterRow}>
          <Text style={[typography.caption, { color: colors.textMuted }]}>Filter:</Text>
          {FILTERS.filter(f => f.key !== "all").map(f => (
            <Pressable
              key={f.key}
              onPress={() => setStatusFilter(f.key)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: statusFilter === f.key ? colors.purple : colors.surface,
                  borderColor:     statusFilter === f.key ? colors.purple : colors.border,
                },
              ]}
            >
              <Text style={{ fontSize: 11, fontWeight: "700", color: statusFilter === f.key ? "#FFF" : colors.textMuted }}>
                {f.label}
              </Text>
            </Pressable>
          ))}
          <Pressable onPress={() => setStatusFilter("all")} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </Pressable>
        </View>
      )}


      {/* ── Application list ───────────────────────────────────────────────── */}
      <FlatList
        data={filtered}
        keyExtractor={(item, i) => item.id || String(i)}
        contentContainerStyle={styles.list}
        renderItem={renderCard}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="assignment" size={52} color={colors.textMuted} />
            <Text style={[typography.body, { color: colors.textMuted, marginTop: 16, textAlign: "center" }]}>
              {searchQuery ? "No applications match your search." : "No applications yet.\nApply to jobs and track them here."}
            </Text>
          </View>
        }
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Stats
  statsRow: {
    flexDirection:  "row",
    alignItems:     "center",
    paddingHorizontal: 16,
    paddingVertical:   12,
    borderBottomWidth: 1,
    gap: 0,
  },
  statItem: { flex: 1, alignItems: "center" },
  findBtn: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            6,
    paddingHorizontal: 14,
    paddingVertical:    8,
    borderRadius:   20,
  },

  // Search + Filter row
  searchRow: {
    flexDirection:    "row",
    alignItems:       "center",
    gap:              10,
    marginHorizontal: 16,
    marginTop:        12,
    marginBottom:     6,
  },
  searchWrap: {
    flex:              1,
    flexDirection:     "row",
    alignItems:        "center",
    gap:               10,
    paddingHorizontal: 14,
    paddingVertical:   10,
    borderRadius:      12,
    borderWidth:       1,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: "500" },
  filterBtn: {
    width:        44,
    height:       44,
    borderRadius: 12,
    borderWidth:  1,
    alignItems:   "center",
    justifyContent: "center",
  },
  activeFilterRow: {
    flexDirection:    "row",
    alignItems:       "center",
    gap:              8,
    paddingHorizontal: 16,
    paddingBottom:     10,
    flexWrap:         "wrap",
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical:    5,
    borderRadius:      20,
    borderWidth:        1,
  },

  // List
  list: { padding: 16, paddingBottom: 40 },

  // Card
  card: {
    borderRadius: 16,
    borderWidth:  1,
    marginBottom: 12,
    overflow:     "hidden",
  },
  cardTop: {
    flexDirection:  "row",
    alignItems:     "flex-start",
    padding:        16,
    paddingBottom:  12,
  },
  badge: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            5,
    paddingHorizontal: 10,
    paddingVertical:    5,
    borderRadius:   20,
  },
  badgeText: { fontSize: 11, fontWeight: "800" },
  divider:   { height: 1, marginHorizontal: 16 },
  cardBottom: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical:   12,
  },
  viewBtn: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            4,
    paddingHorizontal: 14,
    paddingVertical:    6,
    borderRadius:   20,
    borderWidth:    1.5,
  },

  // Empty
  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
});
