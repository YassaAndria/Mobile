import { useState, useCallback } from 'react';
import * as Contacts from 'expo-contacts';
import * as Localization from 'expo-localization';
import axiosInstance from '../api/axiosInstance';
import { Alert } from 'react-native';

export interface RegisteredContact {
  _id: string;
  fullName: string;
  avatar: string;
  phoneNumber: string;
  jobTitle?: string;
  status: string;
  role: string;
}

export interface UnregisteredContact {
  originalNumber: string;
  standardizedNumber: string;
}

export function useSyncContacts() {
  const [loading, setLoading] = useState(false);
  const [registeredContacts, setRegisteredContacts] = useState<RegisteredContact[]>([]);
  const [unregisteredNumbers, setUnregisteredNumbers] = useState<UnregisteredContact[]>([]);
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
        // Extract all raw phone numbers
        const rawPhoneNumbers: string[] = [];
        data.forEach(contact => {
          if (contact.phoneNumbers) {
            contact.phoneNumbers.forEach(phone => {
              if (phone.number) {
                rawPhoneNumbers.push(phone.number);
              }
            });
          }
        });

        // Get the device region code (e.g. 'US', 'EG') using expo-localization
        // The getLocales() function returns an array of locales, we take the first one.
        const locales = Localization.getLocales();
        const regionCode = locales.length > 0 ? locales[0].regionCode : 'EG';

        // Send to backend
        const response = await axiosInstance.post('/users/sync-contacts', {
          contacts: rawPhoneNumbers,
          regionCode: regionCode || 'EG'
        });

        if (response.data.status === 'success') {
          setRegisteredContacts(response.data.data.registeredContacts || []);
          setUnregisteredNumbers(response.data.data.unregisteredNumbers || []);
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
    registeredContacts,
    unregisteredNumbers,
    error,
    hasSynced
  };
}
