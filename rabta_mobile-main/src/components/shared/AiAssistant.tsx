import { MaterialIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View, TextInput, ActivityIndicator, ScrollView, Alert } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import axiosInstance from "../../api/axiosInstance";

interface AiAssistantProps {
  chatId: string;
  placeholder?: string;
}

export const AiAssistant: React.FC<AiAssistantProps> = ({
  chatId,
  placeholder = "Ask AI about this chat...",
}) => {
  const { colors, isDark } = useTheme();
  const [showAiPopup, setShowAiPopup] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);

  const handleAsk = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResponse(null);
    try {
      const res = await axiosInstance.post(`/chats/${chatId}/ai/ask`, {
        question: query,
      });
      if (res.data?.status === "success") {
        setResponse(res.data.data);
      }
    } catch (e: any) {
      console.error("[AiAssistant] Error asking AI:", e);
      Alert.alert("AI Error", "Failed to get an answer from the AI.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.col}>
      {showAiPopup && (
        <View
          style={[
            styles.popup,
            {
              backgroundColor: colors.surface,
              borderColor: isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6",
            },
          ]}
        >
          <View style={[styles.popupHeader, { backgroundColor: colors.purple }]}>
            <Text style={styles.popupTitle}>Ask Rabta AI</Text>
            <Pressable onPress={() => setShowAiPopup(false)} hitSlop={8}>
              <MaterialIcons name="close" size={18} color="#fff" />
            </Pressable>
          </View>
          <View style={styles.popupBody}>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                placeholder={placeholder}
                placeholderTextColor={colors.textMuted}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={handleAsk}
                returnKeyType="search"
                editable={!loading}
              />
              <Pressable
                onPress={handleAsk}
                disabled={loading || !query.trim()}
                style={({ pressed }) => [
                  styles.sendButton,
                  { backgroundColor: colors.purple, opacity: (loading || !query.trim()) ? 0.5 : pressed ? 0.8 : 1 }
                ]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <MaterialIcons name="send" size={18} color="#fff" />
                )}
              </Pressable>
            </View>
            
            <View style={styles.resultContainer}>
              {loading ? (
                <ActivityIndicator color={colors.purple} style={{ marginTop: 16 }} />
              ) : response ? (
                <ScrollView style={{ maxHeight: 150 }}>
                   <Text style={[styles.responseText, { color: colors.text }]}>{response}</Text>
                </ScrollView>
              ) : null}
            </View>
          </View>
        </View>
      )}
      <Pressable
        onPress={() => setShowAiPopup(!showAiPopup)}
        style={[styles.fab, { backgroundColor: colors.purple }]}
      >
        <MaterialIcons name="auto-awesome" size={24} color="#fff" />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  col: { alignItems: "flex-end", gap: 12 },
  popup: {
    width: 320,
    maxWidth: "100%",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  popupHeader: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  popupTitle: { color: "#fff", fontWeight: "700", fontSize: 14 },
  popupBody: { padding: 16 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  resultContainer: {
    marginTop: 12,
  },
  responseText: {
    fontSize: 13,
    lineHeight: 20,
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
});
