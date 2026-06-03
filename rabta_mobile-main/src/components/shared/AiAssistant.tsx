import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import axiosInstance from "../../api/axiosInstance";
import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from "expo-clipboard";
import Toast from "react-native-toast-message";
import { useRouter } from "expo-router";

interface AiAssistantProps {
  chatId: string;
  placeholder?: string;
}

export const AiAssistant: React.FC<AiAssistantProps> = ({
  chatId,
  placeholder = "Search past messages, details or files...",
}) => {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  // Bottom Sheet Modal Visibility
  const [showAiSheet, setShowAiSheet] = useState(false);

  // Segmented Tabs ('summarize' | 'search')
  const [aiTab, setAiTab] = useState<"summarize" | "search">("summarize");

  // Summarize States
  const [summaryLimit, setSummaryLimit] = useState<number | "All">(10);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryResult, setSummaryResult] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<string | null>(null);
  const [searchFallback, setSearchFallback] = useState(false);

  // Reset states when chatId changes
  useEffect(() => {
    setSummaryResult(null);
    setSummaryError(null);
    setSearchQuery("");
    setSearchResult(null);
    setSearchFallback(false);
  }, [chatId]);

  const handleSummarizeChat = async () => {
    setSummarizing(true);
    setSummaryResult(null);
    setSummaryError(null);
    try {
      const limitVal = summaryLimit === "All" ? 999999 : Number(summaryLimit);
      const res = await axiosInstance.post(
        "/api/ai/chat/summarize",
        {
          chatId,
          limit: limitVal,
        },
        {
          timeout: 60000,
        }
      );
      const dataStr = res.data?.data || "";

      if (
        typeof dataStr === "string" &&
        (dataStr.includes("لا توجد رسائل كافية") ||
          dataStr.includes("لا توجد رسائل كافية لتلخيصها"))
      ) {
        setSummaryError(
          "Cannot summarize: The messages might have been deleted or there are not enough messages in this chat."
        );
      } else {
        setSummaryResult(dataStr);
      }
    } catch (err: any) {
      console.error("[AiAssistant] Summarize failed:", err);
      const errMsg =
        err.response?.data?.message || err.message || "Failed to summarize chat.";
      setSummaryError(errMsg);
    } finally {
      setSummarizing(false);
    }
  };

  const handleSmartSearch = async () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    setSearching(true);
    setSearchResult(null);
    setSearchFallback(false);
    try {
      const res = await axiosInstance.post(
        `/api/ai/smart-search/${chatId}`,
        {
          query: trimmed,
          chatId,
        },
        {
          timeout: 60000,
        }
      );
      const dataStr = res.data?.data || "";
      setSearchResult(dataStr);

      // Check if fallback response detected
      const isFallback = [
        "عذراً، لا أملك",
        "لا أملك معلومات كافية",
        "No relevant messages found",
        "don't have information",
        "cannot find this information",
      ].some((phrase) => dataStr.toLowerCase().includes(phrase.toLowerCase()));

      if (isFallback) {
        setSearchFallback(true);
      }
    } catch (err: any) {
      console.error("[AiAssistant] Smart Search failed:", err);
      const errMsg = err.response?.data?.message || err.message || "Search failed.";
      setSearchResult(`⚠️ ${errMsg}`);
    } finally {
      setSearching(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Toast.show({
        type: "success",
        text1: "Copied to clipboard",
        position: "bottom",
      });
    } catch (err) {
      console.error("[AiAssistant] Copy failed:", err);
    }
  };

  return (
    <View style={styles.container}>
      {/* Floating Action Button */}
      <TouchableOpacity
        onPress={() => setShowAiSheet(true)}
        style={[styles.fab, { shadowColor: colors.purple }]}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={["#7C3AED", "#6366F1"]}
          style={styles.fabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <MaterialIcons name="auto-awesome" size={22} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Bottom Sheet Modal */}
      <Modal
        visible={showAiSheet}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAiSheet(false)}
      >
        <View style={styles.modalOverlay}>
          {/* Backdrop Touch Area */}
          <Pressable style={styles.backdropPressable} onPress={() => setShowAiSheet(false)} />

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardAvoid}
          >
            <View
              style={[
                styles.sheetContent,
                {
                  backgroundColor: colors.surface,
                  borderTopColor: colors.border,
                },
              ]}
            >
              {/* Header Gradient */}
              <LinearGradient
                colors={["#7C3AED", "#6366F1"]}
                style={styles.headerBanner}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <View style={styles.headerLeft}>
                  <View style={styles.iconWrapper}>
                    <MaterialIcons name="bolt" size={18} color="#FBBF24" />
                  </View>
                  <View>
                    <Text style={styles.headerTitle}>Chat AI Assistant</Text>
                    <Text style={styles.headerSubtitle}>Powered by Rabta AI</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setShowAiSheet(false)}
                  style={styles.closeBtn}
                >
                  <MaterialIcons name="close" size={20} color="#fff" />
                </TouchableOpacity>
              </LinearGradient>

              {/* Sheet Scroll Body */}
              <ScrollView
                style={styles.scrollBody}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {/* Disclaimer */}
                <View
                  style={[
                    styles.disclaimerBox,
                    {
                      backgroundColor: isDark ? "rgba(124, 58, 237, 0.12)" : "rgba(124, 58, 237, 0.05)",
                      borderColor: isDark ? "rgba(124, 58, 237, 0.2)" : "rgba(124, 58, 237, 0.1)",
                    },
                  ]}
                >
                  <MaterialIcons
                    name="smart-toy"
                    size={16}
                    color={colors.purple}
                    style={styles.disclaimerIcon}
                  />
                  <Text style={[styles.disclaimerText, { color: colors.text }]}>
                    I only summarize this conversation and search within its messages. For general questions, please use the{" "}
                    <Text style={{ fontWeight: "700", color: colors.purple }}>
                      Global AI Guide
                    </Text>{" "}
                    in the home tab.
                  </Text>
                </View>

                {/* Segmented Tabs Bar */}
                <View
                  style={[
                    styles.tabBar,
                    {
                      backgroundColor: isDark ? "#26262b" : "#F3F4F6",
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => setAiTab("summarize")}
                    style={[
                      styles.tabButton,
                      aiTab === "summarize" && [
                        styles.tabButtonActive,
                        { backgroundColor: colors.surface },
                      ],
                    ]}
                  >
                    <MaterialIcons
                      name="summarize"
                      size={14}
                      color={aiTab === "summarize" ? colors.purple : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.tabButtonText,
                        { color: aiTab === "summarize" ? colors.text : colors.textMuted },
                      ]}
                    >
                      Summarize Chat
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setAiTab("search")}
                    style={[
                      styles.tabButton,
                      aiTab === "search" && [
                        styles.tabButtonActive,
                        { backgroundColor: colors.surface },
                      ],
                    ]}
                  >
                    <MaterialIcons
                      name="saved-search"
                      size={16}
                      color={aiTab === "search" ? colors.purple : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.tabButtonText,
                        { color: aiTab === "search" ? colors.text : colors.textMuted },
                      ]}
                    >
                      Smart Search
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Summarize Chat Content */}
                {aiTab === "summarize" && (
                  <View style={styles.tabContentContainer}>
                    <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                      Summarize last:
                    </Text>

                    {/* Horizontal Pill Limit Options */}
                    <View style={styles.limitPillRow}>
                      {([5, 10, 20, 50, "All"] as const).map((limit) => {
                        const active = summaryLimit === limit;
                        return (
                          <TouchableOpacity
                            key={limit}
                            onPress={() => setSummaryLimit(limit)}
                            style={[
                              styles.limitPill,
                              { borderColor: colors.border },
                              active && {
                                backgroundColor: colors.purple,
                                borderColor: colors.purple,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.limitPillText,
                                { color: active ? "#FFFFFF" : colors.text },
                              ]}
                            >
                              {limit} {limit !== "All" ? "msgs" : ""}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Summarize Action Button */}
                    <TouchableOpacity
                      onPress={handleSummarizeChat}
                      disabled={summarizing}
                      style={[
                        styles.actionBtn,
                        { backgroundColor: colors.purple },
                        summarizing && { opacity: 0.7 },
                      ]}
                    >
                      {summarizing ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <MaterialIcons name="auto-awesome" size={14} color="#FFFFFF" />
                          <Text style={styles.actionBtnText}>Summarize</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    {/* Error Box */}
                    {summaryError && (
                      <View style={[styles.errorBox, { borderColor: "rgba(245, 158, 11, 0.3)" }]}>
                        <MaterialIcons name="warning" size={16} color="#F59E0B" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.errorTitle}>Cannot Summarize</Text>
                          <Text style={styles.errorText}>{summaryError}</Text>
                        </View>
                      </View>
                    )}

                    {/* Results Box */}
                    {summaryResult && (
                      <View
                        style={[
                          styles.resultBox,
                          {
                            backgroundColor: isDark ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.02)",
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <View style={styles.resultHeader}>
                          <Text style={[styles.resultHeaderLabel, { color: colors.purple }]}>
                            Conversation Summary
                          </Text>
                          <TouchableOpacity
                            onPress={() => handleCopy(summaryResult)}
                            style={styles.copyBtn}
                          >
                            <MaterialIcons name="content-copy" size={14} color={colors.textMuted} />
                          </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.resultScroll} nestedScrollEnabled={true}>
                          <Text style={[styles.resultText, { color: colors.text }]}>
                            {summaryResult}
                          </Text>
                        </ScrollView>
                      </View>
                    )}
                  </View>
                )}

                {/* Smart Search Content */}
                {aiTab === "search" && (
                  <View style={styles.tabContentContainer}>
                    <View style={styles.searchRow}>
                      <TextInput
                        style={[
                          styles.searchInput,
                          {
                            color: colors.text,
                            borderColor: colors.border,
                            backgroundColor: isDark ? "rgba(0,0,0,0.1)" : "#FFFFFF",
                          },
                        ]}
                        placeholder={placeholder}
                        placeholderTextColor={colors.textMuted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSmartSearch}
                        returnKeyType="search"
                        editable={!searching}
                      />
                      <TouchableOpacity
                        onPress={handleSmartSearch}
                        disabled={searching || !searchQuery.trim()}
                        style={[
                          styles.searchBtn,
                          { backgroundColor: colors.purple },
                          (searching || !searchQuery.trim()) && { opacity: 0.6 },
                        ]}
                      >
                        {searching ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <MaterialIcons name="search" size={18} color="#FFFFFF" />
                        )}
                      </TouchableOpacity>
                    </View>

                    {/* Results Box */}
                    {searchResult && (
                      <View
                        style={[
                          styles.resultBox,
                          {
                            backgroundColor: isDark ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.02)",
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <View style={styles.resultHeader}>
                          <Text style={[styles.resultHeaderLabel, { color: colors.purple }]}>
                            Search Answer
                          </Text>
                          <TouchableOpacity
                            onPress={() => handleCopy(searchResult)}
                            style={styles.copyBtn}
                          >
                            <MaterialIcons name="content-copy" size={14} color={colors.textMuted} />
                          </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.resultScroll} nestedScrollEnabled={true}>
                          <Text style={[styles.resultText, { color: colors.text }]}>
                            {searchResult}
                          </Text>
                        </ScrollView>
                      </View>
                    )}

                    {/* Fallback Redirection Button */}
                    {searchFallback && (
                      <TouchableOpacity
                        onPress={() => {
                          setShowAiSheet(false);
                          router.push("/ai-chat");
                        }}
                        style={[
                          styles.fallbackBtn,
                          {
                            borderColor: isDark ? "rgba(124, 58, 237, 0.3)" : "rgba(124, 58, 237, 0.2)",
                            backgroundColor: isDark ? "rgba(124, 58, 237, 0.1)" : "rgba(124, 58, 237, 0.05)",
                          },
                        ]}
                      >
                        <MaterialIcons name="assistant" size={14} color={colors.purple} />
                        <Text style={[styles.fallbackBtnText, { color: colors.purple }]}>
                          Ask the Global AI Guide instead
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: "flex-end",
  },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    elevation: 4,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  fabGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  backdropPressable: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  keyboardAvoid: {
    width: "100%",
  },
  sheetContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    overflow: "hidden",
    maxHeight: "85%",
  },
  headerBanner: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  headerSubtitle: {
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: 10,
    fontWeight: "500",
  },
  closeBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  scrollBody: {
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 32,
  },
  disclaimerBox: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  disclaimerIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
  },
  tabBar: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabButtonActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  tabContentContainer: {
    width: "100%",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  limitPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  limitPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  limitPillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  errorBox: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "rgba(245, 158, 11, 0.06)",
    gap: 10,
    marginTop: 16,
  },
  errorTitle: {
    color: "#D97706",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 2,
  },
  errorText: {
    color: "#B45309",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
  },
  resultBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginTop: 16,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.06)",
    paddingBottom: 8,
    marginBottom: 10,
  },
  resultHeaderLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  copyBtn: {
    padding: 4,
  },
  resultScroll: {
    maxHeight: 160,
  },
  resultText: {
    fontSize: 12,
    lineHeight: 18,
  },
  searchRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
  },
  searchBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
  },
  fallbackBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
