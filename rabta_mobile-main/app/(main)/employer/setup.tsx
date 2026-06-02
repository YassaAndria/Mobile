/* eslint-disable @typescript-eslint/no-explicit-any */
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Toast from "react-native-toast-message";
import { useDispatch, useSelector } from "react-redux";
import { uploadProfilePicture } from "../../../src/api/auth";
import axiosInstance from "../../../src/api/axiosInstance";
import { updateProfile } from "../../../src/store/slices/authSlice";
import type { RootState } from "../../../src/store/store";
import { useTheme } from "../../../src/theme/ThemeContext";
import { Button } from "../../../src/components/ui/Button";
import { typography } from "../../../src/theme/typography";

export default function EmployerSetupScreen() {
  const { user } = useSelector((s: RootState) => s.auth);
  const router = useRouter();
  const dispatch = useDispatch();
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    tagline: "",
    bio: "",
    location: "",
    industry: "",
    website: "",
    linkedin: "",
  });

  const handleImageUpload = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    try {
      setIsUploading(true);
      const response = await uploadProfilePicture(asset.uri, asset.fileName || "logo.jpg", asset.mimeType || "image/jpeg");
      dispatch(updateProfile({ avatar: response.avatar }));
      Toast.show({ type: "success", text1: "Logo uploaded!" });
    } catch {
      Toast.show({ type: "error", text1: "Failed to upload logo." });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.patch("/profile/me", { ...formData, profileCompleted: true });
      dispatch(updateProfile({ ...response.data.data.user, profileCompleted: true }));
      Toast.show({ type: "success", text1: "Company profile ready!" });
      router.replace("/profile");
    } catch {
      Toast.show({ type: "error", text1: "Failed to save. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 24 }}>
      <Text style={[typography.h1, { color: colors.text, marginBottom: 24 }]}>Company setup</Text>
      <Button
        title="Upload logo"
        variant="primary"
        onPress={handleImageUpload}
        isLoading={isUploading}
        style={{ marginBottom: 24 }}
      />
      {(Object.keys(formData) as (keyof typeof formData)[]).map((key) => (
        <View key={key} style={{ marginBottom: 12 }}>
          <Text style={[typography.label, { color: colors.text, marginBottom: 6 }]}>{key}</Text>
          <TextInput
            value={formData[key]}
            onChangeText={(t) => setFormData({ ...formData, [key]: t })}
            multiline={key === "bio"}
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          />
        </View>
      ))}
      <Button
        title="Save"
        variant="primary"
        onPress={handleSubmit}
        isLoading={loading}
        style={{ marginTop: 16 }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 44 },
});
