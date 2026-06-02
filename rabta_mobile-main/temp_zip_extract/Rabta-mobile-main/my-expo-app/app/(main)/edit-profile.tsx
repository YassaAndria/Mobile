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
  
  const [isAiOpen, setIsAiOpen] = useState(false);
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
          dispatch(updateProfile({ avatar: null }));
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
      });
      dispatch(updateProfile(res.data.user || formData));
      setShowSuccessPopup(true);
    } catch (e: any) {
      Toast.show({ type: "error", text1: e.response?.data?.message || "Failed to save profile." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={[typography.h1, { color: colors.purple, textAlign: "center", marginBottom: 8 }]}>Edit Your Profile</Text>
          <Text style={[typography.body, { color: colors.text, textAlign: "center", opacity: 0.8, fontStyle: "italic", marginBottom: 24 }]}>Update your professional information and portfolio</Text>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            
            {/* 1. Basic Information */}
            <Text style={[typography.h3, { color: colors.text, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8 }]}>1. Basic Information</Text>
            <View style={styles.avatarRow}>
              <View style={[styles.avatar, { backgroundColor: colors.purple }]}>
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={{ width: "100%", height: "100%" }} />
                ) : (
                  <Text style={{ color: "#fff", fontSize: 28, fontWeight: "800" }}>
                    {getInitials(formData.fullName || user?.fullName || "?")}
                  </Text>
                )}
              </View>
              <View style={{ flex: 1, gap: 8 }}>
                <Button title="Change Photo" variant="secondary" onPress={pickImage} isLoading={isUploading} size="sm" />
                {user?.avatar && <Button title="Remove Photo" variant="ghost" size="sm" onPress={handleDeletePhoto} textStyle={{ color: colors.errorText }} />}
              </View>
            </View>

            {(["fullName", "jobTitle", "location", "bioHeadline"] as const).map((field) => (
              <View key={field} style={{ marginBottom: 16 }}>
                <Text style={[typography.label, { color: colors.textMuted, marginBottom: 8 }]}>{field}</Text>
                <TextInput
                  value={formData[field]}
                  onChangeText={(t) => setFormData({ ...formData, [field]: t })}
                  style={[styles.input, { color: colors.text, borderColor: colors.borderStrong, backgroundColor: colors.surface2 }]}
                />
              </View>
            ))}

            {/* 2. Social Links & Contact */}
            <View style={styles.sectionHeader}>
              <Text style={[typography.h3, { color: colors.text }]}>2. Social Links & Contact</Text>
              <Pressable onPress={addLink}><Text style={{ color: colors.purple, fontWeight: "700" }}>+ Add Link</Text></Pressable>
            </View>
            <Text style={[typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Contact Email</Text>
            <TextInput
              value={formData.contactEmail}
              onChangeText={(t) => setFormData({ ...formData, contactEmail: t })}
              style={[styles.input, { color: colors.text, borderColor: colors.borderStrong, backgroundColor: colors.surface2, marginBottom: 16 }]}
              keyboardType="email-address"
            />
            {formData.links.map((link) => (
              <View key={link.id} style={{ flexDirection: "row", gap: 12, marginBottom: 12, alignItems: "center" }}>
                <TextInput
                  placeholder="Platform (e.g. GitHub)"
                  placeholderTextColor={colors.textMuted}
                  value={link.platform}
                  onChangeText={(t) => handleLinkChange(link.id, "platform", t)}
                  style={[styles.input, { flex: 0.4, color: colors.text, borderColor: colors.borderStrong, backgroundColor: colors.surface2 }]}
                />
                <TextInput
                  placeholder="URL"
                  placeholderTextColor={colors.textMuted}
                  value={link.url}
                  onChangeText={(t) => handleLinkChange(link.id, "url", t)}
                  style={[styles.input, { flex: 0.6, color: colors.text, borderColor: colors.borderStrong, backgroundColor: colors.surface2 }]}
                />
                <Pressable onPress={() => removeLink(link.id)}><MaterialIcons name="delete" size={24} color={colors.errorText} /></Pressable>
              </View>
            ))}

            {/* 3. Professional Details */}
            <Text style={[typography.h3, { color: colors.text, marginTop: 16, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8 }]}>3. Professional Details</Text>
            <Text style={[typography.label, { color: colors.textMuted, marginBottom: 8 }]}>About Me (Detailed)</Text>
            <TextInput
              multiline
              numberOfLines={4}
              value={formData.detailedAbout}
              onChangeText={(t) => setFormData({ ...formData, detailedAbout: t })}
              style={[styles.input, { color: colors.text, borderColor: colors.borderStrong, backgroundColor: colors.surface2, minHeight: 100, textAlignVertical: "top", marginBottom: 16 }]}
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
                style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.borderStrong, backgroundColor: colors.surface2 }]}
              />
              <Button title="Add" onPress={addSkill} variant="secondary" />
            </View>

            {/* 4. Projects */}
            <View style={styles.sectionHeader}>
              <Text style={[typography.h3, { color: colors.text }]}>4. Featured Projects</Text>
              <Pressable onPress={addProject}><Text style={{ color: colors.purple, fontWeight: "700" }}>+ Add Project</Text></Pressable>
            </View>
            {formData.projects.map((project) => (
              <View key={project.id} style={[styles.projectCard, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                <Pressable onPress={() => removeProject(project.id)} style={{ position: "absolute", top: 12, right: 12, zIndex: 10 }}>
                  <MaterialIcons name="delete" size={24} color={colors.errorText} />
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

            {/* Actions */}
            <View style={{ flexDirection: "row", gap: 12, marginTop: 32, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 24 }}>
              <Button title="Cancel" onPress={() => router.back()} variant="outline" style={{ flex: 1 }} />
              <Button title="Save Changes" onPress={handleSave} isLoading={saving} style={{ flex: 1 }} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Floating AI Button */}
      <View style={{ position: "absolute", bottom: 24, right: 24, alignItems: "flex-end", zIndex: 50 }}>
        {isAiOpen && (
          <View style={[styles.aiPopup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ backgroundColor: colors.purple, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#4ADE80" }} />
                <Text style={{ color: "#fff", fontWeight: "700" }}>Rabta AI</Text>
              </View>
              <Pressable onPress={() => setIsAiOpen(false)}><MaterialIcons name="close" size={20} color="#fff" /></Pressable>
            </View>
            <View style={{ padding: 16, minHeight: 100 }}>
              <Text style={{ color: colors.textMuted, fontStyle: "italic" }}>I can suggest improvements to your profile content!</Text>
            </View>
            <View style={{ padding: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
              <TextInput placeholder="Ask AI..." placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.text, borderColor: colors.borderStrong }]} />
            </View>
          </View>
        )}
        <Pressable onPress={() => setIsAiOpen(!isAiOpen)} style={[styles.fab, { backgroundColor: colors.purple }]}>
          <MaterialIcons name="bolt" size={28} color="#fff" />
        </Pressable>
      </View>

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
  scroll: { padding: 24, paddingBottom: 100, maxWidth: 720, width: "100%", alignSelf: "center" },
  card: { borderRadius: 12, padding: 24, borderWidth: 1 },
  avatarRow: { flexDirection: "row", gap: 16, marginBottom: 24, alignItems: "center" },
  avatar: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24, marginBottom: 16, borderBottomWidth: 1, paddingBottom: 8 },
  skillBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16 },
  projectCard: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 16 },
  fab: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 8 },
  aiPopup: { width: 300, borderRadius: 16, overflow: "hidden", borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 10, marginBottom: 16 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalBox: { width: "100%", maxWidth: 400, borderRadius: 16, padding: 32, alignItems: "center", borderWidth: 1 },
});
