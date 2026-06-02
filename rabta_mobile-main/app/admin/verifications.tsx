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
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{item.fullName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.nameText}>{item.fullName}</Text>
            <Text style={styles.companyText}>{item.companyName || 'No Company Name'}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="mail" size={16} color="rgba(255,255,255,0.5)" />
          <Text style={styles.infoText}>{item.email}</Text>
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

        <View style={styles.actionsRow}>
          <Pressable style={styles.rejectBtn} onPress={() => openRejectModal(item._id)}>
            <Ionicons name="close" size={18} color="#ef4444" />
            <Text style={styles.rejectBtnText}>Reject</Text>
          </Pressable>
          <Pressable style={styles.approveBtn} onPress={() => handleApprove(item._id)}>
            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
            <Text style={styles.approveBtnText}>Approve</Text>
          </Pressable>
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
        <Text style={styles.headerTitle}>Verifications</Text>
      </View>

      <FlatList
        data={employers}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle" size={64} color="#22c55e" />
            <Text style={styles.emptyText}>No pending verification requests.</Text>
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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject Employer</Text>
            <Text style={styles.modalSubtitle}>Please provide a reason for rejection (min 10 chars):</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Enter reason..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              multiline
              numberOfLines={4}
              value={rejectReason}
              onChangeText={setRejectReason}
              autoFocus
            />
            
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setRejectModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
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
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    marginTop: 16,
  },
  card: {
    backgroundColor: '#141419',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
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
    backgroundColor: 'rgba(127, 119, 221, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#7F77DD',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerTextContainer: {
    flex: 1,
  },
  nameText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  companyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    color: 'rgba(255,255,255,0.7)',
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
    borderTopColor: 'rgba(255,255,255,0.07)',
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
    backgroundColor: '#22c55e',
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
    backgroundColor: '#141419',
    width: '100%',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#0D0D12',
    color: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
    color: 'rgba(255,255,255,0.6)',
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
