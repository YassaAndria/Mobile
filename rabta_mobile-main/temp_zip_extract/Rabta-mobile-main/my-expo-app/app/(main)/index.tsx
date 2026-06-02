import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, Stack } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSelector } from "react-redux";
import type { RootState } from "../../src/store/store";
import { useTheme } from "../../src/theme/ThemeContext";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SplashScreen() {
  const router = useRouter();
  const { isAuthenticated } = useSelector((s: RootState) => s.auth);
  const { colors, isDark } = useTheme();
  const barAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  // ✅ منعنا الـ redirect يحصل أكتر من مرة
  const didNavigate = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(barAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(barAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    ).start();
  }, [barAnim, logoOpacity, logoScale]);

  useEffect(() => {
    // ✅ نضمن إن الـ navigate يحصل مرة واحدة بس بعد الـ splash ينتهي
    const t = setTimeout(() => {
      if (didNavigate.current) return;
      didNavigate.current = true;
      if (isAuthenticated) {
        router.replace("/chats");
      } else {
        router.replace("/login");
      }
    }, 3500);
    return () => clearTimeout(t);
    // ✅ مش بنحط isAuthenticated في الـ deps عشان متعملش re-trigger كل ما يتغير
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const barTranslate = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-96, 96],
  });

  const glowPurple = colors.purple10;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.bgGlow} pointerEvents="none">
        <View style={[styles.blob, { backgroundColor: glowPurple, top: "-10%", left: "-10%" }]} />
        <View style={[styles.blob, { backgroundColor: glowPurple, bottom: "-10%", right: "-10%" }]} />
      </View>

      <View style={styles.center}>
        <Animated.View
          style={[
            styles.logoOuter,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <LinearGradient
            colors={isDark ? ["#8B5CF6", "#A78BFA"] : ["#7C3AED", "#9F67FF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoBox}
          >
            <MaterialIcons name="device-hub" size={60} color="#fff" />
          </LinearGradient>
        </Animated.View>

        <Text style={[styles.title, { color: colors.text }]}>Rabta</Text>
        <Text style={[styles.tagline, { color: colors.textSubtle }]}>TECH COMMUNITY HUB</Text>

        <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
          <Animated.View
            style={[
              styles.barFill,
              {
                backgroundColor: colors.purple,
                transform: [{ translateX: barTranslate }],
              },
            ]}
          />
        </View>
        <Text style={[styles.sync, { color: colors.textSubtle }]}>Syncing with ITI network...</Text>
      </View>

      <Text style={[styles.version, { color: colors.textSubtle }]}>VERSION 1.0.0</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center" },
  bgGlow: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  blob: {
    position: "absolute",
    width: "40%",
    height: "40%",
    borderRadius: 999,
    opacity: 0.9,
  },
  center: { alignItems: "center", zIndex: 1, paddingHorizontal: 24 },
  logoOuter: { marginBottom: 32 },
  logoBox: {
    width: 112,
    height: 112,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  title: { fontSize: 48, fontWeight: "900", letterSpacing: -1, marginBottom: 12 },
  tagline: { fontSize: 11, fontWeight: "700", letterSpacing: 4, marginBottom: 56 },
  barTrack: { width: 192, height: 4, borderRadius: 2, overflow: "hidden" },
  barFill: { width: "50%", height: "100%", borderRadius: 2 },
  sync: { fontSize: 11, marginTop: 16, fontWeight: "500" },
  version: { position: "absolute", bottom: 32, fontSize: 10, fontWeight: "600", letterSpacing: 2 },
});
