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
  Platform,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axiosInstance from '../../src/api/axiosInstance';

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'tokens_desc' | 'tokens_asc'
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get(`/admin/users?sortBy=${sortBy}`);
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
  }, [sortBy]);

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
              await axiosInstance.delete(`/admin/users/${userId}`);
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
              await axiosInstance.put(`/admin/users/${userId}/ban`, {});
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

  const renderItem = ({ item }: { item: any }) => {
    const isExpanded = expandedUserId === item._id;
    return (
      <View style={styles.card}>
        <Pressable 
          style={styles.cardHeader}
          onPress={() => setExpandedUserId(isExpanded ? null : item._id)}
        >
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.nameText}>{item.fullName}</Text>
            <Text style={styles.emailText}>{item.email}</Text>
          </View>
          <Ionicons 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="rgba(255,255,255,0.4)" 
          />
        </Pressable>
        
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
          <View style={[styles.badge, styles.badgeTokens]}>
            <Text style={[styles.badgeText, styles.badgeTextTokens]}>
              {item.totalTokensUsed || 0} Tokens
            </Text>
          </View>
        </View>

        {isExpanded && (
          <View style={styles.detailsContainer}>
            <Text style={styles.detailsTitle}>Token Usage Breakdown</Text>
            <View style={styles.grid}>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Voice to Text</Text>
                <Text style={styles.gridValue}>{item.tokenUsage?.voiceToText || 0}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Chat Summary</Text>
                <Text style={styles.gridValue}>{item.tokenUsage?.chatSummarization || 0}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Smart Search</Text>
                <Text style={styles.gridValue}>{item.tokenUsage?.smartSearch || 0}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>File Summary</Text>
                <Text style={styles.gridValue}>{item.tokenUsage?.fileSummarization || 0}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Suggested Replies</Text>
                <Text style={styles.gridValue}>{item.tokenUsage?.suggestedReplies || 0}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Translation</Text>
                <Text style={styles.gridValue}>{item.tokenUsage?.translation || 0}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>App Chatbot</Text>
                <Text style={styles.gridValue}>{item.tokenUsage?.appChatbot || 0}</Text>
              </View>
              {item.role === 'employer' && (
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Employer Matching</Text>
                  <Text style={styles.gridValue}>{item.tokenUsage?.employerMatching || 0}</Text>
                </View>
              )}
            </View>
          </View>
        )}

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
  };

  const sortOptions = [
    { key: 'newest', label: 'Newest First' },
    { key: 'tokens_desc', label: 'Most Tokens' },
    { key: 'tokens_asc', label: 'Least Tokens' },
  ];

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

        <View style={styles.sortContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortScroll}>
            {sortOptions.map((opt) => (
              <Pressable 
                key={opt.key}
                style={[styles.sortChip, sortBy === opt.key && styles.sortChipActive]}
                onPress={() => setSortBy(opt.key)}
              >
                <Text style={[styles.sortChipText, sortBy === opt.key && styles.sortChipTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#7F77DD" />
          </View>
        ) : (
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
        )}
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
  sortContainer: {
    marginBottom: 16,
  },
  sortScroll: {
    paddingHorizontal: 16,
  },
  sortChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sortChipActive: {
    backgroundColor: '#7F77DD',
    borderColor: '#7F77DD',
  },
  sortChipText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
  },
  sortChipTextActive: {
    color: '#FFFFFF',
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flex: 1,
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
  badgeTokens: {
    backgroundColor: 'rgba(127, 119, 221, 0.15)',
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
  badgeTextTokens: {
    color: '#9E97F1',
  },
  detailsContainer: {
    marginTop: 8,
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  detailsTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#1C1C24',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  gridLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginBottom: 4,
  },
  gridValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
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
