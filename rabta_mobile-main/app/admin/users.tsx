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

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const fetchUsers = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      const { data } = await axiosInstance.get('/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(data.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const filteredUsers = users.filter(user => 
    user?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayedUsers = filteredUsers.slice(0, page * itemsPerPage);

  const deleteUser = (userId: string) => {
    Alert.alert(
      'Delete User',
      'Are you sure you want to PERMANENTLY delete this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await SecureStore.getItemAsync('token');
              await axiosInstance.delete(`/admin/users/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              setUsers(users.filter(u => u._id !== userId));
              Alert.alert('Success', 'User deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Action failed. Please try again.');
            }
          }
        }
      ]
    );
  };

  const toggleBan = (userId: string) => {
    const user = users.find(u => u._id === userId);
    const isCurrentlyBanned = user?.isBanned;
    
    Alert.alert(
      isCurrentlyBanned ? 'Unban User' : 'Ban User',
      `Are you sure you want to ${isCurrentlyBanned ? 'unban' : 'ban'} this user?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const token = await SecureStore.getItemAsync('token');
              await axiosInstance.put(`/admin/users/${userId}/ban`, {}, {
                headers: { Authorization: `Bearer ${token}` }
              });
              setUsers(users.map(u => u._id === userId ? { ...u, isBanned: !u.isBanned } : u));
              Alert.alert('Success', `User successfully ${isCurrentlyBanned ? 'unbanned' : 'banned'}`);
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Action failed. Please try again.');
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Text style={styles.nameText}>{item.fullName}</Text>
      <Text style={styles.emailText}>{item.email}</Text>
      
      <View style={styles.badgesRow}>
        <View style={[styles.badge, item.role === 'admin' ? styles.badgeAdmin : styles.badgeUser]}>
          <Text style={[styles.badgeText, item.role === 'admin' ? styles.badgeTextAdmin : styles.badgeTextUser]}>
            {item.role}
          </Text>
        </View>
        <View style={[styles.badge, item.isBanned ? styles.badgeBanned : styles.badgeActive]}>
          <Text style={[styles.badgeText, item.isBanned ? styles.badgeTextBanned : styles.badgeTextActive]}>
            {item.isBanned ? 'Banned' : 'Active'}
          </Text>
        </View>
      </View>

      {item.role !== 'admin' && (
        <View style={styles.actionsRow}>
          <Pressable 
            style={[styles.actionBtn, item.isBanned ? styles.btnDefault : styles.btnDangerLight]} 
            onPress={() => toggleBan(item._id)}
          >
            <Text style={item.isBanned ? styles.btnTextDefault : styles.btnTextDanger}>
              {item.isBanned ? 'Unban' : 'Ban User'}
            </Text>
          </Pressable>
          <Pressable style={styles.deleteBtn} onPress={() => deleteUser(item._id)}>
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </Pressable>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#7F77DD" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Text style={styles.headerTitle}>User Management</Text>
        
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="rgba(255,255,255,0.5)" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users by name or email..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={searchTerm}
            onChangeText={setSearchTerm}
            autoCapitalize="none"
          />
        </View>

        <FlatList
          data={displayedUsers}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No users found.</Text>
          }
          ListFooterComponent={
            filteredUsers.length > displayedUsers.length ? (
              <Pressable style={styles.loadMoreBtn} onPress={() => setPage(p => p + 1)}>
                <Text style={styles.loadMoreText}>Load More</Text>
              </Pressable>
            ) : null
          }
        />
      </KeyboardAvoidingView>
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
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141419',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: '#FFFFFF',
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#141419',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    padding: 16,
    marginBottom: 12,
  },
  nameText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  emailText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 12,
  },
  badgesRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  badgeAdmin: {
    backgroundColor: 'rgba(127, 119, 221, 0.1)',
  },
  badgeUser: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  badgeBanned: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  badgeActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextAdmin: {
    color: '#7F77DD',
  },
  badgeTextUser: {
    color: 'rgba(255,255,255,0.5)',
  },
  badgeTextBanned: {
    color: '#ef4444',
  },
  badgeTextActive: {
    color: '#22c55e',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    paddingTop: 12,
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 8,
  },
  btnDefault: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  btnDangerLight: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  btnTextDefault: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  btnTextDanger: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteBtn: {
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  emptyText: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 24,
    fontSize: 16,
  },
  loadMoreBtn: {
    backgroundColor: '#141419',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    marginTop: 8,
  },
  loadMoreText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  }
});
