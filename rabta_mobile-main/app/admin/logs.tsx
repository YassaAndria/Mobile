import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  ActivityIndicator,
  Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import axiosInstance from '../../src/api/axiosInstance';
import { useRouter } from 'expo-router';

export default function AdminLogsScreen() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const router = useRouter();

  const fetchLogs = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      const { data } = await axiosInstance.get('/admin/logs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(data?.data?.logs || data?.logs || data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getRelativeTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} min${diffInMinutes > 1 ? 's' : ''} ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  };

  const getActionConfig = (action: string) => {
    if (!action) return { icon: 'clipboard-list', color: '#7F77DD', bgColor: 'rgba(127, 119, 221, 0.1)' };
    const act = action.toLowerCase();
    
    if (act.includes('delete')) return { icon: 'trash', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' };
    if (act.includes('ban')) return { icon: 'ban', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' };
    if (act.includes('unban')) return { icon: 'check-circle', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' };
    if (act.includes('verify')) return { icon: 'check-double', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' };
    if (act.includes('create')) return { icon: 'plus', color: '#378ADD', bgColor: 'rgba(55, 138, 221, 0.1)' };
    if (act.includes('update')) return { icon: 'pen', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)' };
    
    return { icon: 'clipboard-list', color: '#7F77DD', bgColor: 'rgba(127, 119, 221, 0.1)' };
  };

  const renderItem = ({ item }: { item: any }) => {
    const config = getActionConfig(item.action);
    return (
      <View style={styles.logItem}>
        <View style={[styles.iconCircle, { backgroundColor: config.bgColor }]}>
          <FontAwesome5 name={config.icon} size={16} color={config.color} />
        </View>
        <View style={styles.logContent}>
          <Text style={styles.logText}>
            <Text style={styles.adminName}>{item.adminId?.fullName || 'Admin'}</Text>
            {' '}
            <Text style={styles.actionText}>{item.action}</Text>
            {' '}
            <Text style={styles.targetText}>{item.targetEntityName || ''}</Text>
          </Text>
          {item.createdAt && (
            <Text style={styles.timeText}>{getRelativeTime(item.createdAt)}</Text>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#7F77DD" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.screenHeader}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Activity Logs</Text>
      </View>

      <View style={styles.card}>
        <FlatList
          data={logs}
          keyExtractor={(item) => item._id || Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No activity logs found.</Text>
          }
        />
      </View>
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
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#141419',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  card: {
    flex: 1,
    backgroundColor: '#141419',
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  listContent: {
    padding: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 24,
    fontSize: 16,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  logContent: {
    flex: 1,
    justifyContent: 'center',
  },
  logText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 22,
  },
  adminName: {
    color: '#7F77DD',
    fontWeight: 'bold',
  },
  actionText: {
    color: 'rgba(255,255,255,0.6)',
  },
  targetText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  timeText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  }
});
