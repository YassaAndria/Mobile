import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSelector } from "react-redux";
import type { RootState } from "../src/store/store";
import { useTheme } from "../src/theme/ThemeContext";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SplashScreen() {
  const router = useRouter();
  const { isAuthenticated } = useSelector((s: RootState) => s.auth);
  const { colors, isDark } = useTheme();
  const barAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoFloat = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslate = useRef(new Animated.Value(8)).current;
  const blobPulse1 = useRef(new Animated.Value(0)).current;
  const blobPulse2 = useRef(new Animated.Value(0)).current;
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
      Animated.sequence([
        Animated.delay(120),
        Animated.timing(contentOpacity, { toValue: 1, duration: 650, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(120),
        Animated.timing(contentTranslate, { toValue: 0, duration: 650, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(barAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(barAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(logoFloat, { toValue: -6, duration: 1400, useNativeDriver: true }),
        Animated.timing(logoFloat, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(blobPulse1, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(blobPulse1, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.delay(1000),
        Animated.timing(blobPulse2, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(blobPulse2, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ]),
    ).start();
  }, [barAnim, logoOpacity, logoScale]);

  const authRef = useRef(isAuthenticated);
  authRef.current = isAuthenticated;

  useEffect(() => {
    const t = setTimeout(() => {
      if (didNavigate.current) return;
      didNavigate.current = true;
      if (authRef.current) {
        router.replace("/chats");
      } else {
        router.replace("/login");
      }
    }, 3500);
    return () => clearTimeout(t);
  }, [router]);

  const barTranslate = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-96, 96],
  });

  const glowPurple = colors.purple10;
  const blobOpacity1 = blobPulse1.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] });
  const blobOpacity2 = blobPulse2.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] });

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={styles.bgGlow} pointerEvents="none">
        <Animated.View
          style={[
            styles.blob,
            { backgroundColor: glowPurple, top: "-10%", left: "-10%", opacity: blobOpacity1 },
          ]}
        />
        <Animated.View
          style={[
            styles.blob,
            { backgroundColor: glowPurple, bottom: "-10%", right: "-10%", opacity: blobOpacity2 },
          ]}
        />
      </View>

      <View style={styles.center}>
        <Animated.View
          style={[
            styles.logoOuter,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }, { translateY: logoFloat }],
            },
          ]}
        >
          <View style={[styles.logoGlow, { backgroundColor: isDark ? "#8B5CF6" : "#7C3AED" }]} />
          <LinearGradient
            colors={isDark ? ["#8B5CF6", "#A78BFA"] : ["#7C3AED", "#9F67FF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoBox}
          >
            <MaterialIcons name="hub" size={60} color="#fff" />
          </LinearGradient>
        </Animated.View>

        <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentTranslate }] }}>
          <Text style={[styles.title, { color: colors.text }]}>Rabta</Text>
          <Text style={[styles.tagline, { color: isDark ? "#6B7280" : colors.textSubtle }]}>Tech Community Hub</Text>

          <View style={[styles.barTrack, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : colors.border }]}>
            <Animated.View
              style={[
                styles.barFill,
                {
                  backgroundColor: isDark ? "#8B5CF6" : colors.purple,
                  transform: [{ translateX: barTranslate }],
                },
              ]}
            />
          </View>
          <Text style={[styles.sync, { color: isDark ? "#6B7280" : colors.textSubtle }]}>
            Syncing with ITI network...
          </Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.versionWrap, { opacity: contentOpacity, transform: [{ translateY: contentTranslate }] }]}>
        <Text style={[styles.version, { color: isDark ? "#9CA3AF" : colors.textSubtle }]}>VERSION 1.0.0</Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center" },
  bgGlow: { ...StyleSheet.absoluteFill, overflow: "hidden" },
  blob: {
    position: "absolute",
    width: "40%",
    height: "40%",
    borderRadius: 999,
  },
  center: { alignItems: "center", zIndex: 1, paddingHorizontal: 24 },
  logoOuter: { marginBottom: 32, position: "relative" },
  logoGlow: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    bottom: 10,
    borderRadius: 28,
    opacity: 0.22,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 0,
  },
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
  title: { fontSize: 48, fontWeight: "900", letterSpacing: -1, marginBottom: 12, textAlign: "center" },
  tagline: { fontSize: 11, fontWeight: "800", letterSpacing: 4, marginBottom: 56, textTransform: "uppercase", textAlign: "center" },
  barTrack: { width: 192, height: 4, borderRadius: 2, overflow: "hidden" },
  barFill: { width: "50%", height: "100%", borderRadius: 2 },
  sync: { fontSize: 11, marginTop: 16, fontWeight: "600" },
  versionWrap: { position: "absolute", bottom: 32 },
  version: { fontSize: 10, fontWeight: "700", letterSpacing: 2 },
});
