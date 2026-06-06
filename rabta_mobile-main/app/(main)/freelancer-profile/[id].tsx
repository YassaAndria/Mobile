/* eslint-disable @typescript-eslint/no-explicit-any */
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Toast from "react-native-toast-message";
import { useSelector } from "react-redux";
import axiosInstance from "../../../src/api/axiosInstance";
import { useAppDispatch } from "../../../src/store/hooks";
import { updateProfile } from "../../../src/store/slices/authSlice";
import type { RootState } from "../../../src/store/store";
import { useTheme } from "../../../src/theme/ThemeContext";
import { Button } from "../../../src/components/ui/Button";
import { typography } from "../../../src/theme/typography";

export default function FreelancerProfileViewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors, isDark } = useTheme();
  
  const currentUser = useSelector((s: RootState) => s.auth.user);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get(`/users/${id}`);
        setUser(response.data.data.user);
      } catch {
        Toast.show({ type: "error", text1: "Failed to load profile" });
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const isSaved = currentUser?.savedFreelancers?.some(
    (fid: any) => fid.toString() === id || fid === id || (fid?._id && fid._id.toString() === id)
  );

  const toggleSave = async () => {
    try {
      setSaving(true);
      const res = await axiosInstance.post(`/users/toggle-save-freelancer/${id}`);
      dispatch(updateProfile(res.data.data.user));
      Toast.show({ type: "success", text1: res.data.message });
    } catch (e: any) {
      Toast.show({ type: "error", text1: e.response?.data?.message || "Failed to update saved freelancers" });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "??";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  };

  if (loading || !user) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.purple} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Freelancer Profile",
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={toggleSave} disabled={saving} style={{ marginRight: 8 }}>
              {saving ? (
                <ActivityIndicator color={colors.purple} size="small" />
              ) : (
                <MaterialIcons
                  name={isSaved ? "star" : "star-border"}
                  size={26}
                  color={isSaved ? "#F59E0B" : colors.text}
                />
              )}
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.cols}>
        <View style={[styles.card, styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.bigAvatar, { backgroundColor: colors.purple }]}>
            {user.avatar ? (
              <Image source={{ uri: user.avatar }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
            ) : (
              <Text style={styles.bigAvatarText}>{getInitials(user.fullName)}</Text>
            )}
          </View>
          <Text style={[typography.h2, { color: colors.text, marginBottom: 4, textAlign: 'center' }]}>{user.fullName}</Text>
          <Text style={[typography.body, { color: colors.purple, fontWeight: "600", marginBottom: 16, textAlign: 'center' }]}>
            {user.jobTitle || "Freelancer"}
          </Text>

          {user.location && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 }}>
              <MaterialIcons name="location-on" size={16} color={colors.purple} />
              <Text style={[typography.bodySmall, { color: colors.textSubtle }]}>{user.location}</Text>
            </View>
          )}

          {user.email && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <MaterialIcons name="email" size={16} color={colors.textMuted} />
              <Text style={[typography.bodySmall, { color: colors.textSubtle }]}>{user.email}</Text>
            </View>
          )}

          {user.phoneNumber && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 }}>
              <MaterialIcons name="phone" size={16} color={colors.textMuted} />
              <Text style={[typography.bodySmall, { color: colors.textSubtle }]}>{user.phoneNumber}</Text>
            </View>
          )}

          <View style={styles.socialRow}>
            {(user.links || []).map((link: any, index: number) => (
              <Pressable
                key={index}
                onPress={() => link.url && Linking.openURL(link.url)}
                style={[styles.socialBtn, { borderColor: colors.border, backgroundColor: colors.surface2 }]}
              >
                <MaterialIcons name="link" size={18} color="#6B7280" />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[typography.h3, { color: colors.text, marginBottom: 12 }]}>About Me</Text>
          <View style={[styles.underline, { backgroundColor: colors.purple }]} />
          <Text style={[styles.bio, { color: colors.text, lineHeight: 22 }]}>
            {user.bio || user.about || user.aboutMe || "No bio provided by this freelancer."}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[typography.h3, { color: colors.text, marginBottom: 12 }]}>Technical Skills</Text>
          <View style={styles.skills}>
            {(user.skills || []).map((skill: string, index: number) => (
              <View key={index} style={[styles.skill, { backgroundColor: colors.purpleSoft }]}>
                <Text style={{ color: colors.purple, fontSize: 12, fontWeight: "700" }}>{skill}</Text>
              </View>
            ))}
            {(!user.skills || user.skills.length === 0) && (
              <Text style={[typography.caption, { color: colors.textMuted, fontStyle: "italic" }]}>No skills listed</Text>
            )}
          </View>
        </View>

        <View style={{ gap: 16 }}>
          <Text style={[typography.h3, { color: colors.text, paddingHorizontal: 8, marginBottom: 4 }]}>Featured Projects</Text>
          <View style={[styles.underline, { backgroundColor: colors.purple, marginLeft: 8, marginBottom: 8 }]} />
          
          {(user.projects || []).length > 0 ? (
            (user.projects || []).map((project: any, index: number) => (
              <View
                key={index}
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={[typography.h3, { color: colors.text, marginBottom: 8 }]}>{project.title}</Text>
                <Text style={[typography.bodySmall, { color: colors.textSubtle, lineHeight: 22 }]}>{project.description}</Text>
                <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
                  {project.viewLink ? (
                    <Button
                      title="View Project"
                      size="sm"
                      onPress={() => Linking.openURL(project.viewLink)}
                    />
                  ) : null}
                  {project.githubLink ? (
                    <Button
                      title="GitHub"
                      variant="outline"
                      size="sm"
                      onPress={() => Linking.openURL(project.githubLink)}
                    />
                  ) : null}
                </View>
              </View>
            ))
          ) : (
            <Text style={[typography.body, { textAlign: "center", color: colors.textMuted, fontStyle: "italic", paddingVertical: 20 }]}>
              No projects added yet.
            </Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, paddingBottom: 48 },
  cols: { gap: 24 },
  card: { borderRadius: 12, padding: 24, borderWidth: 1, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  headerCard: { alignItems: "center" },
  bigAvatar: { width: 100, height: 100, borderRadius: 50, overflow: "hidden", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  bigAvatarText: { color: "#fff", fontSize: 32, fontWeight: "900" },
  socialRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  socialBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  underline: { width: 32, height: 3, borderRadius: 2, marginBottom: 16 },
  skills: { flexDirection: "row", flexWrap: "wrap", gap: 8, width: "100%" },
  skill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  bio: { lineHeight: 22 },
});
