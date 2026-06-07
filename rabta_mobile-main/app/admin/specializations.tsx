import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import axiosInstance from "../../src/api/axiosInstance";
import { useTheme } from "../../src/theme/ThemeContext";

interface Specialization {
  _id: string;
  name: string;
  value: string;
  createdAt: string;
}

export default function AdminSpecializationsScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newName, setNewName] = useState("");

  const fetchSpecializations = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get("/specializations");
      setSpecializations(data.data?.specializations || []);
    } catch (error) {
      console.error("Failed to load specializations", error);
      Alert.alert("Error", "Failed to load specializations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpecializations();
  }, []);

  const handleAddSpecialization = async () => {
    if (!newName.trim()) return;

    try {
      setIsSubmitting(true);
      const { data } = await axiosInstance.post("/admin/specializations", {
        name: newName.trim(),
      });
      
      const added = data.data?.specialization;
      if (added) {
        setSpecializations((prev) => [...prev, added]);
        Alert.alert("Success", "Specialization added successfully!");
        setNewName("");
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || "Failed to add specialization";
      Alert.alert("Error", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const cardBg = isDark ? "#1E1E24" : "#FFFFFF";
  const inputBg = isDark ? "#121214" : "#F9FAFB";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Screen Header */}
      <View style={styles.screenHeader}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Specializations</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            Manage community creation categories
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Form Card */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Add New Specialization</Text>
          
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Display Name</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: inputBg,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="e.g., Mobile Development"
              placeholderTextColor={colors.textMuted}
              value={newName}
              onChangeText={setNewName}
            />
            <Text style={[styles.infoText, { color: colors.textMuted }]}>
              The database value (e.g. mobile_development) is generated automatically.
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.btnPrimary,
              {
                backgroundColor: colors.purple,
                opacity: isSubmitting || !newName.trim() ? 0.6 : 1,
              },
            ]}
            onPress={handleAddSpecialization}
            disabled={isSubmitting || !newName.trim()}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <MaterialIcons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.btnText}>Add Specialization</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* List Card */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border, marginTop: 16 }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 0 }]}>Existing Specializations</Text>
            <TouchableOpacity onPress={fetchSpecializations} style={{ padding: 4 }}>
              <MaterialIcons name="refresh" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={[styles.separator, { backgroundColor: colors.border }]} />

          {loading ? (
            <ActivityIndicator size="small" color={colors.purple} style={{ marginVertical: 20 }} />
          ) : specializations.length === 0 ? (
            <View style={{ paddingVertical: 20, alignItems: "center" }}>
              <MaterialIcons name="local-offer" size={36} color={colors.textMuted} style={{ opacity: 0.5, marginBottom: 8 }} />
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>No specializations found. Add one above!</Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {specializations.map((spec) => (
                <View key={spec._id} style={[styles.listItem, { borderColor: colors.border, backgroundColor: colors.surface2 }]}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[styles.itemName, { color: colors.text }]}>{spec.name}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <View style={[styles.dbValueBadge, { backgroundColor: colors.border }]}>
                        <Text style={{ color: colors.text, fontSize: 10, fontFamily: "monospace" }}>{spec.value}</Text>
                      </View>
                      <Text style={{ color: colors.textMuted, fontSize: 10 }}>
                        {new Date(spec.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  formGroup: {
    gap: 6,
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  infoText: {
    fontSize: 11,
    lineHeight: 14,
  },
  btnPrimary: {
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  btnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  separator: {
    height: 1,
    marginBottom: 12,
  },
  listItem: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
  },
  dbValueBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
});
