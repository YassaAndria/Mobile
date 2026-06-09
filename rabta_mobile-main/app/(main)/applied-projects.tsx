import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axiosInstance from '../../src/api/axiosInstance';
import { useTheme } from '../../src/theme/ThemeContext';

export default function AppliedProjectsScreen() {
  const { colors } = useTheme();
  const [appliedJobs, setAppliedJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    axiosInstance.get('/jobs/applied')
      .then(res => setAppliedJobs(res.data.data?.applications || []))
      .catch(err => console.error('Failed to fetch applied jobs', err))
      .finally(() => setIsLoading(false));
  }, []);

  const getStatusStyle = (status: string) => {
    if (status === 'accepted') return { bg: '#dcfce7', text: '#16a34a', border: '#bbf7d0' };
    if (status === 'rejected') return { bg: '#fee2e2', text: '#dc2626', border: '#fecaca' };
    return { bg: colors.surface2, text: colors.textMuted, border: colors.border };
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.purple} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Applied Jobs</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Track the status of your recent job applications.
        </Text>
      </View>

      {appliedJobs.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ color: colors.textMuted, fontSize: 15 }}>
            You haven't applied to any jobs yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={appliedJobs}
          keyExtractor={item => item._id || item.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => {
            const statusStyle = getStatusStyle(item.status || 'pending');
            return (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.jobTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.employer, { color: colors.textMuted }]}>
                  {item.employer || 'Unknown Employer'}
                </Text>
                <Text style={[styles.date, { color: colors.textMuted }]}>
                  Applied: {new Date(item.appliedAt || item.date).toLocaleDateString()}
                </Text>
                <View style={[styles.badge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
                  <Text style={[styles.badgeText, { color: statusStyle.text }]}>
                    {item.status === 'accepted' ? 'Accepted' : item.status === 'rejected' ? 'Rejected' : 'Pending'}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  header: { padding: 24, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 4 },
  jobTitle: { fontSize: 17, fontWeight: '700' },
  employer: { fontSize: 13 },
  date: { fontSize: 12 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1, marginTop: 8 },
  badgeText: { fontSize: 12, fontWeight: '700' },
});
