/* eslint-disable @typescript-eslint/no-explicit-any */
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
  Modal,
  Pressable,
} from "react-native";
import { Image } from "expo-image";
import Toast from "react-native-toast-message";
import { uploadProfilePicture } from "../../src/api/auth";
import { updateProfile as patchUserApi } from "../../src/api/user";
import { updateProfile } from "../../src/store/slices/authSlice";
import { useAppDispatch, useAppSelector } from "../../src/store/hooks";
import { useTheme } from "../../src/theme/ThemeContext";
import { Button } from "../../src/components/ui/Button";
import { typography } from "../../src/theme/typography";

interface Link {
  id: number;
  platform: string;
  url: string;
}

interface Project {
  id: number;
  title: string;
  description: string;
  viewLink: string;
  githubLink: string;
}

interface FormDataType {
  fullName: string;
  jobTitle: string;
  location: string;
  bioHeadline: string;
  detailedAbout: string;
  contactEmail: string;
  skills: string[];
  links: Link[];
  projects: Project[];
}

export default function EditProfileScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [skillsInput, setSkillsInput] = useState("");

  const [formData, setFormData] = useState<FormDataType>({
    fullName: user?.fullName || "",
    jobTitle: user?.jobTitle || "",
    location: user?.location || "",
    bioHeadline: user?.bioHeadline || "",
    detailedAbout: user?.bio || user?.about || "",
    contactEmail: user?.contactEmail || "",
    skills: Array.isArray(user?.skills) ? user.skills : [],
    links: user?.links || [],
    projects: user?.projects || [],
  });

  const getInitials = (name: string) => {
    if (!name) return "??";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Toast.show({ type: "error", text1: "Permission required" });
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];

    try {
      setIsUploading(true);
      const name = asset.fileName || "avatar.jpg";
      const type = asset.mimeType || "image/jpeg";
      const response = await uploadProfilePicture(asset.uri, name, type);
      dispatch(updateProfile({ avatar: response.avatar }));
      Toast.show({ type: "success", text1: "Profile photo updated!" });
    } catch {
      Toast.show({ type: "error", text1: "Failed to upload image." });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = () => {
    Alert.alert("Remove photo", "Are you sure you want to remove your profile photo?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          // Backend stores avatar as a string (default ""), and `/profile/me` supports clearing it via `avatar: ""`.
          dispatch(updateProfile({ avatar: "" }));
          Toast.show({ type: "success", text1: "Profile photo removed." });
        }
      },
    ]);
  };

  const addSkill = () => {
    if (skillsInput.trim()) {
      setFormData({ ...formData, skills: [...formData.skills, skillsInput.trim()] });
      setSkillsInput("");
    }
  };

  const removeSkill = (index: number) => {
    const newSkills = [...formData.skills];
    newSkills.splice(index, 1);
    setFormData({ ...formData, skills: newSkills });
  };

  const addLink = () => setFormData({ ...formData, links: [...formData.links, { id: Date.now(), platform: "", url: "" }] });
  const removeLink = (id: number) => setFormData({ ...formData, links: formData.links.filter(l => l.id !== id) });
  const handleLinkChange = (id: number, field: string, value: string) => {
    setFormData({ ...formData, links: formData.links.map(l => l.id === id ? { ...l, [field]: value } : l) });
  };

  const addProject = () => setFormData({ ...formData, projects: [...formData.projects, { id: Date.now(), title: "", description: "", viewLink: "", githubLink: "" }] });
  const removeProject = (id: number) => setFormData({ ...formData, projects: formData.projects.filter(p => p.id !== id) });
  const handleProjectChange = (id: number, field: string, value: string) => {
    setFormData({ ...formData, projects: formData.projects.map(p => p.id === id ? { ...p, [field]: value } : p) });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await patchUserApi({
        fullName: formData.fullName,
        jobTitle: formData.jobTitle,
        location: formData.location,
        bioHeadline: formData.bioHeadline,
        about: formData.detailedAbout,
        contactEmail: formData.contactEmail,
        skills: formData.skills,
        links: formData.links,
        projects: formData.projects,
        // Important: persist avatar removal/upload to backend.
        // `remove photo` updates redux immediately; without sending it here,
        // the server response will re-hydrate the old avatar URL on save.
        avatar: user?.avatar ?? "",
      });
      dispatch(updateProfile(res.data.user || formData));
      setShowSuccessPopup(true);
    } catch (e: any) {
      Toast.show({ type: "error", text1: e.response?.data?.message || "Failed to save profile." });
    } finally {
      setSaving(false);
    }
  };

  const basicFields: Array<{
    key: "fullName" | "jobTitle" | "location" | "bioHeadline";
    label: string;
    placeholder: string;
    keyboardType?: "default";
    autoCapitalize?: "none" | "words" | "sentences";
  }> = [
    { key: "fullName", label: "Full name", placeholder: "Your name", autoCapitalize: "words" },
    { key: "jobTitle", label: "Job title", placeholder: "e.g. Mobile Developer", autoCapitalize: "words" },
    { key: "location", label: "Location", placeholder: "City, Country", autoCapitalize: "words" },
    { key: "bioHeadline", label: "Headline", placeholder: "One line that describes you", autoCapitalize: "sentences" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={[
              styles.backBtn,
              { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" },
            ]}
          >
            <MaterialIcons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[typography.h3, { color: colors.text, textAlign: "center" }]}>Edit profile</Text>
            <Text style={[typography.caption, { color: colors.textMuted, textAlign: "center", marginTop: 2 }]}>
              Keep your info up to date
            </Text>
          </View>
          {/* spacer to keep title centered */}
          <View style={{ width: 44, height: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>

            {/* 1. Basic Information */}
            <Text style={[styles.sectionTitle, { color: colors.text, borderBottomColor: colors.border }]}>Basic information</Text>
            <View style={styles.avatarRow}>
              <Pressable onPress={pickImage} style={[styles.avatar, { backgroundColor: colors.purple }]} hitSlop={10}>
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={{ width: "100%", height: "100%" }} />
                ) : (
                  <Text style={{ color: "#fff", fontSize: 28, fontWeight: "800" }}>
                    {getInitials(formData.fullName || user?.fullName || "?")}
                  </Text>
                )}
                <View style={[styles.avatarEditPill, { backgroundColor: isDark ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.5)" }]}>
                  <MaterialIcons name="photo-camera" size={16} color="#fff" />
                  <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>Edit</Text>
                </View>
              </Pressable>
              <View style={{ flex: 1, gap: 8 }}>
                <Button title="Change photo" variant="secondary" onPress={pickImage} isLoading={isUploading} size="sm" />
                {user?.avatar && (
                  <Button
                    title="Remove photo"
                    variant="ghost"
                    size="sm"
                    onPress={handleDeletePhoto}
                    textStyle={{ color: colors.errorText }}
                  />
                )}
              </View>
            </View>

            {basicFields.map((f) => (
              <View key={f.key} style={styles.field}>
                <Text style={[typography.label, { color: colors.textMuted, marginBottom: 8 }]}>{f.label}</Text>
                <TextInput
                  value={formData[f.key]}
                  onChangeText={(t) => setFormData({ ...formData, [f.key]: t })}
                  placeholder={f.placeholder}
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize={f.autoCapitalize}
                  style={[
                    styles.input,
                    { color: colors.text, borderColor: colors.borderStrong, backgroundColor: isDark ? "#1A1A1A" : colors.surface2 },
                  ]}
                />
              </View>
            ))}

            {/* 2. Social Links & Contact */}
            <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
              <Text style={[typography.h3, { color: colors.text }]}>Social links</Text>
              <Pressable onPress={addLink} hitSlop={8} style={styles.addLinkBtn}>
                <MaterialIcons name="add" size={18} color={colors.purple} />
                <Text style={{ color: colors.purple, fontWeight: "800" }}>Add</Text>
              </Pressable>
            </View>
            <Text style={[typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Contact email</Text>
            <TextInput
              value={formData.contactEmail}
              onChangeText={(t) => setFormData({ ...formData, contactEmail: t })}
              placeholder="name@example.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.borderStrong,
                  backgroundColor: isDark ? "#1A1A1A" : colors.surface2,
                  marginBottom: 16,
                },
              ]}
            />
            {formData.links.map((link) => (
              <View key={link.id} style={styles.linkRow}>
                <TextInput
                  placeholder="Platform (e.g. GitHub)"
                  placeholderTextColor={colors.textMuted}
                  value={link.platform}
                  onChangeText={(t) => handleLinkChange(link.id, "platform", t)}
                  style={[
                    styles.input,
                    {
                      flex: 0.42,
                      color: colors.text,
                      borderColor: colors.borderStrong,
                      backgroundColor: isDark ? "#1A1A1A" : colors.surface2,
                    },
                  ]}
                />
                <TextInput
                  placeholder="URL"
                  placeholderTextColor={colors.textMuted}
                  value={link.url}
                  onChangeText={(t) => handleLinkChange(link.id, "url", t)}
                  autoCapitalize="none"
                  style={[
                    styles.input,
                    {
                      flex: 0.58,
                      color: colors.text,
                      borderColor: colors.borderStrong,
                      backgroundColor: isDark ? "#1A1A1A" : colors.surface2,
                    },
                  ]}
                />
                <Pressable onPress={() => removeLink(link.id)} hitSlop={8} style={styles.iconBtn}>
                  <MaterialIcons name="delete-outline" size={22} color={colors.errorText} />
                </Pressable>
              </View>
            ))}

            {/* 3. Professional Details */}
            <Text style={[styles.sectionTitle, { color: colors.text, borderBottomColor: colors.border }]}>Professional</Text>
            <Text style={[typography.label, { color: colors.textMuted, marginBottom: 8 }]}>About</Text>
            <TextInput
              multiline
              numberOfLines={4}
              value={formData.detailedAbout}
              onChangeText={(t) => setFormData({ ...formData, detailedAbout: t })}
              placeholder="Tell people what you do, what you’re great at, and what you’re looking for."
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.borderStrong,
                  backgroundColor: isDark ? "#1A1A1A" : colors.surface2,
                  minHeight: 120,
                  textAlignVertical: "top",
                  marginBottom: 16,
                },
              ]}
            />

            <Text style={[typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Skills</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {formData.skills.map((skill, index) => (
                <View key={index} style={[styles.skillBadge, { backgroundColor: colors.purple }]}>
                  <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>{skill}</Text>
                  <Pressable onPress={() => removeSkill(index)}><MaterialIcons name="close" size={14} color="#fff" /></Pressable>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
              <TextInput
                placeholder="Add skill..."
                placeholderTextColor={colors.textMuted}
                value={skillsInput}
                onChangeText={setSkillsInput}
                onSubmitEditing={addSkill}
                style={[
                  styles.input,
                  {
                    flex: 1,
                    color: colors.text,
                    borderColor: colors.borderStrong,
                    backgroundColor: isDark ? "#1A1A1A" : colors.surface2,
                  },
                ]}
              />
              <Button title="Add" onPress={addSkill} variant="secondary" />
            </View>

            {/* 4. Projects */}
            <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
              <Text style={[typography.h3, { color: colors.text }]}>Featured projects</Text>
              <Pressable onPress={addProject} hitSlop={8} style={styles.addLinkBtn}>
                <MaterialIcons name="add" size={18} color={colors.purple} />
                <Text style={{ color: colors.purple, fontWeight: "800" }}>Add</Text>
              </Pressable>
            </View>
            {formData.projects.map((project) => (
              <View key={project.id} style={[styles.projectCard, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                <Pressable onPress={() => removeProject(project.id)} hitSlop={8} style={styles.projectDelete}>
                  <MaterialIcons name="delete-outline" size={22} color={colors.errorText} />
                </Pressable>
                <Text style={[typography.label, { color: colors.textMuted, marginBottom: 4 }]}>Project Title</Text>
                <TextInput value={project.title} onChangeText={(t) => handleProjectChange(project.id, "title", t)} style={[styles.input, { color: colors.text, borderColor: colors.borderStrong, backgroundColor: colors.surface, marginBottom: 12 }]} />
                <Text style={[typography.label, { color: colors.textMuted, marginBottom: 4 }]}>Description</Text>
                <TextInput multiline value={project.description} onChangeText={(t) => handleProjectChange(project.id, "description", t)} style={[styles.input, { color: colors.text, borderColor: colors.borderStrong, backgroundColor: colors.surface, marginBottom: 12, minHeight: 60, textAlignVertical: "top" }]} />
                <Text style={[typography.label, { color: colors.textMuted, marginBottom: 4 }]}>View Link (Optional)</Text>
                <TextInput value={project.viewLink} onChangeText={(t) => handleProjectChange(project.id, "viewLink", t)} style={[styles.input, { color: colors.text, borderColor: colors.borderStrong, backgroundColor: colors.surface, marginBottom: 12 }]} />
                <Text style={[typography.label, { color: colors.textMuted, marginBottom: 4 }]}>GitHub Link (Optional)</Text>
                <TextInput value={project.githubLink} onChangeText={(t) => handleProjectChange(project.id, "githubLink", t)} style={[styles.input, { color: colors.text, borderColor: colors.borderStrong, backgroundColor: colors.surface }]} />
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Sticky Actions */}
        <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.bg }]}>
          <Button title="Cancel" onPress={() => router.back()} variant="outline" style={{ flex: 1 }} />
          <Button title="Save changes" onPress={handleSave} isLoading={saving} style={{ flex: 1 }} />
        </View>
      </KeyboardAvoidingView>

      {/* Success Modal */}
      <Modal visible={showSuccessPopup} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <MaterialIcons name="check" size={32} color="#16A34A" />
            </View>
            <Text style={[typography.h2, { color: colors.purple, marginBottom: 8 }]}>Profile Updated!</Text>
            <Text style={[typography.body, { color: colors.textMuted, textAlign: "center", marginBottom: 24 }]}>
              Your changes have been saved successfully. Your professional brand is looking great.
            </Text>
            <Button title="Back to Profile" onPress={() => { setShowSuccessPopup(false); router.push("/profile"); }} style={{ width: "100%" }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 56 : 20,
    paddingBottom: 12,
  },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 16, paddingBottom: 140, maxWidth: 720, width: "100%", alignSelf: "center" },
  card: { borderRadius: 16, padding: 18, borderWidth: 1 },
  sectionTitle: { ...typography.h3, marginBottom: 16, borderBottomWidth: 1, paddingBottom: 10 },
  field: { marginBottom: 16 },
  avatarRow: { flexDirection: "row", gap: 16, marginBottom: 24, alignItems: "center" },
  avatar: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarEditPill: {
    position: "absolute",
    bottom: 8,
    alignSelf: "center",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, minHeight: 52 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24, marginBottom: 16, borderBottomWidth: 1, paddingBottom: 10 },
  addLinkBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 10 },
  linkRow: { flexDirection: "row", gap: 10, marginBottom: 12, alignItems: "center" },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  skillBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16 },
  projectCard: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 16 },
  projectDelete: { position: "absolute", top: 10, right: 10, zIndex: 10, width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 12,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 12,
  },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalBox: { width: "100%", maxWidth: 400, borderRadius: 16, padding: 32, alignItems: "center", borderWidth: 1 },
});
