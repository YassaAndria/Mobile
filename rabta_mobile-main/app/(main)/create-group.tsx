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
  Modal,
  FlatList,
  Keyboard,
  TouchableWithoutFeedback,
  Dimensions,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useTheme } from "../../src/theme/ThemeContext";
import { typography } from "../../src/theme/typography";
import { createCommunity } from "../../src/api/community";
import axiosInstance from "../../src/api/axiosInstance";
import { getApiErrorMessage } from "../../src/api/getApiErrorMessage";

const { width } = Dimensions.get("window");

const SPECIALIZATIONS = [
  "Front-End Development",
  "Back-End Development",
  "Mobile App Development",
  "UI/UX Design",
  "Data Science",
  "DevOps & Cloud",
  "Cybersecurity",
  "Product Management",
];

type ContactRow = { id: string; name: string; avatar?: string; role?: string };

export default function CreateGroupScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [isSpecModalVisible, setSpecModalVisible] = useState(false);
  
  const [skills, setSkills] = useState<string[]>([]);
  const [currentSkill, setCurrentSkill] = useState("");

  const [privacy, setPrivacy] = useState<"public" | "private">("public");
  const [discussionType, setDiscussionType] = useState<"project" | "learning">("project");
  
  const [selectedConnections, setSelectedConnections] = useState<string[]>([]);
  const [connections, setConnections] = useState<ContactRow[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await axiosInstance.get("/users/my-contacts");
        const raw =
          res.data?.data?.contacts ?? res.data?.contacts ?? res.data?.data ?? [];
        const list = (Array.isArray(raw) ? raw : []).map((u: Record<string, unknown>) => ({
          id: String(u._id ?? u.id ?? ""),
          name: String(u.fullName ?? u.name ?? "User"),
          avatar: (u.avatar ?? u.profilePicture) as string | undefined,
          role: String(u.jobTitle ?? u.role ?? ""),
        })).filter((c) => c.id);
        setConnections(list);
      } catch {
        setConnections([]);
      } finally {
        setLoadingContacts(false);
      }
    })();
  }, []);

  const inputBg = isDark ? colors.surface : "#F9FAFB";
  const inputBorder = isDark ? colors.border : "#E5E7EB";

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      return alert("Group Name is required");
    }
    if (!description.trim()) {
      return alert("Description is required");
    }
    setLoading(true);
    try {
      await createCommunity({
        name: groupName.trim(),
        description: description.trim(),
        category: specialization || "general",
        tags: skills.length > 0 ? skills : undefined,
        isPublic: privacy === "public",
        invitedUsers:
          selectedConnections.length > 0 ? selectedConnections : undefined,
      });
      router.push("/community");
    } catch (e: unknown) {
      alert(getApiErrorMessage(e, "Failed to create group"));
    } finally {
      setLoading(false);
    }
  };

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

  const toggleConnection = (id: string) => {
    setSelectedConnections((prev) =>
      prev.includes(id) ? prev.filter((connId) => connId !== id) : [...prev, id]
    );
  };

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

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
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
          onPress={() => router.push("/community")}
          style={[
            styles.iconButton,
            { backgroundColor: isDark ? "rgba(139,92,246,0.15)" : "#EDE9FE" },
          ]}
        >
          <Ionicons name="arrow-back" size={24} color={colors.purple} />
        </TouchableOpacity>
        <Text style={[typography.h2, { color: colors.text }]}>Create New Group</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.coverPhoto,
              {
                backgroundColor: isDark ? colors.surface2 : colors.bgAlt,
                borderColor: colors.borderStrong,
              },
            ]}
          >
            <Ionicons name="image-outline" size={32} color={colors.textMuted} />
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 8 }]}>
              Upload Cover Photo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.avatarWrapper, { borderColor: "#FFF" }]}
          >
            <View style={[styles.avatarInner, { backgroundColor: colors.purple10 }]}>
              <MaterialIcons name="camera-alt" size={28} color={colors.purple} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          {/* Group Name */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={[typography.label, { color: colors.text }]}>Group Name</Text>
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
              onChangeText={(t) => setGroupName(t.slice(0, 50))}
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
              textAlignVertical="top"
              value={description}
              onChangeText={(t) => setDescription(t.slice(0, 200))}
            />
          </View>

          {/* Specialization */}
          <View style={styles.inputGroup}>
            <Text style={[typography.label, { color: colors.text, marginBottom: 8 }]}>
              Technical Specialization
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.selectButton,
                { backgroundColor: inputBg, borderColor: inputBorder },
              ]}
              onPress={() => setSpecModalVisible(true)}
            >
              <Text
                style={[
                  typography.body,
                  { color: specialization ? colors.text : colors.textMuted },
                ]}
              >
                {specialization || "Select a specialization"}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
            </TouchableOpacity>
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
                desc="Anyone can find and join the group."
              />
              <RadioOption
                label="Private Group"
                value="private"
                currentValue={privacy}
                onSelect={setPrivacy}
                desc="Only invited members can join."
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

          {/* Connection Invites */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={[typography.label, { color: colors.text }]}>Invite Connections</Text>
              <Text style={[typography.caption, { color: colors.purple, fontWeight: "600" }]}>
                {selectedConnections.length} Selected
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.connectionsScroll}
            >
              {loadingContacts ? (
                <Text style={[typography.caption, { color: colors.textMuted, paddingVertical: 8 }]}>
                  Loading contacts…
                </Text>
              ) : connections.length === 0 ? (
                <Text style={[typography.caption, { color: colors.textMuted, paddingVertical: 8 }]}>
                  No contacts yet. Add people from Contacts first.
                </Text>
              ) : null}
              {connections.map((conn) => {
                const isSelected = selectedConnections.includes(conn.id);
                return (
                  <TouchableOpacity
                    key={conn.id}
                    activeOpacity={0.8}
                    style={[
                      styles.connectionCard,
                      {
                        backgroundColor: isDark ? colors.surface2 : colors.surface,
                        borderColor: isSelected ? colors.purple : colors.border,
                      },
                    ]}
                    onPress={() => toggleConnection(conn.id)}
                  >
                    <View style={styles.connectionAvatarWrapper}>
                      {conn.avatar ? (
                        <Image source={{ uri: conn.avatar }} style={styles.connectionAvatar} />
                      ) : (
                        <View style={[styles.connectionAvatar, { backgroundColor: colors.purple10, alignItems: 'center', justifyContent: 'center' }]}>
                          <Text style={{ color: colors.purple, fontWeight: '700' }}>{conn.name[0]}</Text>
                        </View>
                      )}
                      {isSelected && (
                        <View style={[styles.connectionBadge, { backgroundColor: colors.purple }]}>
                          <Ionicons name="checkmark" size={10} color="#fff" />
                        </View>
                      )}
                    </View>
                    <Text
                      style={[typography.caption, { color: colors.text, fontWeight: "600", marginTop: 8 }]}
                      numberOfLines={1}
                    >
                      {conn.name}
                    </Text>
                    <Text
                      style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}
                      numberOfLines={1}
                    >
                      {conn.role}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
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
          onPress={() => router.push("/community")}
        >
          <Text style={[typography.button, { color: colors.textMuted }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.footerBtn, styles.createBtn, { backgroundColor: colors.purple }]}
          onPress={handleCreateGroup}
          activeOpacity={0.8}
          disabled={loading}
        >
          {loading ? (
            <Text style={[typography.button, { color: "#FFF" }]}>Creating...</Text>
          ) : (
            <Text style={[typography.button, { color: "#FFF" }]}>Create Group</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Specialization Modal */}
      <Modal
        visible={isSpecModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSpecModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setSpecModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                <View style={styles.modalHeader}>
                  <Text style={[typography.h3, { color: colors.text }]}>Select Specialization</Text>
                  <TouchableOpacity onPress={() => setSpecModalVisible(false)}>
                    <Ionicons name="close" size={24} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={SPECIALIZATIONS}
                  keyExtractor={(item) => item}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.modalOption,
                        {
                          borderBottomColor: colors.border,
                          backgroundColor: specialization === item ? colors.purple10 : "transparent",
                        },
                      ]}
                      onPress={() => {
                        setSpecialization(item);
                        setSpecModalVisible(false);
                      }}
                    >
                      <Text
                        style={[
                          typography.body,
                          {
                            color: specialization === item ? colors.purple : colors.text,
                            fontWeight: specialization === item ? "700" : "400",
                          },
                        ]}
                      >
                        {item}
                      </Text>
                      {specialization === item && (
                        <Ionicons name="checkmark" size={20} color={colors.purple} />
                      )}
                    </TouchableOpacity>
                  )}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingBottom: 100, // Space for footer
  },
  heroSection: {
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 60,
    position: "relative",
  },
  coverPhoto: {
    height: 160,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarWrapper: {
    position: "absolute",
    bottom: -45,
    left: 20,
    width: 98,
    height: 98,
    borderRadius: 49,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInner: {
    width: "100%",
    height: "100%",
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
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
  selectButton: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
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
  connectionsScroll: {
    gap: 16,
    paddingVertical: 8,
  },
  connectionCard: {
    width: 100,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  connectionAvatarWrapper: {
    position: "relative",
  },
  connectionAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  connectionBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFF",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
