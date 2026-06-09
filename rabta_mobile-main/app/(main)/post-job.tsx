/* eslint-disable @typescript-eslint/no-explicit-any */
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
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

const JOB_TYPES = [
  { label: "Full Time", value: "full_time" },
  { label: "Part Time", value: "part_time" },
  { label: "Freelance", value: "freelance" },
  { label: "Internship", value: "internship" },
];

const WORK_LOCATIONS = [
  { label: "Remote", value: "remote" },
  { label: "On-site", value: "onsite" },
];

const EGYPT_GOVERNORATES = [
  'Alexandria','Assiut','Aswan','Beheira','Beni Suef','Cairo','Dakahlia',
  'Damietta','Fayoum','Gharbia','Giza','Ismailia','Kafr Al Sheikh','Luxor',
  'Matrouh','Menofia','Minya','New Valley','North Sinai','Port Said',
  'Qaliubiya','Qena','Red Sea','Sharkia','Sohag','South Sinai','Suez'
];

function ChipSelect({ label, options, value, onChange, colors }: any) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 8 }}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((opt: any) => (
          <Pressable key={opt.value} onPress={() => onChange(opt.value)}
            style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5,
              borderColor: value === opt.value ? colors.purple : colors.borderStrong,
              backgroundColor: value === opt.value ? `${colors.purple}18` : colors.surface2 }}>
            <Text style={{ color: value === opt.value ? colors.purple : colors.textMuted, fontSize: 13, fontWeight: '500' }}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function PostJobScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const { colors, isDark } = useTheme();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationLink, setVerificationLink] = useState("");
  const [isSubmittingLink, setIsSubmittingLink] = useState(false);
  const [jobType, setJobType] = useState("full_time");
  const [workLocation, setWorkLocation] = useState("remote");
  const [category, setCategory] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [responsibilities, setResponsibilities] = useState("");
  const [requirements, setRequirements] = useState("");
  const [skillsList, setSkillsList] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [jobCategories, setJobCategories] = useState<{ _id: string; name: string; value: string }[]>([]);
  const [showGovPicker, setShowGovPicker] = useState(false);

  useEffect(() => {
    axiosInstance.get('/job-categories')
      .then(res => setJobCategories(res.data.data?.categories || []))
      .catch(err => console.error('Failed to load categories', err));
  }, []);

  const handleAddSkill = (text: string) => {
    setSkillInput(text);
    if (text.endsWith(',') || text.endsWith('\n')) {
      const val = text.replace(/[,\n]/g, '').trim();
      if (val && !skillsList.includes(val)) setSkillsList(prev => [...prev, val]);
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => setSkillsList(prev => prev.filter(s => s !== skill));

  const onSubmit = async () => {
    try {
      setIsSubmitting(true);
      const payload = {
        title,
        description,
        jobType,
        workLocation,
        category,
        location: workLocation === 'remote' ? 'Remote' : governorate,
        requiredSkills: skillsList,
        responsibilities: responsibilities.split("\n").map(s => s.trim()).filter(Boolean),
        requirements: requirements.split("\n").map(s => s.trim()).filter(Boolean),
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

  if (user?.role === "employer" && user?.verificationStatus !== "approved") {
    if (user?.verificationStatus === "pending" || user?.verificationLink) {
      return (
        <View style={[styles.center, { backgroundColor: colors.bg, padding: 24 }]}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.iconCircle, { backgroundColor: '#FFF3E0' }]}>
              <MaterialIcons name="hourglass-empty" size={32} color="#F57C00" />
            </View>
            <Text style={[typography.h2, { color: colors.text, marginTop: 16 }]}>Verification Pending</Text>
            <Text style={[typography.body, { color: colors.textSubtle, textAlign: "center", marginVertical: 16 }]}>
              Thank you! Your link has been submitted for review.
            </Text>
            <Button
              title="Return to Dashboard"
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
          <View style={[styles.iconCircle, { backgroundColor: `${colors.purple}20` }]}>
            <MaterialIcons name="verified-user" size={32} color={colors.purple} />
          </View>
          <Text style={[typography.h2, { color: colors.text, marginTop: 16, marginBottom: 8, textAlign: 'center' }]}>Account Verification Required</Text>
          <Text style={[typography.body, { color: colors.textSubtle, marginBottom: 24, textAlign: 'center' }]}>
            Welcome to Rabta! To maintain the quality of opportunities for our youth, please provide us with your company's website or LinkedIn page to verify your account. Verification usually takes less than 24 hours.
          </Text>
          <TextInput
            value={verificationLink}
            onChangeText={setVerificationLink}
            placeholder="https://linkedin.com/company/..."
            placeholderTextColor={colors.textSubtle}
            style={[styles.input, { color: colors.text, borderColor: colors.borderStrong, backgroundColor: colors.surface2, marginBottom: 16 }]}
          />
          <Button
            title="Submit for Verification"
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
      <Text style={[typography.h2, { color: colors.text, marginBottom: 4 }]}>Post New Job</Text>
      <Text style={[typography.body, { color: colors.textSubtle, marginBottom: 24 }]}>Create a new opportunity to find the best talent.</Text>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 8 }}>Job Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          style={[styles.input, { color: colors.text, borderColor: colors.borderStrong, backgroundColor: colors.surface2, minHeight: 48 }]}
        />
      </View>

      <ChipSelect label="Job Type" options={JOB_TYPES} value={jobType} onChange={setJobType} colors={colors} />

      {jobCategories.length > 0 && (
        <ChipSelect label="Job Category" options={jobCategories.map(c => ({ label: c.name, value: c.value }))} value={category} onChange={setCategory} colors={colors} />
      )}

      <ChipSelect label="Work Location" options={WORK_LOCATIONS} value={workLocation} onChange={setWorkLocation} colors={colors} />

      {workLocation === 'onsite' && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 8 }}>Governorate</Text>
          <Pressable
            onPress={() => setShowGovPicker(true)}
            style={[styles.input, { borderColor: colors.borderStrong, backgroundColor: colors.surface2, minHeight: 48, justifyContent: 'center' }]}
          >
            <Text style={{ color: governorate ? colors.text : colors.textMuted }}>{governorate || "Select Governorate"}</Text>
          </Pressable>
        </View>
      )}

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 8 }}>Required Skills</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {skillsList.map((skill) => (
            <View key={skill} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${colors.purple}18`, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.purple }}>
              <Text style={{ color: colors.purple, fontSize: 13, fontWeight: '500', marginRight: 4 }}>{skill}</Text>
              <Pressable onPress={() => removeSkill(skill)}>
                <MaterialIcons name="close" size={16} color={colors.purple} />
              </Pressable>
            </View>
          ))}
        </View>
        <TextInput
          value={skillInput}
          onChangeText={handleAddSkill}
          onSubmitEditing={() => handleAddSkill(skillInput + ',')}
          placeholder="Add skill..."
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text, borderColor: colors.borderStrong, backgroundColor: colors.surface2, minHeight: 48 }]}
        />
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 8 }}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          multiline
          style={[styles.input, { color: colors.text, borderColor: colors.borderStrong, backgroundColor: colors.surface2, minHeight: 120, textAlignVertical: "top" }]}
        />
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 8 }}>Key Responsibilities (Optional)</Text>
        <TextInput
          value={responsibilities}
          onChangeText={setResponsibilities}
          multiline
          style={[styles.input, { color: colors.text, borderColor: colors.borderStrong, backgroundColor: colors.surface2, minHeight: 100, textAlignVertical: "top" }]}
        />
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 8 }}>Requirements (Optional)</Text>
        <TextInput
          value={requirements}
          onChangeText={setRequirements}
          multiline
          style={[styles.input, { color: colors.text, borderColor: colors.borderStrong, backgroundColor: colors.surface2, minHeight: 100, textAlignVertical: "top" }]}
        />
      </View>

      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 8 }}>Budget / Salary</Text>
        <TextInput
          value={budget}
          onChangeText={setBudget}
          style={[styles.input, { color: colors.text, borderColor: colors.borderStrong, backgroundColor: colors.surface2, minHeight: 48 }]}
        />
      </View>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Button
            title="Cancel"
            variant="secondary"
            onPress={() => router.back()}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            title="Post Job"
            onPress={onSubmit}
            isLoading={isSubmitting}
          />
        </View>
      </View>

      <Modal visible={showGovPicker} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "60%" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>Select Governorate</Text>
              <Pressable onPress={() => setShowGovPicker(false)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>
            <FlatList
              data={EGYPT_GOVERNORATES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setGovernorate(item);
                    setShowGovPicker(false);
                  }}
                  style={{ padding: 16, borderBottomWidth: 1, borderColor: colors.border }}
                >
                  <Text style={{ color: colors.text, fontSize: 16 }}>{item}</Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flexGrow: 1, justifyContent: "center" },
  card: { borderRadius: 16, padding: 32, alignItems: "center", maxWidth: 400, width: "100%", alignSelf: "center" },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, width: "100%" },
  categoryChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 8 },
});
