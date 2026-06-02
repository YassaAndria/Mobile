import { MaterialIcons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useTheme } from "../../theme/ThemeContext";

type Props = {
  bottomOffset?: number;
};

export function FloatingAiButton({ bottomOffset = 24 }: Props) {
  const { colors, isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const popupBg = colors.surface;
  const popupBorder = colors.border;
  const inputBg = isDark ? "#1A1A1A" : colors.surface2;

  const containerStyle = useMemo(
    () => [styles.container, { bottom: bottomOffset }],
    [bottomOffset],
  );

  return (
    <View style={containerStyle} pointerEvents="box-none">
      {isOpen && (
        <View style={[styles.popup, { backgroundColor: popupBg, borderColor: popupBorder }]}>
          <View style={[styles.popupHeader, { backgroundColor: colors.purple }]}>
            <View style={styles.popupHeaderLeft}>
              <View style={styles.onlineDot} />
              <Text style={styles.popupTitle}>Rabta AI</Text>
            </View>
            <Pressable onPress={() => setIsOpen(false)} hitSlop={10} style={styles.iconBtn}>
              <MaterialIcons name="close" size={18} color="#fff" />
            </Pressable>
          </View>
          <View style={styles.popupBody}>
            <Text style={[styles.popupHint, { color: colors.textMuted }]}>
              I can suggest improvements and help write better profile content.
            </Text>
          </View>
          <View style={[styles.popupFooter, { borderTopColor: colors.border }]}>
            <TextInput
              placeholder="Ask AI..."
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.borderStrong, backgroundColor: inputBg },
              ]}
            />
          </View>
        </View>
      )}

      <Pressable
        onPress={() => setIsOpen((v) => !v)}
        style={[styles.fab, { backgroundColor: colors.purple }]}
        hitSlop={12}
      >
        <MaterialIcons name="bolt" size={20} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 16,
    alignItems: "flex-end",
    zIndex: 999,
  },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  popup: {
    width: 280,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 12,
    marginBottom: 10,
  },
  popupHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  popupHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#4ADE80" },
  popupTitle: { color: "#fff", fontWeight: "800" },
  iconBtn: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  popupBody: { padding: 14, minHeight: 84 },
  popupHint: { fontStyle: "italic", fontSize: 13, lineHeight: 18 },
  popupFooter: { padding: 12, borderTopWidth: 1 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, minHeight: 44 },
});

