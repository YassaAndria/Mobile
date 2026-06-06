/* eslint-disable @typescript-eslint/no-explicit-any */
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useNavigation, useRouter } from "expo-router";
import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { isAxiosError, type AxiosResponse } from "axios";
import axiosInstance from "../../../src/api/axiosInstance";
import { useAppSelector } from "../../../src/store/hooks";
import { useTheme } from "../../../src/theme/ThemeContext";
import { typography } from "../../../src/theme/typography";

export interface JobType {
  _id: string;
  title: string;
  companyName: string;
  companyLogo: string;
  location: string;
  postedAt: string;
  description: string;
  projectType: string;
  salaryOrBudget: string;
  experienceLevel: string;
  tags: string[];
  isSaved?: boolean;
}

interface JobsApiResponse {
  status: string;
  results: number;
  data: {
    jobs: JobType[];
    totalPages: number;
    currentPage: number;
  };
}

export default function JobsBoardScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const { colors, isDark } = useTheme();
  const router       = useRouter();
  const navigation   = useNavigation();
  const [jobs, setJobs] = useState<JobType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedExperience, setSelectedExperience] = useState<string[]>([]);
  const [selectedBudget, setSelectedBudget] = useState("Any Budget");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortOption, setSortOption] = useState("newest");
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [showFilterBar, setShowFilterBar] = useState(false);

  // ── Reactive header: re-runs whenever showFilterBar or colors change ──────
  useLayoutEffect(() => {
    const canGoBack = navigation.canGoBack();
    navigation.setOptions({
      headerBackVisible: false,
      headerLeft: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingLeft: 5 }}>
          {canGoBack && (
            <Pressable onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </Pressable>
          )}
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>Jobs</Text>
          <Ionicons
            name={showFilterBar ? 'options' : 'options-outline'}
            size={22}
            color={showFilterBar ? colors.purple : colors.text}
            onPress={() => setShowFilterBar(v => !v)}
          />
        </View>
      ),
    });
  }, [navigation, showFilterBar, colors, router]);

  const fetchJobs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams({
        search: searchQuery,
        types: selectedTypes.join(","),
        experience: selectedExperience.join(","),
        budget: selectedBudget !== "Any Budget" ? selectedBudget : "",
        page: currentPage.toString(),
        sort: sortOption,
      });
      const response: AxiosResponse<JobsApiResponse> = await axiosInstance.get(`/jobs?${params.toString()}`);
      setJobs(response.data.data.jobs || []);
      setTotalPages(response.data.data.totalPages || 1);
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        setError(err.response?.data?.message || "Failed to fetch jobs. Please try again.");
      } else {
        setError("An unexpected error occurred.");
      }
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTypes, selectedExperience, selectedBudget, currentPage, sortOption]);

  const toggleFilter = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    setter((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const pageBg = colors.bg;

  const sortLabel =
    sortOption === "newest" ? "Newest" : sortOption === "oldest" ? "Oldest" : "Salary (High to Low)";

  const renderJob = ({ item }: { item: JobType }) => (
    <Pressable
      onPress={() => router.push(`/jobs/${item._id}`)}
      style={[
        styles.jobCard,
        { backgroundColor: colors.surface, borderColor: isDark ? "rgba(139,92,246,0.1)" : "rgba(139,92,246,0.05)" },
      ]}
    >
      <View style={[styles.jobTop, { borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16, flex: 1 }}>
          <Image source={{ uri: item.companyLogo || "https://via.placeholder.com/56" }} style={[styles.logo, { borderColor: colors.border }]} contentFit="cover" />
          <View style={{ flex: 1 }}>
            <Text style={[typography.h3, { color: colors.text }]}>{item.title}</Text>
            <Text style={[typography.bodySmall, { color: colors.textSubtle }]}>
              {item.companyName} • Posted {new Date(item.postedAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
        {user?.role === "freelancer" && (
          <MaterialIcons name={item.isSaved ? "bookmark" : "bookmark-border"} size={24} color={colors.textSubtle} />
        )}
      </View>
      <View style={styles.tags}>
        <Text style={[styles.tag1, { color: colors.text, backgroundColor: colors.surface2 }]}>{item.projectType}</Text>
        <Text style={[styles.tag2, { color: colors.purple }]}>{item.salaryOrBudget}</Text>
        <Text style={styles.tag3}>{item.experienceLevel}</Text>
      </View>
      <Text style={[typography.body, { color: colors.textSubtle, marginBottom: 24 }]} numberOfLines={2}>
        {item.description}
      </Text>
      <View style={styles.jobFoot}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {item.tags?.map((tag) => (
            <Text key={tag} style={[typography.caption, styles.smallTag, { color: colors.text, backgroundColor: colors.surface2 }]}>
              {tag}
            </Text>
          ))}
        </View>
        <Text style={{ color: colors.purple, fontWeight: "800", fontSize: 12 }}>View Details →</Text>
      </View>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: pageBg }}>
      {/* Stack.Screen is handled dynamically via useLayoutEffect above */}

      {/* ── Stealth Filter Chip Bar ── */}
      {showFilterBar && (
        <View style={[styles.filterBar, { borderBottomColor: colors.border }]}>
          {/* Project Type chips */}
          {['Freelance', 'Full-Time', 'Internship'].map((type) => {
            const active = selectedTypes.includes(type);
            return (
              <Pressable
                key={type}
                onPress={() => toggleFilter(setSelectedTypes, type)}
                style={[styles.chip, { backgroundColor: active ? colors.purple : colors.surface, borderColor: active ? colors.purple : colors.border }]}
              >
                <Text style={{ color: active ? '#FFF' : colors.text, fontSize: 12, fontWeight: active ? '700' : '500' }}>{type}</Text>
              </Pressable>
            );
          })}
          {/* Experience chips */}
          {['Entry', 'Mid', 'Expert'].map((level) => {
            const active = selectedExperience.includes(level);
            return (
              <Pressable
                key={level}
                onPress={() => toggleFilter(setSelectedExperience, level)}
                style={[styles.chip, { backgroundColor: active ? colors.purple : colors.surface, borderColor: active ? colors.purple : colors.border }]}
              >
                <Text style={{ color: active ? '#FFF' : colors.text, fontSize: 12, fontWeight: active ? '700' : '500' }}>{level}</Text>
              </Pressable>
            );
          })}
          {/* Active filter clear button */}
          {(selectedTypes.length > 0 || selectedExperience.length > 0) && (
            <Pressable
              onPress={() => { setSelectedTypes([]); setSelectedExperience([]); setCurrentPage(1); }}
              style={[styles.chip, { backgroundColor: 'transparent', borderColor: colors.border }]}
            >
              <Ionicons name="close-circle-outline" size={14} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, fontSize: 12, marginLeft: 4 }}>Clear</Text>
            </Pressable>
          )}
        </View>
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.heroPad}>
          <Text style={[typography.h1, { color: colors.text, marginBottom: 8 }]}>Find Your Next Project</Text>
          <Text style={[typography.body, { color: colors.textSubtle, marginBottom: 24 }]}>
            Discover freelance gigs and full-time opportunities.
          </Text>
          <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialIcons name="search" size={22} color={colors.textSubtle} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => {
                setCurrentPage(1);
                void fetchJobs();
              }}
              placeholder="Search jobs, skills, or companies..."
              placeholderTextColor={colors.textSubtle}
              style={{ flex: 1, marginLeft: 8, color: colors.text, fontWeight: "500" }}
            />
          </View>
        </View>

        <View style={styles.split}>
          <View style={{ flex: 1, paddingHorizontal: 16 }}>
            <View style={styles.listHead}>
              <Text style={[typography.h3, { color: colors.text }]}>{jobs.length} Projects Found</Text>
              <Pressable onPress={() => setIsSortMenuOpen(!isSortMenuOpen)} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={[typography.bodySmall, { color: colors.textMuted, fontWeight: "500" }]}>
                  Sort by: {sortLabel}
                </Text>
                {React.createElement(MaterialIcons, {
                  name: "expand-more",
                  size: 22,
                  color: colors.text,
                })}
              </Pressable>
            </View>
            {isSortMenuOpen && (
              <View style={[styles.sortMenu, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {[
                  ["newest", "Newest first"],
                  ["oldest", "Oldest first"],
                ].map(([val, label]) => (
                  <Pressable
                    key={val}
                    style={[styles.sortItem, sortOption === val && { backgroundColor: colors.purple10 }]}
                    onPress={() => {
                      setSortOption(val);
                      setIsSortMenuOpen(false);
                      setCurrentPage(1);
                    }}
                  >
                    <Text style={{ color: sortOption === val ? colors.purple : colors.text, fontWeight: sortOption === val ? "800" : "500" }}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {isLoading ? (
              <View style={[styles.stateBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <ActivityIndicator color={colors.purple} size="large" />
                <Text style={[typography.body, { color: colors.textSubtle, marginTop: 12, fontWeight: "500" }]}>Loading amazing projects...</Text>
              </View>
            ) : error ? (
              <View style={[styles.errBox, { backgroundColor: colors.errorBg, borderColor: colors.errorBorder }]}>
                <MaterialIcons name="error-outline" size={40} color={colors.errorText} />
                <Text style={[typography.body, { color: colors.errorText, fontWeight: "600", textAlign: "center", marginTop: 8 }]}>{error}</Text>
              </View>
            ) : jobs.length === 0 ? (
              <View style={[styles.stateBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <MaterialIcons name="search-off" size={48} color={colors.textMuted} />
                <Text style={[typography.body, { color: colors.textMuted, fontWeight: "500", marginTop: 8 }]}>No jobs found matching your filters.</Text>
              </View>
            ) : (
              <FlatList data={jobs} keyExtractor={(j) => j._id} renderItem={renderJob} scrollEnabled={false} />
            )}

            {totalPages > 1 && jobs.length > 0 && (
              <View style={styles.pagination}>
                <Pressable
                  disabled={currentPage === 1}
                  onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  style={[styles.pageBtn, { borderColor: colors.border, opacity: currentPage === 1 ? 0.5 : 1 }]}
                >
                  <MaterialIcons name="chevron-left" size={24} color={colors.purple} />
                </Pressable>
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                  <Pressable
                    key={pageNum}
                    onPress={() => setCurrentPage(pageNum)}
                    style={[
                      styles.pageBtn,
                      {
                        borderColor: colors.border,
                        backgroundColor: currentPage === pageNum ? colors.purple : "transparent",
                      },
                    ]}
                  >
                    <Text style={{ fontWeight: "800", color: currentPage === pageNum ? "#fff" : colors.text }}>{pageNum}</Text>
                  </Pressable>
                ))}
                <Pressable
                  disabled={currentPage === totalPages}
                  onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  style={[styles.pageBtn, { borderColor: colors.border, opacity: currentPage === totalPages ? 0.5 : 1 }]}
                >
                  <MaterialIcons name="chevron-right" size={24} color={colors.purple} />
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Filter chip bar ────────────────────────────────────────────────────
  filterBar: {
    flexDirection:    'row',
    flexWrap:         'wrap',
    gap:              8,
    paddingHorizontal: 16,
    paddingVertical:  10,
    borderBottomWidth: 1,
  },
  chip: {
    flexDirection:   'row',
    alignItems:      'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius:    20,
    borderWidth:     1,
  },
  // ── Content ───────────────────────────────────────────────────────────
  heroPad:   { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 },
  searchBox: { flexDirection: "row", alignItems: "center", borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14 },
  split:     { flexDirection: "column" },
  listHead:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sortMenu:  { borderRadius: 12, borderWidth: 1, overflow: "hidden", marginBottom: 12 },
  sortItem:  { padding: 16 },
  jobCard:   { borderRadius: 24, padding: 32, borderWidth: 1, marginBottom: 24 },
  jobTop:    { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  logo:      { width: 56, height: 56, borderRadius: 16, borderWidth: 2 },
  tags:      { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  tag1:      { fontSize: 12, fontWeight: "800", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  tag2:      { fontSize: 12, fontWeight: "800", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "rgba(139,92,246,0.1)", overflow: "hidden" },
  tag3:      { fontSize: 12, fontWeight: "800", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "#DCFCE7", color: "#15803D" },
  jobFoot:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  smallTag:  { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  stateBox:  { padding: 80, borderRadius: 24, alignItems: "center", borderWidth: 1 },
  errBox:    { padding: 40, alignItems: "center", borderRadius: 24, borderWidth: 1 },
  pagination: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 16 },
  pageBtn:   { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
