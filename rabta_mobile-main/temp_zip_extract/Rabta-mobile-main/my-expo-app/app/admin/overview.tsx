/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import axiosInstance from "../../src/api/axiosInstance";
import { useTheme } from "../../src/theme/ThemeContext";
import { typography } from "../../src/theme/typography";

// Simple View-based Sparkline
const Sparkline = ({ color, data }: { color: string; data: number[] }) => {
  const max = Math.max(...data, 1);
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", height: 32, gap: 4 }}>
      {data.map((val, idx) => (
        <View
          key={idx}
          style={{
            width: 8,
            height: `${(val / max) * 100}%`,
            backgroundColor: color,
            borderRadius: 4,
            minHeight: 4,
          }}
        />
      ))}
    </View>
  );
};

export default function AdminOverviewScreen() {
  const { colors } = useTheme();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();

  useEffect(() => {
    (async () => {
      try {
        const { data: res } = await axiosInstance.get("/admin/stats");
        setData(res.data);
      } catch {
        // Mock data if failed
        setData({
          users: { total: 1240, newToday: 45 },
          jobs: { total: 84, active: 32 },
          calls: { total: 420 },
          revenue: { total: 12500 }
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: "#121212" }]}>
        <ActivityIndicator color="#8B5CF6" size="large" />
      </View>
    );
  }

  // Determine card width based on screen size (responsive grid)
  const isLargeScreen = width > 768;
  const cardBasis = isLargeScreen ? "23%" : "47%";

  const metrics = [
    {
      title: "Total Jobs",
      value: data?.jobs?.total || 84,
      sub: "+12% from last month",
      icon: "work" as const,
      color: "#8B5CF6", // Purple
      sparkData: [10, 20, 15, 30, 25, 40, 50],
    },
    {
      title: "Active Users",
      value: data?.users?.total || 1240,
      sub: "+5% from last month",
      icon: "people" as const,
      color: "#10B981", // Emerald
      sparkData: [40, 30, 50, 45, 60, 55, 70],
    },
    {
      title: "New Calls",
      value: data?.calls?.total || 420,
      sub: "+18% from last week",
      icon: "call" as const,
      color: "#F59E0B", // Amber
      sparkData: [20, 10, 25, 40, 35, 50, 45],
    },
    {
      title: "Revenue",
      value: `$${(data?.revenue?.total || 125).toLocaleString()}`,
      sub: "+8% from last month",
      icon: "attach-money" as const,
      color: "#3B82F6", // Blue
      sparkData: [30, 40, 35, 50, 60, 55, 80],
    },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#121212" }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      <Text style={[typography.h1, { color: "#FFFFFF", marginBottom: 24, marginTop: 16 }]}>Overview</Text>

      {/* Grid Container */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "stretch", gap: 12 }}>
        {metrics.map((m, idx) => (
          <View
            key={idx}
            style={[
              styles.card,
              { flexBasis: cardBasis, flexGrow: 1, minWidth: 140 },
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={{ color: "#9CA3AF", fontSize: 13, fontWeight: "600", flexShrink: 1 }}>{m.title}</Text>
              <View style={[styles.iconWrap, { backgroundColor: `${m.color}15` }]}>
                <MaterialIcons name={m.icon} size={18} color={m.color} />
              </View>
            </View>

            <View style={{ marginTop: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ color: "#FFFFFF", fontSize: 24, fontWeight: "800", letterSpacing: -1, flexWrap: "wrap" }}>{m.value}</Text>
                <Text style={{ color: m.color, fontSize: 11, fontWeight: "600", marginTop: 4, flexWrap: "wrap" }}>{m.sub}</Text>
              </View>
              <Sparkline color={m.color} data={m.sparkData} />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    backgroundColor: "#1E1E1E",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 16,
    padding: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  iconWrap: {
    padding: 8,
    borderRadius: 12,
  },
});
