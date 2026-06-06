/* eslint-disable @typescript-eslint/no-explicit-any */
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import axiosInstance from "../../src/api/axiosInstance";
import { JobCard, type Job } from "../../src/components/JobList";
import { useAppDispatch, useAppSelector } from "../../src/store/hooks";
import { updateProfile } from "../../src/store/slices/authSlice";
import { useTheme } from "../../src/theme/ThemeContext";
import { Button } from "../../src/components/ui/Button";
import { typography } from "../../src/theme/typography";

interface SavedFreelancer {
  _id: string;
  fullName: string;
  avatar?: string;
  jobTitle?: string;
  skills?: string[];
}

interface SavedJob {
  _id: string;
  title?: string;
  description?: string;
  jobType?: string;
  budgetOrSalary?: string;
  requiredSkills?: string[];
  location?: string;
  createdAt?: string;
  applicants?: unknown[];
  publisherId?: { companyName?: string };
}

const EmptyState = ({ icon, heading, subtext, colors, isDark }: any) => (
  <View
    style={[
      styles.empty,
      { backgroundColor: colors.surface, borderColor: colors.border },
    ]}
  >
    <View style={[styles.emptyIcon, { backgroundColor: colors.surface2 }]}>
      <MaterialIcons name={icon} size={40} color={colors.textSubtle} />
    </View>
    <Text style={[typography.h3, { color: colors.text, marginBottom: 8 }]}>{heading}</Text>
    <Text style={[typography.body, { color: colors.textSubtle, textAlign: "center", lineHeight: 20, maxWidth: 280 }]}>{subtext}</Text>
  </View>
);

export default function BookmarksScreen() {
  const { user } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const isFreelancer = user?.role === "freelancer";
  const isEmployer = user?.role === "employer";

  const [savedFreelancers, setSavedFreelancers] = useState<SavedFreelancer[]>([]);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const savedProjectsCount = user?.savedProjects?.length || 0;
  const savedFreelancersCount = user?.savedFreelancers?.length || 0;

  useEffect(() => {
    if (!user?._id) return;
    (async () => {
      try {
        setIsLoading(true);
        setFetchError(null);
        const res = await axiosInstance.get("/users/saved-items");
        const items = res.data.data.savedItems ?? [];
        if (user.role === "employer") setSavedFreelancers(items);
        else setSavedJobs(items);
      } catch {
        setFetchError("Failed to load your saved items. Please check your connection and try again.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [user?._id, user?.role, savedProjectsCount, savedFreelancersCount]);

  const handleClearAll = () => {
    Alert.alert("Clear all", "Are you sure you want to clear all saved items?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          try {
            setIsLoading(true);
            const res = await axiosInstance.delete("/users/saved-items/clear");
            dispatch(updateProfile(res.data.data.user));
            Toast.show({ type: "success", text1: res.data.message });
            if (isEmployer) setSavedFreelancers([]);
            if (isFreelancer) setSavedJobs([]);
          } catch (error: any) {
            Toast.show({ type: "error", text1: error.response?.data?.message || "Failed to clear." });
          } finally {
            setIsLoading(false);
          }
        },
      },
    ]);
  };

  const handleRemoveFreelancer = async (freelancerId: string) => {
    try {
      const res = await axiosInstance.post(`/users/toggle-save-freelancer/${freelancerId}`);
      dispatch(updateProfile(res.data.data.user));
      Toast.show({ type: "success", text1: "Freelancer removed from saved list." });
    } catch (error: any) {
      Toast.show({ type: "error", text1: error.response?.data?.message || "Failed to remove." });
    }
  };

  const toJobCardProps = (item: SavedJob): Job => {
    if (!item) {
      return {
        id: "",
        title: "Untitled Job",
        company: "Unknown Company",
        location: "Remote",
        salary: { min: 0, max: 0, currency: "$" },
        category: "General",
        level: "Freelance",
        description: "",
        applicants: 0,
        postedAt: "",
      };
    }
    return {
      id: item._id,
      title: item.title || "Untitled Job",
      company: item.publisherId?.companyName || "Unknown Company",
      location: item.location || "Remote",
      salary: {
        min: parseInt(item.budgetOrSalary || "0", 10) || 0,
        max: parseInt(item.budgetOrSalary || "0", 10) || 0,
        currency: "$",
      },
      category: item.requiredSkills?.[0] || "General",
      level: item.jobType || "Freelance",
      description: item.description || "",
      applicants: item.applicants?.length || 0,
      postedAt: item.createdAt || "",
    };
  };

  const activeTabName = isFreelancer ? "Saved Projects" : isEmployer ? "Saved Talents" : "Saved Items";
  const isEmpty = isEmployer ? savedFreelancers.length === 0 : savedJobs.length === 0;

  const renderFreelancerCard = (freelancer: SavedFreelancer) => (
    <View
      key={freelancer._id}
      style={[
        styles.fCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={[styles.fAvatar, { backgroundColor: colors.purple }]}>
        {freelancer.avatar ? (
          <Image source={{ uri: freelancer.avatar }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
        ) : (
          <Text style={[typography.h3, { color: "#fff" }]}>
            {freelancer.fullName?.substring(0, 2).toUpperCase()}
          </Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>{freelancer.fullName}</Text>
        <Text style={{ fontSize: 11, fontWeight: "600", color: colors.purple, marginTop: 2 }}>{freelancer.jobTitle || "Freelancer"}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          {(freelancer.skills || []).slice(0, 3).map((skill, index) => (
            <View key={index} style={[styles.skill, { backgroundColor: colors.purpleSoft }]}>
              <Text style={{ color: colors.purple, fontSize: 12, fontWeight: "700" }}>{skill}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <Button
          title="Remove"
          variant="danger"
          size="sm"
          onPress={() => handleRemoveFreelancer(freelancer._id)}
          icon={<MaterialIcons name="delete-outline" size={18} color={colors.errorText} />}
        />
        <Button
          title="View Profile"
          variant="outline"
          size="sm"
          onPress={() => router.push(`/freelancer-profile/${freelancer._id}`)}
        />
      </View>
    </View>
  );

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <View style={styles.head}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <MaterialIcons name="bookmark" size={28} color={colors.purple} />
          <Text style={[typography.h1, { color: colors.text }]}>Saved Items</Text>
        </View>
        <Text style={[typography.body, { color: colors.textMuted, fontStyle: "italic" }]}>Items you&apos;ve bookmarked for later.</Text>
      </View>

      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        <Text style={{ color: colors.purple, fontWeight: "700", borderBottomWidth: 2, borderBottomColor: colors.purple, paddingBottom: 12 }}>
          {activeTabName}
        </Text>
        {!isEmpty && !isLoading && !fetchError && (
          <Button
            title="Clear All Saved"
            variant="secondary"
            size="sm"
            onPress={handleClearAll}
            icon={<MaterialIcons name="delete-sweep" size={18} color={colors.errorText} />}
            textStyle={{ color: colors.errorText }}
          />
        )}
      </View>

      {isLoading && (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.purple} size="large" />
        </View>
      )}

      {!isLoading && fetchError && (
        <View style={[styles.errBox, { backgroundColor: colors.errorBg, borderColor: colors.errorBorder }]}>
          <MaterialIcons name="error-outline" size={40} color={colors.errorText} />
          <Text style={[typography.body, { color: colors.errorText, fontWeight: "700", marginTop: 8 }]}>Something went wrong</Text>
          <Text style={[typography.caption, { color: colors.errorText, marginTop: 4 }]}>{fetchError}</Text>
        </View>
      )}

      {!isLoading && !fetchError && isEmpty && isEmployer && (
        <EmptyState
          icon="person-search"
          heading="No saved talents yet"
          subtext="You haven't saved any freelancers. Explore profiles and click the save icon to bookmark talents for later."
          colors={colors}
          isDark={isDark}
        />
      )}

      {!isLoading && !fetchError && isEmpty && isFreelancer && (
        <EmptyState
          icon="work-outline"
          heading="No saved projects yet"
          subtext="You haven't bookmarked any projects. Browse jobs and save them to apply later."
          colors={colors}
          isDark={isDark}
        />
      )}

      {!isLoading && !fetchError && isEmpty && !isEmployer && !isFreelancer && (
        <EmptyState
          icon="bookmark-border"
          heading="No saved items yet"
          subtext="There are no bookmarked items under this account."
          colors={colors}
          isDark={isDark}
        />
      )}

      {!isLoading && !fetchError && !isEmpty && (
        <View style={{ gap: 16, paddingBottom: 32 }}>
          {isEmployer && savedFreelancers.filter(item => item !== null && item !== undefined).map(renderFreelancerCard)}
          {isFreelancer && savedJobs.filter(item => item !== null && item !== undefined).map((item) => (
            <JobCard key={item._id} job={toJobCardProps(item)} isSavedPage />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 24, maxWidth: 640, width: "100%", alignSelf: "center" },
  head: { marginBottom: 32 },
  tabs: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24, borderBottomWidth: 1 },
  loader: { paddingVertical: 80, alignItems: "center" },
  errBox: { padding: 32, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  empty: { borderRadius: 24, padding: 48, borderWidth: 1, borderStyle: "dashed", alignItems: "center", marginTop: 32 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  fCard: { flexDirection: "row", flexWrap: "wrap", padding: 24, borderRadius: 12, borderWidth: 1, gap: 16, alignItems: "center" },
  fAvatar: { width: 64, height: 64, borderRadius: 32, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  skill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
});
