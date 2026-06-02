/* eslint-disable @typescript-eslint/no-explicit-any */
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import Toast from "react-native-toast-message";
import { z } from "zod";
import { useTheme } from "../../src/theme/ThemeContext";
import { typography } from "../../src/theme/typography";
import axiosInstance from "../../src/api/axiosInstance";

// ─── Validation Schema (unchanged from original) ──────────────────────────────

const contactSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  phoneNumber: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^\+?\d+$/, "Phone number must contain only digits (optional + at start)")
    .min(8, "Phone number is too short"),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  nickname: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

// ─── Types ────────────────────────────────────────────────────────────────────

interface FoundUser {
  _id: string;
  fullName: string;
  avatar?: string;
  jobTitle?: string;
  role?: string;
  phoneNumber?: string;
}

// ─── Reusable labelled input ──────────────────────────────────────────────────

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
      {children}
      {error ? <Text style={[styles.fieldError, { color: colors.errorText }]}>{error}</Text> : null}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function NewContactScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phoneNumber: "",
      email: "",
      nickname: "",
    },
  });

  const phoneNumber = watch("phoneNumber");

  // ── Step 1: Search for user by phone number ───────────────────────────────
  const handleSearchByPhone = async () => {
    if (!phoneNumber || phoneNumber.length < 8) {
      Toast.show({ type: "error", text1: "Please enter a valid phone number first." });
      return;
    }
    Keyboard.dismiss();
    setIsSearching(true);
    setSearched(false);
    setFoundUser(null);
    try {
      const res = await axiosInstance.get("/users/find-by-phone", {
        params: { phone: phoneNumber },
      });
      const user = res.data?.data?.user;
      setFoundUser(user || null);
    } catch {
      setFoundUser(null);
    } finally {
      setIsSearching(false);
      setSearched(true);
    }
  };

  // ── Step 2: Save connection and open the chat ─────────────────────────────
  const onSubmit = async (data: ContactFormData) => {
    if (!foundUser) {
      Toast.show({ type: "error", text1: "Please search for and find a user first." });
      return;
    }
    try {
      // 1. Add user to connections
      await axiosInstance.post("/users/add-connection", { userId: foundUser._id });
      // 2. Create or fetch the direct chat
      const chatRes = await axiosInstance.post("/chats", { userId: foundUser._id });
      const chatId = chatRes.data?.data?.chat?._id;

      const displayName = data.firstName || foundUser.fullName;
      Toast.show({ type: "success", text1: `${displayName} added to your contacts!` });

      // 3. Navigate directly into the chat
      if (chatId) {
        router.replace({
          pathname: '/ChatWindowScreen',
          params: {
            chatId,
            chatName: displayName,
            isGroup: 'false',
            isOnline: 'false',
            userId: foundUser._id,
          },
        });
      } else {
        router.replace({
          pathname: '/ChatWindowScreen',
          params: {
            chatId: foundUser._id, // Server will resolve on first POST /messages
            chatName: displayName,
            isGroup: 'false',
            isOnline: 'false',
            userId: foundUser._id,
          },
        });
      }
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ?? "Failed to save contact.";
      Toast.show({ type: "error", text1: msg });
    }
  };

  // ── Derived colours ───────────────────────────────────────────────────────
  const inputBg     = isDark ? colors.surface : "#F9FAFB";
  const inputBorder = isDark ? colors.border   : "#E5E7EB";

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.flex}>
          {/* ── Header ── */}
          <View
            style={[
              styles.header,
              {
                backgroundColor: colors.surface,
                borderBottomColor: colors.border,
                paddingTop: Platform.OS === 'ios' ? 50 : 20,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => router.back()}
              style={[
                styles.backBtn,
                { backgroundColor: isDark ? "rgba(139,92,246,0.15)" : "#EDE9FE", zIndex: 999 },
              ]}
              accessibilityLabel="Go back"
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={24} color={colors.purple} />
            </TouchableOpacity>
            <Text style={[typography.h2, { color: colors.text }]}>New Contact</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── Avatar / User Preview ── */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.avatarSection}>
                {foundUser?.avatar ? (
                  <Image
                    source={{ uri: foundUser.avatar }}
                    style={styles.bigAvatar}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.bigAvatarPlaceholder, { backgroundColor: colors.purple10 }]}>
                    <MaterialIcons
                      name={foundUser ? "person" : "person-add"}
                      size={48}
                      color={colors.purple}
                    />
                  </View>
                )}

                {foundUser ? (
                  <View style={styles.foundUserInfo}>
                    <Text style={[styles.foundUserName, { color: colors.text }]}>
                      {foundUser.fullName}
                    </Text>
                    {foundUser.jobTitle ? (
                      <Text style={[styles.foundUserTitle, { color: colors.purple }]}>
                        {foundUser.jobTitle}
                      </Text>
                    ) : null}
                    <View style={[styles.foundBadge, { backgroundColor: colors.successBg }]}>
                      <MaterialIcons name="check-circle" size={14} color={colors.successText} />
                      <Text style={[styles.foundBadgeText, { color: colors.successText }]}>
                        Found on Rabta
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={[styles.avatarHint, { color: colors.textMuted }]}>
                    Enter phone number to find a Rabta user
                  </Text>
                )}
              </View>

              {/* ── Form ── */}
              {/* First Name */}
              <Field label="First Name *" error={errors.firstName?.message}>
                <Controller
                  control={control}
                  name="firstName"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[styles.input, { backgroundColor: inputBg, borderColor: errors.firstName ? colors.errorText : inputBorder, color: colors.text }]}
                      placeholder="Required"
                      placeholderTextColor={colors.textMuted}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                  )}
                />
              </Field>

              {/* Last Name */}
              <Field label="Last Name" error={errors.lastName?.message}>
                <Controller
                  control={control}
                  name="lastName"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text }]}
                      placeholder="Optional"
                      placeholderTextColor={colors.textMuted}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                  )}
                />
              </Field>

              {/* Phone Number + Search Button */}
              <Field label="Phone Number *" error={errors.phoneNumber?.message}>
                <View style={styles.phoneRow}>
                  <Controller
                    control={control}
                    name="phoneNumber"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        style={[
                          styles.input,
                          styles.phoneInput,
                          {
                            backgroundColor: inputBg,
                            borderColor: errors.phoneNumber ? colors.errorText : inputBorder,
                            color: colors.text,
                          },
                        ]}
                        placeholder="01xxxxxxxxx"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="phone-pad"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                      />
                    )}
                  />
                  <Pressable
                    onPress={handleSearchByPhone}
                    disabled={isSearching || !phoneNumber}
                    style={[
                      styles.searchBtn,
                      { backgroundColor: colors.purple10 },
                      (isSearching || !phoneNumber) && styles.disabledBtn,
                    ]}
                  >
                    {isSearching ? (
                      <ActivityIndicator size="small" color={colors.purple} />
                    ) : (
                      <MaterialIcons name="search" size={22} color={colors.purple} />
                    )}
                    <Text style={[styles.searchBtnText, { color: colors.purple }]}>Find</Text>
                  </Pressable>
                </View>

                {/* "Not found" notice — only shown after a real search attempt */}
                {searched && !foundUser && !isSearching ? (
                  <View style={[styles.notFoundBanner, { backgroundColor: isDark ? "rgba(251,191,36,0.1)" : "#FFFBEB", borderColor: isDark ? "rgba(251,191,36,0.3)" : "#FDE68A" }]}>
                    <MaterialIcons name="info" size={18} color="#D97706" />
                    <Text style={[styles.notFoundText, { color: "#D97706" }]}>
                      No Rabta user found with this number. They need to register on Rabta first.
                    </Text>
                  </View>
                ) : null}
              </Field>

              {/* Email */}
              <Field label="Email Address" error={errors.email?.message}>
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[styles.input, { backgroundColor: inputBg, borderColor: errors.email ? colors.errorText : inputBorder, color: colors.text }]}
                      placeholder="example@rabta.com"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                  )}
                />
              </Field>

              {/* Nickname */}
              <Field label="Note / Nickname" error={errors.nickname?.message}>
                <Controller
                  control={control}
                  name="nickname"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text }]}
                      placeholder="e.g. Work colleague, Friend"
                      placeholderTextColor={colors.textMuted}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                  )}
                />
              </Field>

              {/* Submit */}
              <Pressable
                onPress={handleSubmit(onSubmit)}
                disabled={isSubmitting || !foundUser}
                style={[
                  styles.submitBtn,
                  { backgroundColor: colors.purple },
                  (isSubmitting || !foundUser) && styles.disabledBtn,
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <MaterialIcons name="person-add" size={20} color="#FFF" />
                    <Text style={styles.submitBtnText}>
                      {foundUser
                        ? `Add ${foundUser.fullName} & Open Chat`
                        : "Search for a user first"}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 60,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  // Scroll
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },

  // Card
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },

  // Avatar preview
  avatarSection: {
    alignItems: "center",
    paddingBottom: 8,
  },
  bigAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 12,
  },
  bigAvatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarHint: {
    fontSize: 13,
    textAlign: "center",
  },
  foundUserInfo: { alignItems: "center", gap: 4 },
  foundUserName: { fontSize: 17, fontWeight: "700" },
  foundUserTitle: { fontSize: 13, fontWeight: "600" },
  foundBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  foundBadgeText: { fontSize: 11, fontWeight: "700" },

  // Fields
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: "600" },
  fieldError: { fontSize: 11, fontWeight: "500" },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },

  // Phone row
  phoneRow: { flexDirection: "row", gap: 8 },
  phoneInput: { flex: 1 },
  searchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 14,
    borderRadius: 12,
    height: 48,
  },
  searchBtnText: { fontSize: 13, fontWeight: "700" },

  // Not-found notice
  notFoundBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  notFoundText: { flex: 1, fontSize: 13, lineHeight: 18 },

  // Submit
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 54,
    borderRadius: 16,
    marginTop: 8,
  },
  submitBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  disabledBtn: { opacity: 0.45 },
});
