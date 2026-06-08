/* eslint-disable @typescript-eslint/no-explicit-any */
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import React from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSelector } from "react-redux";
import { Button } from "../../src/components/ui/Button";
import type { RootState } from "../../src/store/store";
import { useTheme } from "../../src/theme/ThemeContext";
import { typography } from "../../src/theme/typography";

function FreelancerProfileBody({ user, colors, isDark, router }: any) {
  const getInitials = (name: string) => {
    if (!name) return '??';
    const parts = name.trim().split(' ').filter(p => p.length > 0);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <View style={styles.cols}>
        <View style={[styles.leftCol, { flex: 1 }]}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.bigAvatar, { backgroundColor: colors.purple }]}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
              ) : (
                <Text style={styles.bigAvatarText}>{getInitials(user?.fullName || "")}</Text>
              )}
            </View>
            <Text style={[typography.h2, { color: colors.text, marginBottom: 4 }]}>{user?.fullName || "User Name"}</Text>
            <Text style={[typography.body, { color: colors.purple, fontWeight: "600", marginBottom: 24 }]}>{user?.jobTitle || "Front-End Engineer"}</Text>
            <View style={styles.socialRow}>
              {(user?.links || []).map((link: any, index: number) => (
                <Pressable
                  key={index}
                  onPress={() => link.url && Linking.openURL(link.url)}
                  style={[styles.socialBtn, { borderColor: colors.border, backgroundColor: colors.surface2 }]}
                >
                  <MaterialIcons name="link" size={18} color="#6B7280" />
                </Pressable>
              ))}
            </View>
            {/* Elegant RTL Action Buttons */}
            {[
              { title: "Edit Profile", icon: "edit", route: "/edit-profile" },
              { title: "My Dashboard", icon: "dashboard", route: "/freelancer-profile/freelancer-dashboard" },
              { title: "Saved Jobs", icon: "bookmark", route: "/bookmarks" },
            ].map((btn, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => router.push(btn.route as any)}
                activeOpacity={0.7}
                style={{
                  width: "100%",
                  marginBottom: 12,
                  backgroundColor: isDark ? "rgba(139, 92, 246, 0.15)" : "#F3E8FF",
                  borderRadius: 10,
                  paddingVertical: 14,
                  paddingHorizontal: 20,
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flexDirection: "row-reverse", alignItems: "center" }}>
                  <MaterialIcons name={btn.icon as any} size={20} color={colors.purple} style={{ marginLeft: 12 }} />
                  <Text style={{ fontSize: 16, fontWeight: "700", color: colors.purpleDark }}>
                    {btn.title}
                  </Text>
                </View>
                <MaterialIcons name="chevron-left" size={20} color={colors.purple} style={{ opacity: 0.5 }} />
              </TouchableOpacity>
            ))}
            {(user?.email || user?.phoneNumber) && (
              <View style={{
                width: '100%',
                marginTop: 16,
                gap: 10,
              }}>
                {user?.email && (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: colors.surface2,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 10,
                    width: '100%',
                  }}>
                    <MaterialIcons name="email" size={18} color={colors.purple} />
                    <Text style={[typography.body, { color: colors.text, flex: 1 }]}>
                      {user.email}
                    </Text>
                  </View>
                )}
                {user?.phoneNumber && (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: colors.surface2,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 10,
                    width: '100%',
                  }}>
                    <MaterialIcons name="phone" size={18} color={colors.purple} />
                    <Text style={[typography.body, { color: colors.text, flex: 1 }]}>
                      {user.phoneNumber}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[typography.h3, { color: colors.text, marginBottom: 12 }]}>Technical Skills</Text>
            <View style={styles.skills}>
              {(user?.skills || []).map((skill: string, index: number) => (
                <View key={index} style={[styles.skill, { backgroundColor: colors.purpleSoft }]}>
                  <Text style={{ color: colors.purple, fontSize: 12, fontWeight: "700" }}>{skill}</Text>
                </View>
              ))}
              {(!user?.skills || user.skills.length === 0) && (
                <Text style={[typography.caption, { color: colors.textMuted, fontStyle: "italic" }]}>No skills listed</Text>
              )}
            </View>
          </View>
        </View>

        <View style={{ flex: 2, gap: 32 }}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[typography.h3, { color: colors.text, marginBottom: 12 }]}>About Me</Text>
            <View style={[styles.underline, { backgroundColor: colors.purple }]} />
            <Text style={[styles.bio, { color: colors.text }]}>
              {user?.bio ||
                user?.about ||
                "I am a dedicated Front-End Engineer focused on clean code and user-centric design..."}
            </Text>
          </View>

          <View>
            <Text style={[typography.h3, { color: colors.text, paddingHorizontal: 8, marginBottom: 12 }]}>Featured Projects</Text>
            <View style={[styles.underline, { backgroundColor: colors.purple, marginLeft: 8, marginBottom: 24 }]} />
            {(user?.projects || []).length > 0 ? (
              (user?.projects || []).map((project: any, index: number) => (
                <View
                  key={index}
                  style={[
                    styles.card,
                    { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 16 },
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
              <Text style={[typography.body, { textAlign: "center", color: colors.textMuted, fontStyle: "italic", paddingVertical: 40 }]}>No projects added yet.</Text>
            )}
          </View>
        </View>
      </View>

      <View style={{ alignItems: "flex-end", paddingVertical: 24 }}>
      </View>
    </ScrollView>
  );
}

function EmployerProfileBody({ user, colors, isDark, router }: any) {
  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <View style={[styles.coverCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <LinearGradient colors={["#7C3AED", "#8B5CF6"]} style={styles.cover} />
        <View style={styles.coverInner}>
          <View style={[styles.empAvatarWrap, { borderColor: colors.surface, backgroundColor: colors.surface }]}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={{ width: "100%", height: "100%", borderRadius: 16 }} contentFit="cover" />
            ) : (
              <Text style={{ fontSize: 36, fontWeight: "900", color: colors.purple }}>{user?.fullName?.charAt(0)}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.h1, { color: colors.text }]}>{user?.fullName || "Company Name"}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <MaterialIcons name="verified" size={18} color={colors.purple} />
              <Text style={[typography.bodySmall, { color: colors.purple, fontWeight: "700" }]}>Official Partner</Text>
            </View>
            {user?.email && (
              <Text style={[typography.caption, { color: colors.textMuted, marginTop: 6, marginBottom: 2 }]}>
                ✉ {user.email}
              </Text>
            )}
            {user?.phoneNumber && (
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                📞 {user.phoneNumber}
              </Text>
            )}
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
          <Button
            title="Go to Dashboard"
            onPress={() => router.push("/employer-dashboard")}
            icon={<MaterialIcons name="dashboard" size={18} color="#fff" />}
          />
          <Button
            title="Saved Talents"
            variant="outline"
            onPress={() => router.push("/bookmarks")}
            icon={<MaterialIcons name="bookmark" size={18} color={colors.purple} />}
            style={{ borderColor: colors.purple }}
            textStyle={{ color: colors.purple }}
          />
          <Button
            title="Edit Company"
            variant="secondary"
            onPress={() => router.push("/edit-profile")}
            icon={<MaterialIcons name="edit" size={18} color={colors.text} />}
          />
        </View>

        <View style={[styles.empSection, { borderTopColor: colors.border }]}>
          <Text style={[typography.h3, { color: colors.text, marginBottom: 12 }]}>About Company</Text>
          <Text style={[typography.body, { color: colors.textSubtle, lineHeight: 24 }]}>
            {user?.bio || user?.about || "No description provided yet. Add information about your company mission and culture."}
          </Text>
        </View>
        <View style={styles.empMeta}>
          <MaterialIcons name="location-on" size={20} color={colors.purple} />
          <Text style={[typography.body, { fontWeight: "700", color: colors.text }]}>{user?.location || "Not specified"}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

export default function ProfileScreen() {
  const user = useSelector((s: RootState) => s.auth.user);
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const profileHeader = (
    <Stack.Screen
      options={{
        headerBackVisible: false,
        headerRight: () => null,
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 5 }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={isDark ? '#F5F5F5' : '#171717'}
            />
            <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#F5F5F5' : '#171717' }}>
              Profile
            </Text>
          </TouchableOpacity>
        ),
      }}
    />
  );

  if (user?.role === "employer") {
    return (
      <>
        {profileHeader}
        <EmployerProfileBody user={user} colors={colors} isDark={isDark} router={router} />
      </>
    );
  }
  return (
    <>
      {profileHeader}
      <FreelancerProfileBody user={user} colors={colors} isDark={isDark} router={router} />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 48 },
  cols: { gap: 32 },
  leftCol: { gap: 24 },
  card: { borderRadius: 12, padding: 32, borderWidth: 1, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  bigAvatar: { width: 128, height: 128, borderRadius: 64, overflow: "hidden", alignItems: "center", justifyContent: "center", marginBottom: 24 },
  bigAvatarText: { color: "#fff", fontSize: 40, fontWeight: "900" },
  socialRow: { flexDirection: "row", gap: 16, marginBottom: 24 },
  socialBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  underline: { width: 48, height: 4, borderRadius: 2, marginBottom: 24 },
  skills: { flexDirection: "row", flexWrap: "wrap", gap: 8, width: "100%" },
  skill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  bio: { lineHeight: 24 },
  coverCard: { borderRadius: 24, borderWidth: 1, overflow: "hidden", marginBottom: 16 },
  cover: { height: 120, opacity: 0.9 },
  coverInner: { flexDirection: "row", paddingHorizontal: 24, marginTop: -48, gap: 16, alignItems: "flex-end" },
  empAvatarWrap: { width: 128, height: 128, borderRadius: 24, borderWidth: 4, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  empSection: { padding: 24, borderTopWidth: 1, marginTop: 24 },
  empMeta: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24, paddingBottom: 24 },
});
