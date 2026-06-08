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
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import axiosInstance from '../../src/api/axiosInstance';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';

interface Specialization {
  _id: string;
  name: string;
  value: string;
  createdAt: string;
}

export default function AdminSpecializationsScreen() {
  const { colors } = useTheme();
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchSpecializations();
  }, []);

  const fetchSpecializations = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/specializations');
      setSpecializations(response.data.data.specializations || []);
    } catch (error: any) {
      console.error('Error fetching specializations:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load specializations',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      setAdding(true);
      await axiosInstance.post('/specializations', { name: newName.trim() });
      await fetchSpecializations();
      setNewName('');
      Toast.show({ type: 'success', text1: 'Specialization Added' });
    } catch (error: any) {
      console.error('Error adding specialization:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.message || 'Failed to add specialization',
      });
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Specialization',
      'Are you sure you want to delete this specialization?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axiosInstance.delete(`/specializations/${id}`);
              setSpecializations((prev) => prev.filter((s) => s._id !== id));
              Toast.show({ type: 'success', text1: 'Deleted Successfully' });
            } catch (error: any) {
              console.error('Error deleting specialization:', error);
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2:
                  error.response?.data?.message ||
                  'Failed to delete specialization',
              });
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Specialization }) => (
    <View
      style={[
        styles.itemContainer,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.itemInfo}>
        <Text style={[typography.h3, { color: colors.text }]}>{item.name}</Text>
        <Text style={[typography.caption, { color: colors.textSubtle }]}>
          Added: {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <Pressable
        style={styles.deleteButton}
        onPress={() => handleDelete(item._id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="trash-outline" size={22} color="#ef4444" />
      </Pressable>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: 'Specializations' }} />

      {/* Add bar */}
      <View
        style={[
          styles.inputContainer,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            { color: colors.text, borderColor: colors.border },
          ]}
          placeholder="New specialization name..."
          placeholderTextColor={colors.textSubtle}
          value={newName}
          onChangeText={setNewName}
          returnKeyType="done"
          onSubmitEditing={handleAdd}
        />
        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: colors.purple, opacity: pressed ? 0.75 : 1 },
          ]}
          onPress={handleAdd}
          disabled={!newName.trim() || adding}
        >
          {adding ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={[typography.button, { color: '#fff' }]}>Add</Text>
          )}
        </Pressable>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.purple} />
        </View>
      ) : (
        <FlatList
          data={specializations}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[typography.body, { color: colors.textSubtle }]}>
                No specializations found.
              </Text>
            </View>
          }
        />
      )}
    </KeyboardAvoidingView>
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  addButton: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 72,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
});
