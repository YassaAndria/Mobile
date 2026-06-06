/* eslint-disable @typescript-eslint/no-explicit-any */
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { useDispatch, useSelector } from "react-redux";
import { uploadProfilePicture } from "../../src/api/auth";
import axiosInstance from "../../src/api/axiosInstance";
import { updateProfile } from "../../src/store/slices/authSlice";
import type { RootState } from "../../src/store/store";
import { useTheme } from "../../src/theme/ThemeContext";
import { Button } from "../../src/components/ui/Button";
import { typography } from "../../src/theme/typography";

export default function SetupProfileScreen() {
  const dispatch = useDispatch();
  const router = useRouter();
  const user = useSelector((s: RootState) => s.auth.user);
  const { colors, isDark } = useTheme();
  const [isUploading, setIsUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    jobTitle: "",
    location: "",
    bioHeadline: "",
    detailedAbout: "",
    contactEmail: "",
    skillsText: "",
    companyName: "",
    industry: "",
  });

  useEffect(() => {
    if (user?.profileComplete) {
      if (user?.role === "employer") {
        router.replace("/employer-dashboard");
      } else {
        router.replace("/chats");
      }
    }
  }, [user, router]);

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || "",
        jobTitle: user.jobTitle || "",
        location: user.location || "",
        bioHeadline: user.bioHeadline || "",
        detailedAbout: user.bio || user.about || user.aboutMe || "",
        contactEmail: user.contactEmail || "",
        skillsText: Array.isArray(user.skills) ? user.skills.join(", ") : "",
        companyName: user.companyName || "",
        industry: user.industry || "",
      });
    }
  }, [user]);

  const fields = React.useMemo(() => {
    const isEmployer = user?.role === "employer";
    if (isEmployer) {
      return [
        ["companyName", "Company Name"],
        ["industry", "Industry"],
        ["location", "Location"],
        ["bioHeadline", "Headline / Slogan"],
        ["detailedAbout", "About Company"],
        ["contactEmail", "Contact Email"],
      ] as const;
    } else {
      return [
        ["fullName", "Full Name"],
        ["jobTitle", "Job Title"],
        ["location", "Location"],
        ["bioHeadline", "Professional Headline"],
        ["detailedAbout", "About Me"],
        ["contactEmail", "Contact Email"],
        ["skillsText", "Skills (comma separated)"],
      ] as const;
    }
  }, [user?.role]);

  const handleImageUpload = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    try {
      setIsUploading(true);
      const response = await uploadProfilePicture(asset.uri, asset.fileName || "avatar.jpg", asset.mimeType || "image/jpeg");
      dispatch(updateProfile({ avatar: response.avatar }));
      Toast.show({ type: "success", text1: "Profile photo uploaded!" });
    } catch {
      Toast.show({ type: "error", text1: "Failed to upload image." });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const skills = formData.skillsText
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      const response = await axiosInstance.patch("/profile/me", {
        fullName: formData.fullName,
        jobTitle: formData.jobTitle,
        location: formData.location,
        bioHeadline: formData.bioHeadline,
        about: formData.detailedAbout,
        companyName: formData.companyName,
        industry: formData.industry,
        skills,
        profileComplete: true,
      });
      dispatch(updateProfile({ ...response.data.data.user, profileComplete: true }));
      Toast.show({ type: "success", text1: "Profile setup complete!" });
      if (user?.role === "employer") {
        router.replace("/employer-dashboard");
      } else {
        router.replace("/chats");
      }
    } catch {
      Toast.show({ type: "error", text1: "Failed to save profile." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[typography.h1, { color: colors.text, marginBottom: 24 }]}>Complete your profile</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.purple, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {user?.avatar ? (
              <Text style={{ color: "#fff" }}>Photo</Text>
            ) : (
              <Text style={{ color: "#fff", fontSize: 24, fontWeight: "800" }}>
                {(formData.fullName || user?.fullName || "?").slice(0, 2).toUpperCase()}
              </Text>
            )}
          </View>
          <Button
            title={user?.avatar ? "Change photo" : "Upload photo"}
            variant="outline"
            onPress={handleImageUpload}
            isLoading={isUploading}
          />
        </View>

        {fields.map(([key, label]) => (
          <View key={key} style={{ marginBottom: 12 }}>
            <Text style={[typography.label, { color: colors.textMuted, marginBottom: 6 }]}>{label}</Text>
            <TextInput
              value={(formData as any)[key]}
              onChangeText={(t) => setFormData({ ...formData, [key]: t })}
              multiline={key === "detailedAbout"}
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.borderStrong, backgroundColor: colors.surface2 },
              ]}
            />
          </View>
        ))}

        <Pressable
          style={styles.primaryBtn}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryBtnText}>Save & Continue</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 24, paddingBottom: 80, maxWidth: 560, width: "100%", alignSelf: "center" },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, minHeight: 44 },
  primaryBtn: {
    backgroundColor: "#7C3AED",
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 5,
    width: "100%",
    marginTop: 24,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
