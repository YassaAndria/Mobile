import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  Alert, 
  Pressable, 
  ActivityIndicator,
  Linking,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import axiosInstance from '../../src/api/axiosInstance';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/theme/ThemeContext';

interface Employer {
  _id: string;
  fullName: string;
  companyName?: string;
  email: string;
  socialLinks?: {
    linkedin?: string;
  };
  verificationLink?: string;
}

export default function AdminVerificationsScreen() {
  const { colors, isDark } = useTheme();
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Reject Modal State
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedEmployerId, setSelectedEmployerId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  
  const router = useRouter();

  const fetchPendingEmployers = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      const { data } = await axiosInstance.get('/admin/pending-employers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployers(data.data.employers);
    } catch (error) {
      console.error('Error fetching pending employers:', error);
      Alert.alert('Error', 'Failed to load pending employers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingEmployers();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      const token = await SecureStore.getItemAsync('token');
      await axiosInstance.patch(`/admin/verify-employer/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployers((prev) => prev.filter((emp) => emp._id !== id));
      Alert.alert('Success', 'Employer approved successfully');
    } catch (error) {
      console.error('Error approving employer:', error);
      Alert.alert('Error', 'Failed to approve employer');
    }
  };

  const openRejectModal = (id: string) => {
    setSelectedEmployerId(id);
    setRejectReason('');
    setRejectModalVisible(true);
  };

  const submitReject = async () => {
    if (rejectReason.trim().length < 10) {
      Alert.alert('Invalid Reason', 'Rejection reason must be at least 10 characters.');
      return;
    }
    if (!selectedEmployerId) return;

    try {
      const token = await SecureStore.getItemAsync('token');
      await axiosInstance.patch(`/admin/reject-employer/${selectedEmployerId}`, { reason: rejectReason }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployers((prev) => prev.filter((emp) => emp._id !== selectedEmployerId));
      setRejectModalVisible(false);
      Alert.alert('Success', 'Employer rejected successfully');
    } catch (error) {
      console.error('Error rejecting employer:', error);
      Alert.alert('Error', 'Failed to reject employer');
    }
  };

  const renderItem = ({ item }: { item: Employer }) => {
    const linkedinUrl = item.socialLinks?.linkedin || item.verificationLink;

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.purple10 }]}>
            <Text style={[styles.avatarText, { color: colors.purple }]}>{item.fullName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.nameText, { color: colors.text }]}>{item.fullName}</Text>
            <Text style={[styles.companyText, { color: colors.textMuted }]}>{item.companyName || 'No Company Name'}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="mail" size={16} color={colors.textMuted} />
          <Text style={[styles.infoText, { color: colors.text }]} numberOfLines={1}>{item.email}</Text>
        </View>

        {linkedinUrl ? (
          <Pressable style={styles.infoRow} onPress={() => Linking.openURL(linkedinUrl)}>
            <MaterialCommunityIcons name="linkedin" size={16} color="#378ADD" />
            <Text style={styles.linkText}>View LinkedIn Profile</Text>
          </Pressable>
        ) : (
          <View style={styles.infoRow}>
            <Ionicons name="warning" size={16} color="#f59e0b" />
            <Text style={styles.warningText}>No LinkedIn URL provided</Text>
          </View>
        )}

        <View style={[styles.actionsRow, { borderTopColor: colors.border }]}>
          <Pressable style={styles.rejectBtn} onPress={() => openRejectModal(item._id)}>
            <Ionicons name="close" size={18} color="#ef4444" />
            <Text style={styles.rejectBtnText}>Reject</Text>
          </Pressable>
          <Pressable style={[styles.approveBtn, { backgroundColor: colors.successText || '#22c55e' }]} onPress={() => handleApprove(item._id)}>
            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
            <Text style={styles.approveBtnText}>Approve</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.centerContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.purple} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.screenHeader}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Verifications</Text>
      </View>

      <FlatList
        data={employers}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle" size={64} color="#22c55e" />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No pending verification requests.</Text>
          </View>
        }
      />

      {/* Reject Reason Modal */}
      <Modal
        visible={rejectModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Reject Employer</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>Please provide a reason for rejection (min 10 chars):</Text>
            
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
              placeholder="Enter reason..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              value={rejectReason}
              onChangeText={setRejectReason}
              autoFocus
            />
            
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setRejectModalVisible(false)}>
                <Text style={[styles.modalCancelText, { color: colors.textMuted }]}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalSubmitBtn} onPress={submitReject}>
                <Text style={styles.modalSubmitText}>Submit</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 64,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
  headerTextContainer: {
    flex: 1,
  },
  nameText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  companyText: {
    fontSize: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    marginLeft: 8,
  },
  linkText: {
    color: '#378ADD',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
    marginLeft: 8,
  },
  warningText: {
    color: '#f59e0b',
    fontSize: 14,
    marginLeft: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 8,
  },
  rejectBtnText: {
    color: '#ef4444',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginLeft: 8,
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  modalInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 16,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  modalCancelText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalSubmitBtn: {
    backgroundColor: '#ef4444',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
