import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { useTheme } from "../../src/theme/ThemeContext";
import { typography } from "../../src/theme/typography";
import axiosInstance from "../../src/api/axiosInstance";
import Toast from "react-native-toast-message";

export default function EditGroupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ communityId?: string }>();
  const communityId = params.communityId;
  const { colors, isDark } = useTheme();

  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [specializationLabel, setSpecializationLabel] = useState("");
  const [specializations, setSpecializations] = useState<{ _id: string; name: string; value: string }[]>([]);
  
  const [skills, setSkills] = useState<string[]>([]);
  const [currentSkill, setCurrentSkill] = useState("");

  const [privacy, setPrivacy] = useState<"public" | "private">("public");
  const [discussionType, setDiscussionType] = useState<"project" | "learning">("project");
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchSpecializations = async () => {
      try {
        const { data } = await axiosInstance.get('/specializations');
        setSpecializations(data.data?.specializations || []);
      } catch (err) {
        console.error("Failed to load specializations", err);
      }
    };
    fetchSpecializations();
  }, []);

  useEffect(() => {
    const fetchGroupData = async () => {
      if (!communityId) return;
      try {
        setLoading(true);
        const { data } = await axiosInstance.get(`/groups/${communityId}`);
        const group = data.data?.community;
        if (group) {
          setGroupName(group.name || "");
          setDescription(group.description || "");
          setSpecialization(group.category || "");
          setSkills(group.tags || []);
          setPrivacy(group.isPublic ? "public" : "private");
          setDiscussionType(group.groupType || "project");
        }
      } catch (error) {
        Toast.show({
          type: "error",
          text1: "Failed to load group details",
        });
        router.back();
      } finally {
        setLoading(false);
      }
    };
    fetchGroupData();
  }, [communityId]);

  useEffect(() => {
    if (specialization && specializations.length > 0) {
      const found = specializations.find(s => s.value === specialization);
      if (found) {
        setSpecializationLabel(found.name);
      } else {
        setSpecializationLabel(specialization);
      }
    }
  }, [specialization, specializations]);

  const handleAddSkill = (text: string) => {
    const trimmed = text.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
    }
    setCurrentSkill("");
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleSubmit = async () => {
    if (!groupName.trim()) {
      return Alert.alert("Required", "Group Name is required");
    }
    try {
      setIsSubmitting(true);
      const payload = {
        name: groupName.trim(),
        description: description.trim(),
        tags: skills,
        isPublic: privacy === 'public',
        groupType: discussionType,
      };

      await axiosInstance.put(`/groups/${communityId}`, payload);
      Toast.show({
        type: 'success',
        text1: 'Group updated successfully!'
      });
      router.back();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to update group'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputBg = isDark ? colors.surface : "#F9FAFB";
  const inputBorder = isDark ? colors.border : "#E5E7EB";

  const RadioOption = ({
    label,
    value,
    currentValue,
    onSelect,
    desc,
  }: {
    label: string;
    value: string;
    currentValue: string;
    onSelect: (val: any) => void;
    desc: string;
  }) => {
    const isSelected = value === currentValue;
    return (
      <TouchableOpacity
        style={[
          styles.radioCard,
          {
            borderColor: isSelected ? colors.purple : inputBorder,
            backgroundColor: isSelected ? colors.purple10 : inputBg,
          },
        ]}
        onPress={() => onSelect(value)}
        activeOpacity={0.7}
      >
        <View style={styles.radioHeader}>
          <View
            style={[
              styles.radioCircle,
              { borderColor: isSelected ? colors.purple : colors.textMuted },
            ]}
          >
            {isSelected && <View style={[styles.radioDot, { backgroundColor: colors.purple }]} />}
          </View>
          <Text style={[typography.body, { color: colors.text, fontWeight: isSelected ? "700" : "500" }]}>
            {label}
          </Text>
        </View>
        <Text style={[typography.caption, { color: colors.textMuted, marginLeft: 28, marginTop: 4 }]}>
          {desc}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.purple} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: 'Edit Group' }} />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            paddingTop: Platform.OS === "ios" ? 50 : 20,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={[
            styles.iconButton,
            { backgroundColor: isDark ? "rgba(139,92,246,0.15)" : "#EDE9FE" },
          ]}
        >
          <Ionicons name="arrow-back" size={24} color={colors.purple} />
        </TouchableOpacity>
        <Text style={[typography.h2, { color: colors.text }]}>Edit Group</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Form Fields */}
        <View style={styles.formSection}>
          {/* Group Name */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={[typography.label, { color: colors.text }]}>Group Name *</Text>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                {groupName.length}/50
              </Text>
            </View>
            <TextInput
              style={[
                styles.textInput,
                { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text },
              ]}
              placeholder="e.g. React Native Enthusiasts"
              placeholderTextColor={colors.textMuted}
              value={groupName}
              maxLength={50}
              onChangeText={setGroupName}
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={[typography.label, { color: colors.text }]}>Description</Text>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                {description.length}/200
              </Text>
            </View>
            <TextInput
              style={[
                styles.textInput,
                styles.textArea,
                { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text },
              ]}
              placeholder="What is the purpose of this group?"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={200}
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />
          </View>

          {/* Specialization (Read Only) */}
          <View style={styles.inputGroup}>
            <Text style={[typography.label, { color: colors.textMuted, marginBottom: 8 }]}>
              Technical Specialization (Read Only)
            </Text>
            <View
              style={[
                styles.readOnlyInput,
                { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6", borderColor: colors.border },
              ]}
            >
              <Text style={[typography.body, { color: colors.textMuted }]}>
                {specializationLabel || "Unknown Specialization"}
              </Text>
              <Ionicons name="lock-closed" size={18} color={colors.textMuted} style={{ opacity: 0.6 }} />
            </View>
          </View>

          {/* Keywords & Skills */}
          <View style={styles.inputGroup}>
            <Text style={[typography.label, { color: colors.text, marginBottom: 8 }]}>
              Keywords & Skills
            </Text>
            <View
              style={[
                styles.tagsContainer,
                { backgroundColor: inputBg, borderColor: inputBorder },
              ]}
            >
              {skills.map((skill) => (
                <View key={skill} style={[styles.tag, { backgroundColor: colors.purple10 }]}>
                  <Text style={[typography.caption, { color: colors.purple, fontWeight: "600" }]}>
                    {skill}
                  </Text>
                  <TouchableOpacity onPress={() => handleRemoveSkill(skill)} hitSlop={10}>
                    <Ionicons name="close" size={14} color={colors.purple} style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                </View>
              ))}
              <TextInput
                style={[styles.tagInput, { color: colors.text }]}
                placeholder={skills.length === 0 ? "e.g. React, Node (Press Space)" : "Add more..."}
                placeholderTextColor={colors.textMuted}
                value={currentSkill}
                onChangeText={(t) => {
                  if (t.endsWith(" ") || t.endsWith(",")) {
                    handleAddSkill(t.replace(/[, ]/g, ""));
                  } else {
                    setCurrentSkill(t);
                  }
                }}
                onSubmitEditing={() => handleAddSkill(currentSkill)}
                blurOnSubmit={false}
              />
            </View>
          </View>

          {/* Privacy Settings */}
          <View style={styles.inputGroup}>
            <Text style={[typography.label, { color: colors.text, marginBottom: 12 }]}>
              Privacy Setup
            </Text>
            <View style={styles.radioGroup}>
              <RadioOption
                label="Public Group"
                value="public"
                currentValue={privacy}
                onSelect={setPrivacy}
                desc="Anyone on the platform can join."
              />
              <RadioOption
                label="Private Group"
                value="private"
                currentValue={privacy}
                onSelect={setPrivacy}
                desc="Requires approval to join."
              />
            </View>
          </View>

          {/* Discussion Type */}
          <View style={styles.inputGroup}>
            <Text style={[typography.label, { color: colors.text, marginBottom: 12 }]}>
              Discussion Type
            </Text>
            <View style={styles.radioGroup}>
              <RadioOption
                label="Project-based"
                value="project"
                currentValue={discussionType}
                onSelect={setDiscussionType}
                desc="Focused on building a specific project."
              />
              <RadioOption
                label="Learning-based"
                value="learning"
                currentValue={discussionType}
                onSelect={setDiscussionType}
                desc="Focused on sharing knowledge and resources."
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer Actions */}
      <View
        style={[
          styles.footer,
          { backgroundColor: colors.surface, borderTopColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={[styles.footerBtn, styles.cancelBtn]}
          onPress={() => router.back()}
        >
          <Text style={[typography.button, { color: colors.textMuted }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.footerBtn, styles.createBtn, { backgroundColor: colors.purple }]}
          onPress={handleSubmit}
          activeOpacity={0.8}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={[typography.button, { color: "#FFF" }]}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 60,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 120,
  },
  formSection: {
    paddingHorizontal: 16,
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  textInput: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    paddingTop: 16,
    paddingBottom: 16,
  },
  readOnlyInput: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    opacity: 0.8,
  },
  tagsContainer: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 8,
    gap: 8,
    alignItems: "center",
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagInput: {
    flex: 1,
    minWidth: 120,
    height: 34,
    fontSize: 14,
    paddingHorizontal: 4,
  },
  radioGroup: {
    gap: 12,
  },
  radioCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  radioHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 16,
  },
  footerBtn: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    backgroundColor: "transparent",
  },
  createBtn: {
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
});
