/* eslint-disable @typescript-eslint/no-explicit-any */
import { zodResolver } from "@hookform/resolvers/zod";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useDispatch } from "react-redux";
import Toast from "react-native-toast-message";
import { z } from "zod";
import { registerUser } from "../src/api/auth";
import { getApiErrorMessage } from "../src/api/getApiErrorMessage";
import { Input } from "../src/components/ui/Input";
import { Button } from "../src/components/ui/Button";
import ScreenWrapper from "../src/components/layout/ScreenWrapper";
import { setCredentials } from "../src/store/slices/authSlice";
import { useTheme } from "../src/theme/ThemeContext";
import { typography } from "../src/theme/typography";

const signupSchema = z
  .object({
    fullname: z.string().min(3, "Full name must be at least 3 characters"),
    email: z.string().min(1, "Email is required").email("Invalid email format"),
    phone: z.string().min(1, "Phone number is required").regex(/^01[0125][0-9]{8}$/, "Invalid Egyptian phone number"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    role: z.enum(["freelancer", "employer"]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignupFormInputs = z.infer<typeof signupSchema>;

export default function SignupScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { colors, isDark } = useTheme();
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormInputs>({
    resolver: zodResolver(signupSchema),
    defaultValues: { role: "freelancer", fullname: "", email: "", phone: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: SignupFormInputs) => {
    setApiError(null);
    try {
      const responseData = await registerUser({
        fullName: data.fullname,
        email: data.email,
        phoneNumber: data.phone,
        password: data.password,
        role: data.role,
      });
      dispatch(setCredentials({ user: responseData.user, token: responseData.token }));
      const userId = responseData.user.id || responseData.user._id;
      if (userId) {
        await AsyncStorage.setItem(`has_logged_in_${userId}`, "true");
      }
      Toast.show({ type: "success", text1: "Account created! Let's set up your profile." });
      router.replace("/setup-profile");
    } catch (error: unknown) {
      const errorMessage = getApiErrorMessage(error, "Registration failed. Please try again.");
      setApiError(errorMessage);
      Toast.show({ type: "error", text1: errorMessage });
    }
  };


  return (
    <ScreenWrapper scroll contentContainerStyle={styles.scrollContent} extraBottomPadding={48}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.replace("/login")} hitSlop={12}>
          <MaterialIcons name="arrow-back" size={24} color={colors.purple} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Sign Up</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.scrollPadding}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.centerBlock}>
            <Text style={[typography.h2, { color: colors.text, marginBottom: 8 }]}>Create Account</Text>
            <Text style={[typography.body, { color: colors.textSubtle }]}>Join the Rabta community</Text>
          </View>

          {apiError ? (
            <View style={[styles.banner, { backgroundColor: colors.errorBg, borderColor: colors.errorText }]}>
              <Text style={[styles.bannerText, { color: colors.errorText }]}>{apiError}</Text>
            </View>
          ) : null}

          <Text style={[typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Register as:</Text>
          <Controller
            control={control}
            name="role"
            render={({ field: { onChange, value } }) => (
              <View style={[styles.select, { borderColor: colors.borderStrong, backgroundColor: colors.surface2 }]}>
                <Pressable onPress={() => onChange("freelancer")} style={[styles.selectOpt, value === "freelancer" && { backgroundColor: colors.purple10 }]}>
                  <Text style={{ color: colors.text, fontWeight: "600" }}>Freelancer</Text>
                </Pressable>
                <Pressable onPress={() => onChange("employer")} style={[styles.selectOpt, value === "employer" && { backgroundColor: colors.purple10 }]}>
                  <Text style={{ color: colors.text, fontWeight: "600" }}>Employer / Company</Text>
                </Pressable>
              </View>
            )}
          />

          <Controller
            control={control}
            name="fullname"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Full Name" value={value} onChangeText={onChange} onBlur={onBlur} placeholder="Enter your full name" error={errors.fullname?.message} />
            )}
          />
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Email" value={value} onChangeText={onChange} onBlur={onBlur} placeholder="example@mail.com" keyboardType="email-address" autoCapitalize="none" error={errors.email?.message} />
            )}
          />
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Phone Number" value={value} onChangeText={onChange} onBlur={onBlur} placeholder="01xxxxxxxxx" keyboardType="phone-pad" error={errors.phone?.message} />
            )}
          />

          <Text style={[typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Password</Text>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.passWrap}>
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry={!showPassword}
                  placeholder="Min. 8 characters"
                  placeholderTextColor={colors.textSubtle}
                  style={[
                    styles.passInput,
                    {
                      backgroundColor: colors.surface2,
                      borderColor: errors.password ? colors.errorText : colors.borderStrong,
                      color: colors.text,
                    },
                  ]}
                />
                <Pressable style={styles.eye} onPress={() => setShowPassword(!showPassword)}>
                  <MaterialIcons name={showPassword ? "visibility-off" : "visibility"} size={22} color={colors.textSubtle} />
                </Pressable>
              </View>
            )}
          />
          {errors.password ? <Text style={[typography.caption, { color: colors.errorText, marginBottom: 12 }]}>{errors.password.message}</Text> : null}

          <Text style={[typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Confirm Password</Text>
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.passWrap}>
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry={!showConfirmPassword}
                  placeholder="Confirm your password"
                  placeholderTextColor={colors.textSubtle}
                  style={[
                    styles.passInput,
                    {
                      backgroundColor: colors.surface2,
                      borderColor: errors.confirmPassword ? colors.errorText : colors.borderStrong,
                      color: colors.text,
                    },
                  ]}
                />
                <Pressable style={styles.eye} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <MaterialIcons name={showConfirmPassword ? "visibility-off" : "visibility"} size={22} color={colors.textSubtle} />
                </Pressable>
              </View>
            )}
          />
          {errors.confirmPassword ? <Text style={[typography.caption, { color: colors.errorText, marginBottom: 12 }]}>{errors.confirmPassword.message}</Text> : null}

          <Button
            title="Sign Up"
            variant="primary"
            onPress={handleSubmit(onSubmit)}
            isLoading={isSubmitting}
            style={{ marginTop: 16 }}
          />

          <View style={[styles.footerRow, { borderTopColor: colors.border }]}>
            <Text style={[typography.body, { color: colors.textSubtle }]}>Already have an account? </Text>
            <Button
              title="Log In"
              variant="secondary"
              size="sm"
              onPress={() => router.replace("/login")}
            />
          </View>
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  scrollPadding: { paddingHorizontal: 16, paddingVertical: 24, alignItems: "center" },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    elevation: 4,
  },
  centerBlock: { alignItems: "center", marginBottom: 24 },
  banner: { padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 16 },
  bannerText: { fontSize: 14, fontWeight: "600", textAlign: "center" },
  select: { flexDirection: "row", borderRadius: 8, borderWidth: 1, marginBottom: 16, overflow: "hidden" },
  selectOpt: { flex: 1, paddingVertical: 12, alignItems: "center" },
  passWrap: { position: "relative", marginBottom: 4 },
  passInput: { paddingHorizontal: 16, paddingVertical: 12, paddingRight: 48, borderRadius: 8, borderWidth: 1, fontSize: 16 },
  eye: { position: "absolute", right: 12, top: 14 },
  footerRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 24, paddingTop: 20, borderTopWidth: 1 },
});
