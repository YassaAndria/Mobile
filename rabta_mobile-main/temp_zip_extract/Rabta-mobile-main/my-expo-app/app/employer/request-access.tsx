/* eslint-disable @typescript-eslint/no-explicit-any */
import { zodResolver } from "@hookform/resolvers/zod";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { z } from "zod";
import axiosInstance from "../../src/api/axiosInstance";
import { Input } from "../../src/components/ui/Input";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../src/components/ui/Button";
import { useTheme } from "../../src/theme/ThemeContext";
import { typography } from "../../src/theme/typography";

const requestSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  companyEmail: z.string().email("Invalid company email"),
  linkedinUrl: z
    .string()
    .optional()
    .refine((val) => !val || val.startsWith("https://www.linkedin.com/company/"), {
      message: "Must be a valid LinkedIn company URL",
    }),
  contactPersonName: z.string().min(2, "Contact name is required"),
  industry: z.string().min(1, "Please select an industry"),
  companySize: z.enum(["1-10", "11-50", "51-200", "201-500", "500+"]),
  website: z.string().url().optional().or(z.literal("")),
  message: z.string().optional(),
});

type RequestFormData = z.infer<typeof requestSchema>;

const industries = ["", "Technology", "Design", "Marketing", "Finance", "Healthcare", "Other"];
const sizes = ["1-10", "11-50", "51-200", "201-500", "500+"] as const;

export default function RequestAccessScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      companyName: "",
      companyEmail: "",
      linkedinUrl: "",
      contactPersonName: "",
      industry: "Technology",
      companySize: "1-10",
      website: "",
      message: "",
    },
  });

  const onSubmit = async (data: RequestFormData) => {
    try {
      setLoading(true);
      await axiosInstance.post("/employer/request", data);
      setSubmitted(true);
      Toast.show({ type: "success", text1: "Request submitted successfully!" });
    } catch (error: any) {
      Toast.show({ type: "error", text1: error.response?.data?.message || "Failed to submit request" });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg, padding: 24 }]}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.ok, { backgroundColor: colors.successBg }]}>
            <MaterialIcons name="check-circle" size={48} color={colors.successText} />
          </View>
          <Text style={[typography.h2, { color: colors.text, marginBottom: 16 }]}>Request Sent!</Text>
          <Text style={[typography.body, { color: colors.textSubtle, textAlign: "center", marginBottom: 32 }]}>
            We&apos;ve received your partnership request. Our team will review your application within 2-3 business days.
          </Text>
          <Button title="Back to Login" onPress={() => router.replace("/login")} />
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Text style={[typography.h1, { color: colors.purple, textAlign: "center", marginBottom: 12 }]}>Partner with Rabta</Text>
      <Text style={[typography.body, { color: colors.textSubtle, textAlign: "center", marginBottom: 32 }]}>
        Join our network of elite companies and hire top talent
      </Text>

      <View style={[styles.form, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Controller
          control={control}
          name="companyName"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input label="Company Name" value={value} onChangeText={onChange} onBlur={onBlur} placeholder="e.g. TechVortex" error={errors.companyName?.message} />
          )}
        />
        <Controller
          control={control}
          name="companyEmail"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input label="Official Company Email" value={value} onChangeText={onChange} onBlur={onBlur} placeholder="name@company.com" keyboardType="email-address" autoCapitalize="none" error={errors.companyEmail?.message} />
          )}
        />
        <Controller
          control={control}
          name="linkedinUrl"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input label="LinkedIn Company Page (Recommended)" value={value} onChangeText={onChange} onBlur={onBlur} placeholder="https://linkedin.com/company/..." error={errors.linkedinUrl?.message} />
          )}
        />
        <Controller
          control={control}
          name="contactPersonName"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input label="Contact Person Name" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.contactPersonName?.message} />
          )}
        />

        <Text style={[typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Industry</Text>
        <Controller
          control={control}
          name="industry"
          render={({ field: { onChange, value } }) => (
            <View style={[styles.pickerRow, { borderColor: colors.borderStrong, backgroundColor: colors.surface2 }]}>
              {industries.filter(Boolean).map((ind) => (
                <Pressable key={ind} onPress={() => onChange(ind)} style={[styles.chip, value === ind && { backgroundColor: colors.purple10 }]}>
                  <Text style={{ color: colors.text, fontSize: 13 }}>{ind}</Text>
                </Pressable>
              ))}
            </View>
          )}
        />
        {errors.industry ? <Text style={[typography.caption, { color: colors.errorText, marginBottom: 8 }]}>{errors.industry.message}</Text> : null}

        <Text style={[typography.label, { color: colors.textMuted, marginBottom: 8, marginTop: 8 }]}>Company Size</Text>
        <Controller
          control={control}
          name="companySize"
          render={({ field: { onChange, value } }) => (
            <View style={styles.sizeRow}>
              {sizes.map((size) => (
                <Pressable
                  key={size}
                  onPress={() => onChange(size)}
                  style={[
                    styles.sizeBtn,
                    { borderColor: colors.border },
                    value === size && { backgroundColor: colors.purple, borderColor: colors.purple },
                  ]}
                >
                  <Text style={[styles.sizeText, { color: colors.text }, value === size && { color: "#fff" }]}>{size}</Text>
                </Pressable>
              ))}
            </View>
          )}
        />

        <Controller
          control={control}
          name="website"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input label="Company Website (Optional)" value={value} onChangeText={onChange} onBlur={onBlur} placeholder="https://..." error={errors.website?.message} />
          )}
        />

        <Text style={[typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Why do you want to join Rabta? (Optional)</Text>
        <Controller
          control={control}
          name="message"
          render={({ field: { onChange, value } }) => (
            <TextInput
              value={value}
              onChangeText={onChange}
              multiline
              numberOfLines={4}
              placeholder="Tell us about your hiring needs..."
              placeholderTextColor={colors.textSubtle}
              style={[
                styles.area,
                { backgroundColor: colors.surface2, borderColor: colors.borderStrong, color: colors.text },
              ]}
            />
          )}
        />

        <Button
          title="Submit Request"
          onPress={handleSubmit(onSubmit)}
          isLoading={loading}
          style={{ marginTop: 8 }}
        />
      </View>

      <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 32 }}>
        <Text style={[typography.body, { color: colors.textSubtle }]}>
          Already have an account?
        </Text>
        <Button
          title="Log In"
          variant="secondary"
          size="sm"
          onPress={() => router.replace("/login")}
        />
      </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 80 },
  centered: { flex: 1, justifyContent: "center" },
  card: { borderRadius: 24, padding: 40, borderWidth: 1, maxWidth: 400, width: "100%", alignSelf: "center", alignItems: "center" },
  ok: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  form: { borderRadius: 24, padding: 24, borderWidth: 1 },
  pickerRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 8, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  sizeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  sizeBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1 },
  sizeText: { fontSize: 13, fontWeight: "700" },
  area: { minHeight: 120, borderRadius: 12, borderWidth: 1, padding: 16, textAlignVertical: "top", marginBottom: 16 },
});
