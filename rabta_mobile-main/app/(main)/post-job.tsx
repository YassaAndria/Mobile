/* eslint-disable @typescript-eslint/no-explicit-any */
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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
import axiosInstance from "../../src/api/axiosInstance";
import { useAppDispatch, useAppSelector } from "../../src/store/hooks";
import { updateProfile } from "../../src/store/slices/authSlice";
import { useTheme } from "../../src/theme/ThemeContext";
import { Button } from "../../src/components/ui/Button";
import { typography } from "../../src/theme/typography";

export default function PostJobScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const { colors, isDark } = useTheme();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState("");
  const [budget, setBudget] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationLink, setVerificationLink] = useState("");
  const [isSubmittingLink, setIsSubmittingLink] = useState(false);

  const onSubmit = async () => {
    try {
      setIsSubmitting(true);
      const payload = {
        title,
        description,
        jobType: "full_time",
        requiredSkills: skills.split(",").map((s) => s.trim()).filter(Boolean),
        budgetOrSalary: budget,
      };
      await axiosInstance.post("/jobs", payload);
      Toast.show({ type: "success", text1: "Job posted successfully!" });
      router.replace("/employer-dashboard");
    } catch {
      Toast.show({ type: "error", text1: "Failed to post job. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerificationSubmit = async () => {
    if (!verificationLink.trim()) {
      Toast.show({ type: "error", text1: "Please enter a valid link" });
      return;
    }
    try {
      setIsSubmittingLink(true);
      const res = await axiosInstance.put("/users/verify-request", { verificationLink });
      dispatch(updateProfile(res.data.data.user));
      Toast.show({ type: "success", text1: "Verification link submitted successfully!" });
    } catch (error: any) {
      Toast.show({ type: "error", text1: error.response?.data?.message || "Failed to submit verification request." });
    } finally {
      setIsSubmittingLink(false);
    }
  };

  if (user?.role === "employer" && !user?.isVerified) {
    if (user?.verificationLink) {
      return (
        <View style={[styles.center, { backgroundColor: colors.bg, padding: 24 }]}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialIcons name="hourglass-empty" size={48} color={colors.purple} />
            <Text style={[typography.h2, { color: colors.text, marginTop: 8 }]}>Verification Pending</Text>
            <Text style={[typography.body, { color: colors.textSubtle, textAlign: "center", marginVertical: 16 }]}>
              Thank you! Your link has been submitted for review.
            </Text>
            <Button
              title="Back to Dashboard"
              variant="secondary"
              onPress={() => router.push("/employer-dashboard")}
              style={{ width: "100%" }}
            />
          </View>
        </View>
      );
    }
    return (
      <ScrollView contentContainerStyle={[styles.center, { backgroundColor: colors.bg, padding: 24 }]}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[typography.h2, { color: colors.text, marginBottom: 8 }]}>Company Verification</Text>
          <Text style={[typography.body, { color: colors.textSubtle, marginBottom: 16 }]}>Submit a link to verify your company.</Text>
          <TextInput
            value={verificationLink}
            onChangeText={setVerificationLink}
            placeholder="https://..."
            placeholderTextColor={colors.textSubtle}
            style={[styles.input, { color: colors.text, borderColor: colors.borderStrong, backgroundColor: colors.surface2, marginBottom: 16 }]}
          />
          <Button
            title="Submit Link"
            onPress={handleVerificationSubmit}
            isLoading={isSubmittingLink}
            style={{ width: "100%" }}
          />
        </View>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 24, paddingBottom: 80 }} keyboardShouldPersistTaps="handled">
      <Text style={[typography.h2, { color: colors.text, marginBottom: 16 }]}>Post a Job</Text>
      {(["title", "description", "skills", "budget"] as const).map((field) => (
        <View key={field} style={{ marginBottom: 16 }}>
          <Text style={[typography.label, { color: colors.textMuted, marginBottom: 8 }]}>{field}</Text>
          <TextInput
            value={field === "title" ? title : field === "description" ? description : field === "skills" ? skills : budget}
            onChangeText={
              field === "title" ? setTitle : field === "description" ? setDescription : field === "skills" ? setSkills : setBudget
            }
            multiline={field === "description"}
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.borderStrong, backgroundColor: colors.surface2, minHeight: field === "description" ? 120 : 48 },
            ]}
          />
        </View>
      ))}
      <Button
        title="Publish Job"
        onPress={onSubmit}
        isLoading={isSubmitting}
        style={{ marginTop: 8 }}
      />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flexGrow: 1, justifyContent: "center" },
  card: { borderRadius: 16, padding: 32, alignItems: "center", maxWidth: 400, width: "100%", alignSelf: "center" },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, width: "100%" },
});
