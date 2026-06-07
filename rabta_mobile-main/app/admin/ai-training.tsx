import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Stack } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import axiosInstance from "../../src/api/axiosInstance";
import { useTheme } from "../../src/theme/ThemeContext";

export default function AdminAITrainingScreen() {
  const { colors, isDark } = useTheme();
  const [knowledgeText, setKnowledgeText] = useState("");
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chunks, setChunks] = useState<any[]>([]);
  const [isLoadingChunks, setIsLoadingChunks] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const fetchKnowledgeBase = async () => {
    setIsLoadingChunks(true);
    try {
      const res = await axiosInstance.get("/ai/global-knowledge");
      if (res.data?.status === "success") {
        setChunks(res.data.data || []);
      }
    } catch (err: any) {
      console.error("Failed to load global knowledge", err);
    } finally {
      setIsLoadingChunks(false);
    }
  };

  useEffect(() => {
    fetchKnowledgeBase();
  }, []);

  const handleEditSave = async (id: string) => {
    if (!editText.trim()) {
      Alert.alert("Error", "Text cannot be empty / لا يمكن ترك النص فارغاً");
      return;
    }
    try {
      const res = await axiosInstance.put(`/ai/global-knowledge/${id}`, { text: editText.trim() });
      if (res.data?.status === "success") {
        Alert.alert("Success", "Knowledge chunk updated successfully / تم التعديل بنجاح");
        setEditingId(null);
        fetchKnowledgeBase();
      }
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.message || "Failed to update knowledge chunk");
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this knowledge chunk? / هل أنت متأكد من حذف هذه البيانات؟",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await axiosInstance.delete(`/ai/global-knowledge/${id}`);
              if (res.data?.status === "success") {
                Alert.alert("Success", "Knowledge chunk deleted successfully / تم الحذف بنجاح");
                fetchKnowledgeBase();
              }
            } catch (err: any) {
              Alert.alert("Error", err.response?.data?.message || "Failed to delete knowledge chunk");
            }
          }
        }
      ]
    );
  };

  // Client-Side File Reading Logic
  const handleFileUpload = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "text/plain",
        copyToCacheDirectory: true,
      });

      if (res.canceled || !res.assets || res.assets.length === 0) return;

      const file = res.assets[0];

      // Validate that the file is indeed a text file
      if (!file.name.endsWith(".txt")) {
        Alert.alert("Error", "Only text documents (.txt) are supported / يدعم فقط ملفات النصوص");
        return;
      }

      const content = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      setKnowledgeText(content);
      setLoadedFileName(file.name);
      Alert.alert("Success", `Successfully loaded ${file.name} / تم تحميل الملف بنجاح`);
    } catch (err) {
      console.error("[AdminAITraining] Failed to read file:", err);
      Alert.alert("Error", "Failed to read the file / فشل في قراءة الملف");
      setLoadedFileName(null);
    }
  };

  // Submit Handler for vector store feeding
  const handleSubmit = async () => {
    if (!knowledgeText.trim()) {
      Alert.alert("Warning", "Please provide some training data text / يرجى إدخال نص لتغذية الذكاء الاصطناعي");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      data: [
        { text: knowledgeText.trim() }
      ]
    };

    const paths = [
      "/ai/create-vector-store",
      "/api/ai/create-vector-store",
      "/create-vector-store"
    ];

    let success = false;
    let errorMessage = "Failed to train global knowledge base";

    for (const path of paths) {
      try {
        const res = await axiosInstance.post(path, payload);
        if (res.data?.status === "success" || res.data?.message) {
          success = true;
          break;
        }
      } catch (err: any) {
        if (err.response?.status !== 404) {
          errorMessage = err.response?.data?.message || err.message || errorMessage;
        }
      }
    }

    if (success) {
      Alert.alert("Success", "Global AI Knowledge Base updated successfully! 🚀");
      setKnowledgeText("");
      setLoadedFileName(null);
      fetchKnowledgeBase();
    } else {
      Alert.alert("Training Failed", errorMessage);
    }

    setIsSubmitting(false);
  };

  // Theme-aware dynamic styles
  const cardBg = isDark ? "#1E1E24" : "#FFFFFF";
  const inputBg = isDark ? "#121214" : "#F9FAFB";

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.bg }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* Header section */}
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: isDark ? "rgba(108, 99, 255, 0.15)" : "rgba(108, 99, 255, 0.1)" }]}>
          <MaterialIcons name="storage" size={14} color={colors.purple} />
          <Text style={[styles.badgeText, { color: colors.purple }]}>Core AI System</Text>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          AI Knowledge Base
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Train the system-wide global chatbot assistant with rules, guidelines, or reference documents.
        </Text>
      </View>

      {/* Main card */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: isDark ? "rgba(108, 99, 255, 0.15)" : "rgba(108, 99, 255, 0.1)" }]}>
            <MaterialIcons name="psychology" size={24} color={colors.purple} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Feed Global AI</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
              Provide context data to generate vector embeddings for global search queries.
            </Text>
          </View>
        </View>

        <View style={styles.separator} />

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Paste Text / Content</Text>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: inputBg,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            multiline
            numberOfLines={10}
            textAlignVertical="top"
            placeholder="Paste project rules, guidelines, or global data here..."
            placeholderTextColor={colors.textMuted}
            value={knowledgeText}
            onChangeText={setKnowledgeText}
          />
        </View>

        {/* Upload Document Box */}
        <View style={[styles.uploadBox, { backgroundColor: inputBg, borderColor: colors.border }]}>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <MaterialIcons name="cloud-upload" size={18} color={colors.purple} />
              <Text style={[styles.uploadTitle, { color: colors.text }]}>Upload Text Document</Text>
            </View>
            <Text style={[styles.uploadSubtitle, { color: colors.textMuted }]}>
              Supported formats: UTF-8 plain text (.txt)
            </Text>
          </View>

          <View style={{ alignItems: "flex-end", gap: 6 }}>
            {loadedFileName && (
              <View style={[styles.fileBadge, { backgroundColor: isDark ? "rgba(108, 99, 255, 0.15)" : "rgba(108, 99, 255, 0.1)" }]}>
                <Text style={{ fontSize: 10, color: colors.purple, fontWeight: "600" }} numberOfLines={1}>
                  {loadedFileName}
                </Text>
              </View>
            )}
            <TouchableOpacity style={[styles.btnSecondary, { borderColor: colors.border }]} onPress={handleFileUpload}>
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: "600" }}>Choose File</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Submit Action Button */}
        <TouchableOpacity
          style={[
            styles.btnPrimary,
            {
              backgroundColor: colors.purple,
              opacity: isSubmitting || !knowledgeText.trim() ? 0.6 : 1,
            },
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting || !knowledgeText.trim()}
        >
          {isSubmitting ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.btnText}>Processing Vector Embeddings...</Text>
            </View>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <MaterialIcons name="bolt" size={20} color="#FFFFFF" />
              <Text style={styles.btnText}>Add to Global AI</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Existing Knowledge Base List */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border, marginTop: 20 }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: isDark ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.1)" }]}>
            <MaterialIcons name="list" size={24} color="#3B82F6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Manage Existing Knowledge</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
              View, edit, or delete previously added training data.
            </Text>
          </View>
          <TouchableOpacity onPress={fetchKnowledgeBase} style={{ padding: 6 }}>
            <MaterialIcons name="refresh" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.separator} />

        {isLoadingChunks ? (
          <ActivityIndicator size="small" color={colors.purple} style={{ marginVertical: 20 }} />
        ) : chunks.length === 0 ? (
          <View style={{ paddingVertical: 20, alignItems: "center" }}>
            <MaterialIcons name="folder-open" size={36} color={colors.textMuted} style={{ opacity: 0.5, marginBottom: 8 }} />
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>No knowledge chunks found. Add some above!</Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {chunks.map((chunk) => (
              <View
                key={chunk._id}
                style={[
                  styles.chunkCard,
                  {
                    backgroundColor: colors.surface2,
                    borderColor: colors.border,
                  },
                ]}
              >
                {editingId === chunk._id ? (
                  <View style={{ gap: 8 }}>
                    <TextInput
                      style={[
                        styles.chunkEditInput,
                        {
                          backgroundColor: inputBg,
                          color: colors.text,
                          borderColor: colors.purple,
                        },
                      ]}
                      multiline
                      value={editText}
                      onChangeText={setEditText}
                    />
                    <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
                      <TouchableOpacity
                        style={[styles.btnMini, { backgroundColor: colors.border }]}
                        onPress={() => setEditingId(null)}
                      >
                        <Text style={{ color: colors.text, fontSize: 11, fontWeight: "600" }}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.btnMini, { backgroundColor: colors.purple }]}
                        onPress={() => handleEditSave(chunk._id)}
                      >
                        <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>Save</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <Text style={{ flex: 1, color: colors.text, fontSize: 13, fontFamily: "monospace", lineHeight: 18 }}>
                      {chunk.text}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      <TouchableOpacity
                        onPress={() => {
                          setEditingId(chunk._id);
                          setEditText(chunk.text);
                        }}
                        style={[styles.actionBtnMini, { backgroundColor: isDark ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.1)" }]}
                      >
                        <MaterialIcons name="edit" size={14} color="#3B82F6" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDelete(chunk._id)}
                        style={[styles.actionBtnMini, { backgroundColor: colors.errorBg }]}
                      >
                        <MaterialIcons name="delete" size={14} color={colors.errorText} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 40,
    paddingBottom: 80,
  },
  header: {
    marginBottom: 24,
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    gap: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(128,128,128,0.2)",
    marginVertical: 4,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    minHeight: 180,
  },
  uploadBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  uploadTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  uploadSubtitle: {
    fontSize: 10,
  },
  btnSecondary: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  fileBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    maxWidth: 120,
  },
  btnPrimary: {
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  btnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  chunkCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  chunkEditInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    minHeight: 100,
    textAlignVertical: "top",
  },
  btnMini: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  actionBtnMini: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
});
