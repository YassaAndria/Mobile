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

export default function AdminGroupsScreen() {
  const { colors, isDark } = useTheme();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const router = useRouter();

  const fetchGroups = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      const { data } = await axiosInstance.get('/admin/groups', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGroups(data?.data?.groups || data?.groups || data || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
      Alert.alert('Error', 'Failed to load community data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const deleteGroup = (groupId: string) => {
    Alert.alert(
      'Delete Community',
      'Are you sure you want to permanently delete this community?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await SecureStore.getItemAsync('token');
              await axiosInstance.delete(`/admin/groups/${groupId}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              setGroups(groups.filter(g => g._id !== groupId));
              Alert.alert('Success', 'Community deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Action failed. Please try again.');
            }
          }
        }
      ]
    );
  };

  const filteredGroups = (Array.isArray(groups) ? groups : []).filter(group => 
    group?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group?.creator?.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.nameText, { color: colors.text }]}>{item?.name || 'Unnamed'}</Text>
        <Pressable style={styles.deleteBtn} onPress={() => deleteGroup(item._id)}>
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
        </Pressable>
      </View>
      
      <View style={styles.infoRow}>
        <Ionicons name="person-outline" size={16} color={colors.textMuted} />
        <Text style={[styles.infoText, { color: colors.textMuted }]}>{item?.creator?.fullName || 'Unknown'}</Text>
      </View>
      
      <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
        <View style={styles.statItem}>
          <Ionicons name="people" size={16} color={colors.purple} />
          <Text style={[styles.statValue, { color: colors.purple }]}>{item?.memberCount || 0} Members</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
          <Text style={[styles.dateText, { color: colors.textMuted }]}>
            {item?.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
          </Text>
        </View>
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Community Mgmt</Text>
        </View>
        
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search communities..."
            placeholderTextColor={colors.textMuted}
            value={searchTerm}
            onChangeText={setSearchTerm}
            autoCapitalize="none"
          />
        </View>

        <FlatList
          data={filteredGroups}
          keyExtractor={(item) => item._id || Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No communities found.</Text>
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
  nameText: {
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
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    marginLeft: 6,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statValue: {
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 6,
  },
  dateText: {
    fontSize: 14,
    marginLeft: 6,
  }
});
