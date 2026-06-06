import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import axiosInstance from '../../src/api/axiosInstance';
import { useTheme } from '../../src/theme/ThemeContext';

const { width } = Dimensions.get('window');

interface Stats {
  totalUsers: number;
  totalJobs: number;
  totalGroups: number;
}

export default function AdminOverviewScreen() {
  const { colors, isDark } = useTheme();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      const { data } = await axiosInstance.get('/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(data?.data?.stats || { totalUsers: 0, totalJobs: 0, totalGroups: 0 });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.centerContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.purple} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.purple} />
        }
      >
        <Text style={[styles.headerTitle, { color: colors.text }]}>Overview</Text>

        <View style={styles.statsGrid}>
          {/* Total Users Card */}
          <View style={[styles.statCard, styles.cardUsers, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.iconContainerUsers, { backgroundColor: colors.purple10 }]}>
              <Ionicons name="people" size={24} color={colors.purple} />
            </View>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Users</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats?.totalUsers || 0}</Text>
          </View>

          {/* Total Jobs Card */}
          <View style={[styles.statCard, styles.cardJobs, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.iconContainerJobs, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.08)' }]}>
              <Ionicons name="briefcase" size={24} color="#22c55e" />
            </View>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Jobs</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats?.totalJobs || 0}</Text>
          </View>

          {/* Total Communities Card */}
          <View style={[styles.statCard, styles.cardGroups, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.iconContainerGroups, { backgroundColor: isDark ? 'rgba(55, 138, 221, 0.15)' : 'rgba(55, 138, 221, 0.08)' }]}>
              <Ionicons name="globe" size={24} color="#378ADD" />
            </View>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Communities</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats?.totalGroups || 0}</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
    width: (width - 48) / 2, // 2 columns layout
  },
  cardUsers: {
    borderTopColor: '#7F77DD',
    borderTopWidth: 3,
  },
  cardJobs: {
    borderTopColor: '#22c55e',
    borderTopWidth: 3,
  },
  cardGroups: {
    borderTopColor: '#378ADD',
    borderTopWidth: 3,
    width: '100%', // Make the 3rd card full width
  },
  iconContainerUsers: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainerJobs: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainerGroups: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
  }
});
