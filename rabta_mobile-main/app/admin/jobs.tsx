import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  FlatList, 
  StyleSheet, 
  Alert, 
  Pressable, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import axiosInstance from '../../src/api/axiosInstance';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/theme/ThemeContext';

export default function AdminJobsScreen() {
  const { colors, isDark } = useTheme();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const router = useRouter();

  const fetchJobs = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      const { data } = await axiosInstance.get('/admin/jobs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setJobs(data?.data?.jobs || data?.jobs || data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      Alert.alert('Error', 'Failed to load jobs data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const deleteJob = (jobId: string) => {
    Alert.alert(
      'Delete Job',
      'Are you sure you want to permanently delete this job?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await SecureStore.getItemAsync('token');
              await axiosInstance.delete(`/admin/jobs/${jobId}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              setJobs(jobs.filter(j => j._id !== jobId));
              Alert.alert('Success', 'Job deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Action failed. Please try again.');
            }
          }
        }
      ]
    );
  };

  const filteredJobs = (Array.isArray(jobs) ? jobs : []).filter(job => 
    job?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job?.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job?.publisherId?.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job?.publisherId?.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.titleText, { color: colors.text }]}>{item?.title || item?.position || 'No Title'}</Text>
        <Pressable style={styles.deleteBtn} onPress={() => deleteJob(item._id)}>
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
        </Pressable>
      </View>
      
      <View style={styles.infoRow}>
        <Ionicons name="business-outline" size={16} color={colors.textMuted} />
        <Text style={[styles.employerText, { color: colors.textMuted }]}>
          {item?.publisherId?.fullName || item?.publisherId?.companyName || 'Unknown'}
        </Text>
      </View>
      
      <View style={[styles.budgetRow, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.08)' }]}>
        <Ionicons name="cash-outline" size={16} color="#22c55e" />
        <Text style={styles.budgetText}>${item?.budgetOrSalary || 'N/A'}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.centerContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.purple} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.screenHeader}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Jobs Moderation</Text>
        </View>
        
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search jobs by title or company..."
            placeholderTextColor={colors.textMuted}
            value={searchTerm}
            onChangeText={setSearchTerm}
            autoCapitalize="none"
          />
        </View>

        <FlatList
          data={filteredJobs}
          keyExtractor={(item) => item._id || Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No jobs found.</Text>
          }
        />
      </KeyboardAvoidingView>
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
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleText: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 12,
  },
  deleteBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  employerText: {
    fontSize: 14,
    marginLeft: 6,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  budgetText: {
    color: '#22c55e',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 6,
  }
});
