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

interface JobCategory {
  _id: string;
  name: string;
  value: string;
  createdAt: string;
}

export default function AdminJobCategoriesScreen() {
  const { colors } = useTheme();
  const [categories, setCategories] = useState<JobCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/job-categories');
      setCategories(response.data.data.categories || []);
    } catch (error: any) {
      console.error('Error fetching job categories:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load job categories',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      setAdding(true);
      const { data } = await axiosInstance.post('/admin/job-categories', {
        name: newName.trim(),
      });
      const added = data.data?.category;
      if (added) {
        setCategories((prev) => [...prev, added]);
        setNewName('');
        Toast.show({ type: 'success', text1: 'Job Category Added' });
      } else {
        await fetchCategories();
        setNewName('');
      }
    } catch (error: any) {
      console.error('Error adding job category:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.message || 'Failed to add job category',
      });
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Delete Job Category',
      `Are you sure you want to delete the category "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axiosInstance.delete(`/admin/job-categories/${id}`);
              setCategories((prev) => prev.filter((c) => c._id !== id));
              Toast.show({ type: 'success', text1: 'Deleted Successfully' });
            } catch (error: any) {
              console.error('Error deleting job category:', error);
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2:
                  error.response?.data?.message ||
                  'Failed to delete job category',
              });
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: JobCategory }) => (
    <View
      style={[
        styles.itemContainer,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.itemInfo}>
        <Text style={[typography.h3, { color: colors.text }]}>{item.name}</Text>
        <Text style={[typography.caption, { color: colors.textSubtle, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
          Value: {item.value}
        </Text>
        <Text style={[typography.caption, { color: colors.textSubtle }]}>
          Added: {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <Pressable
        style={styles.deleteButton}
        onPress={() => handleDelete(item._id, item.name)}
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
      <Stack.Screen options={{ title: 'Job Categories' }} />

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
          placeholder="New job category name..."
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
          data={categories}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[typography.body, { color: colors.textSubtle }]}>
                No job categories found.
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
