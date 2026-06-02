import { Redirect, Stack } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { AdminSidebar } from "../../src/components/layout/AdminSidebar";
import type { RootState } from "../../src/store/store";

export default function AdminLayout() {
  const { user, token } = useSelector((s: RootState) => s.auth);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (!token || !user) {
    return <Redirect href="/login" />;
  }
  if (user.role !== "admin") {
    return <Redirect href="/chats" />;
  }

  return (
    <View style={styles.root}>
      {/* Content Area */}
      <View style={styles.main}>
        {/* Minimalist Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
        </View>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }} />
      </View>

      {/* Floating Burger Button at the bottom left (when menu is closed) */}
      {!isMenuOpen && (
        <Pressable style={styles.floatingBurger} onPress={() => setIsMenuOpen(true)}>
          <MaterialIcons name="menu" size={24} color="#FFFFFF" />
        </Pressable>
      )}

      {/* Backdrop */}
      {isMenuOpen && (
        <Pressable style={styles.backdrop} onPress={() => setIsMenuOpen(false)} />
      )}

      {/* Sidebar Overlay */}
      {isMenuOpen && (
        <View style={styles.sidebarWrapper}>
          <AdminSidebar closeMenu={() => setIsMenuOpen(false)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#121212" },
  main: { flex: 1, flexDirection: "column" },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: "#121212",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    alignItems: "center",
  },
  headerTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "700", letterSpacing: 0.5 },
  floatingBurger: {
    position: "absolute",
    bottom: 32,
    left: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#6C63FF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 50,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    zIndex: 100,
  },
  sidebarWrapper: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 150,
    width: 280,
    backgroundColor: "#121212",
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
});
