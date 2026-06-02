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

const { width } = Dimensions.get('window');

interface Stats {
  totalUsers: number;
  totalJobs: number;
  totalGroups: number;
}

export default function AdminOverviewScreen() {
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
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#7F77DD" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7F77DD" />
        }
      >
        <Text style={styles.headerTitle}>Overview</Text>

        <View style={styles.statsGrid}>
          {/* Total Users Card */}
          <View style={[styles.statCard, styles.cardUsers]}>
            <View style={styles.iconContainerUsers}>
              <Ionicons name="people" size={24} color="#7F77DD" />
            </View>
            <Text style={styles.statLabel}>Total Users</Text>
            <Text style={styles.statValue}>{stats?.totalUsers || 0}</Text>
          </View>

          {/* Total Jobs Card */}
          <View style={[styles.statCard, styles.cardJobs]}>
            <View style={styles.iconContainerJobs}>
              <Ionicons name="briefcase" size={24} color="#22c55e" />
            </View>
            <Text style={styles.statLabel}>Total Jobs</Text>
            <Text style={styles.statValue}>{stats?.totalJobs || 0}</Text>
          </View>

          {/* Total Communities Card */}
          <View style={[styles.statCard, styles.cardGroups]}>
            <View style={styles.iconContainerGroups}>
              <Ionicons name="globe" size={24} color="#378ADD" />
            </View>
            <Text style={styles.statLabel}>Communities</Text>
            <Text style={styles.statValue}>{stats?.totalGroups || 0}</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D12',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#0D0D12',
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
    color: '#FFFFFF',
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#141419',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
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
    backgroundColor: 'rgba(127, 119, 221, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainerJobs: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainerGroups: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(55, 138, 221, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
  }
});
