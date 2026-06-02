/* eslint-disable @typescript-eslint/no-explicit-any */
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { useDispatch } from "react-redux";
import Toast from "react-native-toast-message";
import { z } from "zod";
import axiosInstance from "../../src/api/axiosInstance";
import { Input } from "../../src/components/ui/Input";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../src/components/ui/Button";
import { setCredentials } from "../../src/store/slices/authSlice";
import { useTheme } from "../../src/theme/ThemeContext";
import { typography } from "../../src/theme/typography";
import { MaterialIcons } from "@expo/vector-icons";

const registerSchema = z
  .object({
    fullName: z.string().min(2, "Name is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function EmployerRegisterScreen() {
  const { token: tokenParam } = useLocalSearchParams<{ token?: string }>();
  const token = typeof tokenParam === "string" ? tokenParam : undefined;
  const router = useRouter();
  const dispatch = useDispatch();
  const { colors, isDark } = useTheme();
  const [companyInfo, setCompanyInfo] = useState<{ name: string; email: string } | null>(null);
  const [validating, setValidating] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", password: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (!token) {
      router.replace("/employer/request-access");
      return;
    }
    const validate = async () => {
      try {
        const response = await axiosInstance.get(`/employer/validate-token/${token}`);
        setCompanyInfo({
          name: response.data.data.companyName,
          email: response.data.data.companyEmail,
        });
      } catch {
        Toast.show({ type: "error", text1: "Invitation link is invalid or expired." });
        router.replace("/employer/request-access");
      } finally {
        setValidating(false);
      }
    };
    void validate();
  }, [token, router]);

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const response = await axiosInstance.post("/employer/register", {
        token,
        fullName: data.fullName,
        password: data.password,
      });
      dispatch(setCredentials({
        user: response.data.data.user,
        token: response.data.token,
      }));
      Toast.show({ type: "success", text1: "Registration successful!" });
      router.replace("/employer/setup");
    } catch (error: any) {
      Toast.show({ type: "error", text1: error.response?.data?.message || "Registration failed" });
    }
  };

  if (validating) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.purple} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={[styles.root, { backgroundColor: colors.bg }]} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[typography.h2, { color: colors.text, marginBottom: 8, textAlign: "center" }]}>Complete Registration</Text>
          <Text style={[typography.body, { color: colors.textSubtle, textAlign: "center", marginBottom: 24 }]}>
            Welcome to Rabta, <Text style={{ fontWeight: "700", color: colors.purple }}>{companyInfo?.name}</Text>
          </Text>

        <View style={[styles.emailBox, { backgroundColor: colors.surface2 }]}>
          <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 1, marginBottom: 4 }]}>COMPANY EMAIL</Text>
          <Text style={[typography.body, { color: colors.text, fontWeight: "700" }]}>{companyInfo?.email}</Text>
        </View>

        <Controller
          control={control}
          name="fullName"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input label="Your Full Name" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.fullName?.message} />
          )}
        />

        <Text style={[typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Password</Text>
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <View>
              <View style={styles.passWrap}>
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry={!showPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textSubtle}
                  style={[
                    styles.input,
                    { backgroundColor: colors.surface2, borderColor: errors.password ? colors.errorText : colors.borderStrong, color: colors.text },
                  ]}
                />
                <Pressable style={styles.eye} onPress={() => setShowPassword(!showPassword)}>
                  <MaterialIcons name={showPassword ? "visibility-off" : "visibility"} size={22} color={colors.textSubtle} />
                </Pressable>
              </View>
              {errors.password ? <Text style={[typography.caption, { color: colors.errorText, marginBottom: 8 }]}>{errors.password.message}</Text> : null}
            </View>
          )}
        />

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input label="Confirm Password" value={value} onChangeText={onChange} onBlur={onBlur} secureTextEntry={!showPassword} error={errors.confirmPassword?.message} />
          )}
        />

        <Button
          title="Create Account"
          onPress={handleSubmit(onSubmit)}
          isLoading={isSubmitting}
          style={{ marginTop: 16 }}
        />
      </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  root: { flexGrow: 1, justifyContent: "center", padding: 16, paddingBottom: 80 },
  card: { maxWidth: 400, width: "100%", alignSelf: "center", borderRadius: 24, padding: 40, borderWidth: 1 },
  emailBox: { padding: 16, borderRadius: 12, marginBottom: 24 },
  passWrap: { position: "relative" },
  input: { paddingHorizontal: 16, paddingVertical: 12, paddingRight: 48, borderRadius: 8, borderWidth: 1, fontSize: 16 },
  eye: { position: "absolute", right: 12, top: 14 },
});
