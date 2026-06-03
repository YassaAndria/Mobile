import { useState, useCallback } from 'react';
import * as Contacts from 'expo-contacts/legacy';
import * as Localization from 'expo-localization';
import axiosInstance from '../api/axiosInstance';
import { Alert } from 'react-native';

export interface UnifiedContact {
  id: string; // unique key
  name: string; // phonebook name or backend name
  phoneNumber: string; // original format
  isRegistered: boolean;
  avatar?: string;
  backendId?: string; // used for starting chat
}

export function useSyncContacts() {
  const [loading, setLoading] = useState(false);
  const [unifiedContacts, setUnifiedContacts] = useState<UnifiedContact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasSynced, setHasSynced] = useState(false);

  const syncContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Contacts permission denied. Please enable it in your device settings.');
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
      });

      if (data.length > 0) {
        const rawPhoneNumbers: string[] = [];
        const localNamesMap: Record<string, string> = {};

        data.forEach(contact => {
          if (contact.phoneNumbers) {
            contact.phoneNumbers.forEach(phone => {
              if (phone.number) {
                rawPhoneNumbers.push(phone.number);
                // Keep the first name found for a number
                if (!localNamesMap[phone.number]) {
                  localNamesMap[phone.number] = contact.name || 'Unknown Contact';
                }
              }
            });
          }
        });

        const locales = Localization.getLocales();
        const regionCode = locales.length > 0 ? locales[0].regionCode : 'EG';

        const response = await axiosInstance.post('/users/sync-contacts', {
          contacts: rawPhoneNumbers,
          regionCode: regionCode || 'EG'
        });

        if (response.data.status === 'success') {
          const { registeredContacts = [], unregisteredNumbers = [] } = response.data.data;
          
          const unified: UnifiedContact[] = [];

          registeredContacts.forEach((rc: any) => {
            unified.push({
              id: rc._id,
              name: localNamesMap[rc.originalNumber] || rc.fullName || rc.originalNumber,
              phoneNumber: rc.originalNumber,
              isRegistered: true,
              avatar: rc.avatar,
              backendId: rc._id
            });
          });

          unregisteredNumbers.forEach((uc: any) => {
            unified.push({
              id: uc.standardizedNumber,
              name: localNamesMap[uc.originalNumber] || uc.originalNumber,
              phoneNumber: uc.originalNumber,
              isRegistered: false
            });
          });

          // Sort: registered first, then alphabetically by name
          unified.sort((a, b) => {
            if (a.isRegistered && !b.isRegistered) return -1;
            if (!a.isRegistered && b.isRegistered) return 1;
            return a.name.localeCompare(b.name);
          });

          setUnifiedContacts(unified);
          setHasSynced(true);
        }
      } else {
        setHasSynced(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sync contacts.');
      Alert.alert('Error', err.message || 'Failed to sync contacts.');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    syncContacts,
    loading,
    unifiedContacts,
    error,
    hasSynced
  };
}
