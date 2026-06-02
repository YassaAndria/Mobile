import React, { forwardRef } from "react";
import { StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";
import { useTheme } from "../../theme/ThemeContext";

type InputProps = TextInputProps & {
  label: string;
  error?: string;
};

export const Input = forwardRef<TextInput, InputProps>(({ label, error, style, ...props }, ref) => {
  const { colors, isDark } = useTheme();
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: isDark ? "#D1D5DB" : "#374151" }]}>{label}</Text>
      <TextInput
        ref={ref}
        placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
        style={[
          styles.input,
          {
            backgroundColor: colors.surface2,
            borderColor: error ? "#EF4444" : isDark ? "#4B5563" : "#D1D5DB",
            color: colors.text,
          },
          style,
        ]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
});

Input.displayName = "Input";

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "500", marginBottom: 8 },
  input: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
  },
  error: { fontSize: 12, color: "#EF4444", marginTop: 4 },
});
