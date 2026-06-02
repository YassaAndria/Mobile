import { MaterialIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeContext";

interface AiAssistantProps {
  placeholder?: string;
}

export const AiAssistant: React.FC<AiAssistantProps> = ({
  placeholder = "How can I help you today?",
}) => {
  const { colors, isDark } = useTheme();
  const [showAiPopup, setShowAiPopup] = useState(false);

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
            <Text style={styles.popupTitle}>Rabta AI Assistant</Text>
            <Pressable onPress={() => setShowAiPopup(false)} hitSlop={8}>
              <MaterialIcons name="close" size={18} color="#fff" />
            </Pressable>
          </View>
          <View style={styles.popupBody}>
            <Text style={[styles.placeholder, { color: colors.textMuted }]}>{placeholder}</Text>
          </View>
        </View>
      )}
      <Pressable
        onPress={() => setShowAiPopup(!showAiPopup)}
        style={[styles.fab, { backgroundColor: colors.purple }]}
      >
        <MaterialIcons name="bolt" size={24} color="#fff" />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  col: { alignItems: "center", gap: 12 },
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
  popupBody: { minHeight: 128, padding: 16 },
  placeholder: { fontSize: 12, fontStyle: "italic" },
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
