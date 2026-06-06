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

export default function AddAdminScreen() {
  const { colors, isDark } = useTheme();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const router = useRouter();

  const fetchUsers = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      const { data } = await axiosInstance.get('/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Only keep non-admin users
      setUsers(data?.data?.users?.filter((u: any) => u.role !== 'admin') || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const promoteToAdmin = (userId: string) => {
    Alert.alert(
      'Promote User',
      'Are you sure you want to promote this user to Admin?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Promote',
          style: 'default',
          onPress: async () => {
            try {
              const token = await SecureStore.getItemAsync('token');
              await axiosInstance.put(`/admin/users/${userId}/role`, {}, {
                headers: { Authorization: `Bearer ${token}` }
              });
              Alert.alert('Success', 'User is now an Admin');
              setUsers(users.filter(u => u._id !== userId));
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to promote user');
            }
          }
        }
      ]
    );
  };

  const filteredUsers = users.filter(user => 
    user?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardInfo}>
        <View style={[styles.avatarCircle, { backgroundColor: colors.purple10 }]}>
          <Text style={[styles.avatarText, { color: colors.purple }]}>
            {item.fullName ? item.fullName.charAt(0).toUpperCase() : 'U'}
          </Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.nameText, { color: colors.text }]}>{item.fullName}</Text>
          <Text style={[styles.emailText, { color: colors.textMuted }]}>{item.email}</Text>
        </View>
      </View>
      <Pressable style={[styles.promoteBtn, { backgroundColor: colors.purple }]} onPress={() => promoteToAdmin(item._id)}>
        <Text style={styles.promoteBtnText}>Promote</Text>
      </Pressable>
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Promote Admin</Text>
        </View>
        
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search users by name or email..."
            placeholderTextColor={colors.textMuted}
            value={searchTerm}
            onChangeText={setSearchTerm}
            autoCapitalize="none"
          />
        </View>

        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No matching users found.</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  textContainer: {
    flex: 1,
    paddingRight: 8,
  },
  nameText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  emailText: {
    fontSize: 14,
  },
  promoteBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  promoteBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  }
});
