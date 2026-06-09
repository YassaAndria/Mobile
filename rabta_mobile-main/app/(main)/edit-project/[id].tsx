/* eslint-disable @typescript-eslint/no-explicit-any */
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import axiosInstance from "../../../src/api/axiosInstance";
import { useTheme } from "../../../src/theme/ThemeContext";
import { Button } from "../../../src/components/ui/Button";
import { typography } from "../../../src/theme/typography";

const EGYPT_GOVERNORATES = [
  'Alexandria','Assiut','Aswan','Beheira','Beni Suef','Cairo','Dakahlia',
  'Damietta','Fayoum','Gharbia','Giza','Ismailia','Kafr Al Sheikh','Luxor',
  'Matrouh','Menofia','Minya','New Valley','North Sinai','Port Said',
  'Qaliubiya','Qena','Red Sea','Sharkia','Sohag','South Sinai','Suez'
];

const WORK_LOCATIONS = [
  { label: "Remote", value: "remote" },
  { label: "On-site", value: "onsite" },
];

function ChipSelect({ label, options, value, onChange, colors }: any) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 8 }}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((opt: any) => (
          <Pressable key={opt.value} onPress={() => onChange(opt.value)}
            style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5,
              borderColor: value === opt.value ? colors.purple : colors.borderStrong || colors.border,
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

export default function EditProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [responsibilitiesText, setResponsibilitiesText] = useState("");
  const [requirementsText, setRequirementsText] = useState("");
  const [skillsList, setSkillsList] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [workLocation, setWorkLocation] = useState("remote");
  const [governorate, setGovernorate] = useState("");
  const [budget, setBudget] = useState("");
  const [showGovPicker, setShowGovPicker] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const response = await axiosInstance.get(`/jobs/${id}`);
        const job = response.data.data.job;
        setTitle(job.title || "");
        setDescription(job.description || "");
        setResponsibilitiesText((job.responsibilities || []).join('\n'));
        setRequirementsText((job.requirements || []).join('\n'));
        setSkillsList(job.requiredSkills || []);
        setWorkLocation(job.workLocation || "remote");
        setGovernorate(job.location !== 'Remote' ? (job.location || '') : '');
        setBudget(job.budgetOrSalary || "");
      } catch {
        Toast.show({ type: "error", text1: "Failed to load job" });
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleAddSkill = (text: string) => {
    setSkillInput(text);
    if (text.endsWith(',') || text.endsWith('\n')) {
      const val = text.replace(/[,\n]/g, '').trim();
      if (val && !skillsList.includes(val)) setSkillsList(prev => [...prev, val]);
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => setSkillsList(prev => prev.filter(s => s !== skill));

  const save = async () => {
    try {
      setSaving(true);
      await axiosInstance.patch(`/jobs/${id}`, {
        title,
        description,
        requiredSkills: skillsList,
        responsibilities: responsibilitiesText.split('\n').map(s => s.trim()).filter(Boolean),
        requirements: requirementsText.split('\n').map(s => s.trim()).filter(Boolean),
        budgetOrSalary: budget,
        workLocation,
        location: workLocation === 'remote' ? 'Remote' : governorate,
      });
      Toast.show({ type: "success", text1: "Updated" });
      router.back();
    } catch (e: any) {
      Toast.show({ type: "error", text1: e.response?.data?.message || "Failed" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.purple} />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 24, paddingBottom: 80 }}>
      <Text style={[typography.h1, { color: colors.text, marginBottom: 24 }]}>Edit Job</Text>
      
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 8 }}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          style={[styles.input, { color: colors.text, borderColor: colors.borderStrong || colors.border, backgroundColor: colors.surface, minHeight: 48 }]}
        />
      </View>

      <ChipSelect label="Work Location" options={WORK_LOCATIONS} value={workLocation} onChange={setWorkLocation} colors={colors} />

      {workLocation === 'onsite' && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 8 }}>Governorate</Text>
          <Pressable
            onPress={() => setShowGovPicker(true)}
            style={[styles.input, { borderColor: colors.borderStrong || colors.border, backgroundColor: colors.surface, minHeight: 48, justifyContent: 'center' }]}
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
          style={[styles.input, { color: colors.text, borderColor: colors.borderStrong || colors.border, backgroundColor: colors.surface, minHeight: 48 }]}
        />
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 8 }}>Description</Text>
        <TextInput
          multiline
          value={description}
          onChangeText={setDescription}
          style={[
            styles.input,
            { color: colors.text, borderColor: colors.borderStrong || colors.border, backgroundColor: colors.surface, minHeight: 160, textAlignVertical: "top" },
          ]}
        />
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 8 }}>Key Responsibilities (one per line)</Text>
        <TextInput
          multiline
          value={responsibilitiesText}
          onChangeText={setResponsibilitiesText}
          placeholder="e.g. Develop new features..."
          placeholderTextColor={colors.textSubtle ?? colors.border}
          style={[
            styles.input,
            { color: colors.text, borderColor: colors.borderStrong || colors.border, backgroundColor: colors.surface, minHeight: 100, textAlignVertical: "top" },
          ]}
        />
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 8 }}>Requirements (one per line)</Text>
        <TextInput
          multiline
          value={requirementsText}
          onChangeText={setRequirementsText}
          placeholder="e.g. 3+ years experience..."
          placeholderTextColor={colors.textSubtle ?? colors.border}
          style={[
            styles.input,
            { color: colors.text, borderColor: colors.borderStrong || colors.border, backgroundColor: colors.surface, minHeight: 100, textAlignVertical: "top" },
          ]}
        />
      </View>

      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 8 }}>Budget / Salary</Text>
        <TextInput
          value={budget}
          onChangeText={setBudget}
          style={[styles.input, { color: colors.text, borderColor: colors.borderStrong || colors.border, backgroundColor: colors.surface, minHeight: 48 }]}
        />
      </View>

      <Button
        title="Save"
        variant="primary"
        onPress={save}
        isLoading={saving}
        style={{ marginTop: 24 }}
      />

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
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16 },
});
