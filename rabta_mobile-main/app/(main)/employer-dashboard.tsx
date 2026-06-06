/* eslint-disable @typescript-eslint/no-explicit-any */
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, ScrollView } from "react-native";
import axiosInstance from "../../src/api/axiosInstance";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../../src/store/store";
import { updateProfile } from "../../src/store/slices/authSlice";
import { useChat } from "../../src/context/ChatContext";
import { useTheme } from "../../src/theme/ThemeContext";
import { Button } from "../../src/components/ui/Button";
import { typography } from "../../src/theme/typography";
import Toast from "react-native-toast-message";

export default function EmployerDashboardScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.auth.user);
  const { colors, isDark } = useTheme();
  const { socket } = useChat();
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Silent sync on mount
  useEffect(() => {
    if (user?.role === 'employer') {
      axiosInstance.get('/profile/me')
        .then(res => {
          if (res.data?.data?.user) {
            dispatch(updateProfile(res.data.data.user));
          }
        })
        .catch(err => console.error("Failed to silently sync profile:", err));
    }
  }, [user?.role, dispatch]);

  // Real-time socket listener
  useEffect(() => {
    if (!socket) return;

    const handleStatusUpdate = (data: any) => {
      dispatch(updateProfile(data.user));
      if (data.status === 'rejected') {
        Toast.show({ type: "error", text1: `Verification rejected: ${data.reason}` });
      } else if (data.status === 'approved') {
        Toast.show({ type: "success", text1: "Your account verification was approved!" });
      }
    };

    socket.on('employerStatusUpdated', handleStatusUpdate);

    return () => {
      socket.off('employerStatusUpdated', handleStatusUpdate);
    };
  }, [socket, dispatch]);

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const response = await axiosInstance.get("/jobs");
        const allJobs = response.data.data.jobs || [];
        const myJobs = allJobs.filter(
          (job: any) => job.publisherId?._id === user?._id || job.publisherId === user?._id,
        );
        setJobs(myJobs);
      } catch {
        /* ignore */
      } finally {
        setIsLoading(false);
      }
    })();
  }, [user?._id]);

  const activeProjects = jobs.length;
  const totalApplicants = jobs.reduce((sum, job) => sum + (job.applicantsCount || 0), 0);
  const currentStatus = user?.verificationStatus || 'pending';

  return (
    <ScrollView style={[styles.root, { backgroundColor: colors.bg }]} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.h1, { color: colors.text }]}>Employer Workspace</Text>
          <Text style={[typography.body, { color: colors.textSubtle, fontWeight: "500", marginTop: 4 }]}>
            Here is an overview of your hiring activity and projects.
          </Text>
        </View>
      </View>

      {currentStatus === 'pending' && (
        <View style={[styles.alertBanner, { backgroundColor: '#FFF3E0', borderColor: '#FFB74D' }]}>
          <MaterialIcons name="hourglass-empty" size={20} color="#F57C00" />
          <Text style={[typography.caption, { color: '#E65100', flex: 1, fontWeight: '600' }]}>
            Your account is awaiting admin verification to post jobs.
          </Text>
        </View>
      )}

      {currentStatus === 'rejected' && (
        <View style={[styles.alertBanner, { backgroundColor: colors.errorBg, borderColor: colors.errorBorder, flexDirection: 'column', alignItems: 'stretch' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <MaterialIcons name="error-outline" size={24} color={colors.errorText} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.body, { color: colors.errorText, fontWeight: 'bold' }]}>Account Verification Rejected</Text>
              <Text style={[typography.caption, { color: colors.errorText, marginTop: 4 }]}>Reason: {user?.rejectionReason || "Please try again."}</Text>
            </View>
          </View>
          <Button
            title="Resubmit Request"
            onPress={() => router.push("/post-job")}
            size="sm"
            variant="danger"
            style={{ marginTop: 12, alignSelf: 'flex-end' }}
          />
        </View>
      )}

      <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
        {currentStatus === 'approved' && (
          <Button
            title="Post New Job"
            onPress={() => router.push("/post-job")}
            icon={<MaterialIcons name="add" size={20} color="#fff" />}
            style={{ flex: 1 }}
          />
        )}
        <Button
          title="Browse Job Board"
          variant="secondary"
          onPress={() => router.push("/jobs")}
          icon={<MaterialIcons name="work-outline" size={20} color={colors.text} />}
          style={{ flex: 1 }}
        />
      </View>

      <Text style={[typography.h3, { color: colors.text, marginBottom: 16 }]}>
        <MaterialIcons name="bar-chart" size={22} color={colors.purple} /> Projects Overview
      </Text>
      <View style={styles.stats}>
        {[
          { icon: "work" as const, val: isLoading ? "-" : activeProjects, label: "Active Projects", color: colors.purple },
          { icon: "groups" as const, val: isLoading ? "-" : totalApplicants, label: "Total Applicants", color: colors.text },
          { icon: "event-available" as const, val: "0", label: "Interviews", color: colors.successText },
        ].map((s) => (
          <View key={s.label} style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.statIcon, { backgroundColor: `${s.color}22` }]}>
              <MaterialIcons name={s.icon} size={24} color={s.color} />
            </View>
            <Text style={[styles.statNum, { color: colors.text }]}>{s.val}</Text>
            <Text style={[typography.caption, { color: colors.textSubtle, fontWeight: "800", letterSpacing: 1, textAlign: 'center' }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      <Text style={[typography.h3, { color: colors.text, marginTop: 24, marginBottom: 16 }]}>Your Listings</Text>
      {isLoading ? (
        <ActivityIndicator color={colors.purple} style={{ marginTop: 24 }} />
      ) : jobs.length === 0 ? (
        <View style={[styles.emptyBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.surface2 }]}>
            <MaterialIcons name="inbox" size={32} color={colors.textSubtle} />
          </View>
          <Text style={[typography.body, { color: colors.text, fontWeight: 'bold', marginBottom: 4 }]}>No projects posted yet</Text>
          <Text style={[typography.caption, { color: colors.textSubtle, textAlign: 'center', marginBottom: 16 }]}>You haven't posted any jobs. Create one to start hiring.</Text>
          {currentStatus === 'approved' && (
            <Pressable onPress={() => router.push('/post-job')}>
              <Text style={[typography.bodySmall, { color: colors.purple, fontWeight: 'bold' }]}>+ Post your first job</Text>
            </Pressable>
          )}
        </View>
      ) : (
        jobs.map((item) => (
          <Pressable
            key={item._id}
            style={[styles.jobRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push(`/manage-project/${item._id}`)}
          >
            <View style={{ flex: 1 }}>
              <Text style={[typography.body, { color: colors.text, fontWeight: "800" }]} numberOfLines={1}>{item.title}</Text>
              <Text style={[typography.caption, { color: colors.textSubtle, marginTop: 4 }]}>
                {item.applicantsCount || 0} applicants • Posted {new Date(item.postedAt || new Date()).toLocaleDateString()}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.textSubtle} />
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: { marginBottom: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 },
  alertBanner: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 24, flexDirection: 'row', alignItems: 'center', gap: 12 },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: { flex: 1, minWidth: 100, borderRadius: 16, borderWidth: 1, padding: 16, alignItems: "center" },
  statIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  statNum: { fontSize: 24, fontWeight: "900", marginBottom: 4 },
  jobRow: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  emptyBox: { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
});
