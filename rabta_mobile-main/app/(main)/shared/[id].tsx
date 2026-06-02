import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useTheme } from "../../../src/theme/ThemeContext";
import { typography } from "../../../src/theme/typography";

const SAMPLE = [
  "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&q=80",
  "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80",
  "https://images.unsplash.com/photo-1542744094-3a31f272c490?w=400&q=80",
];

export default function SharedContentScreen() {
  const { id: _id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <MaterialIcons name="arrow-back" size={22} color={colors.purple} />
          <Text style={{ color: colors.purple, fontWeight: "800" }}>Back to Contact</Text>
        </Pressable>
        <Text style={[typography.h1, { color: colors.text }]}>Shared Content</Text>
        <Text style={[typography.bodySmall, { color: colors.textSubtle, marginTop: 4 }]}>265 items shared in this conversation</Text>
      </View>

      <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <MaterialIcons name="search" size={22} color={colors.textSubtle} style={{ marginRight: 8 }} />
        <TextInput placeholder="Search files, links, media..." placeholderTextColor={colors.textSubtle} style={{ flex: 1, color: colors.text }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 24 }}>
        <View style={[styles.tabs, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.tab, { backgroundColor: colors.purple10 }]}>
            <MaterialIcons name="collections" size={20} color={colors.purple} />
            <Text style={{ color: colors.purple, fontWeight: "800" }}>Media (142)</Text>
          </View>
          <View style={styles.tab}>
            <MaterialIcons name="folder" size={20} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, fontWeight: "600" }}>Files (38)</Text>
          </View>
          <View style={styles.tab}>
            <MaterialIcons name="link" size={20} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, fontWeight: "600" }}>Links (85)</Text>
          </View>
        </View>
      </ScrollView>

      <Text style={[typography.h3, { color: colors.text, marginBottom: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border }]}>April 2026</Text>
      <View style={styles.grid}>
        {SAMPLE.map((uri) => (
          <Image key={uri} source={{ uri }} style={[styles.thumb, { backgroundColor: colors.surface }]} contentFit="cover" />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 24, paddingBottom: 48 },
  header: { marginBottom: 24 },
  searchWrap: { flexDirection: "row", alignItems: "center", borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  tabs: { flexDirection: "row", gap: 8, padding: 8, borderRadius: 16, borderWidth: 1 },
  tab: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  thumb: { width: "30%", aspectRatio: 1, borderRadius: 16, minWidth: 100 },
});
