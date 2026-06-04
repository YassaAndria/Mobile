import { useEffect } from 'react';
import * as Contacts from 'expo-contacts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const CONTACTS_PERMISSION_REQUESTED_KEY = 'contacts_permission_requested';

/**
 * Hook to request contacts permission on first app launch.
 * After requesting, it stores a flag so we don't prompt again.
 */
export function useInitialPermissions() {
  useEffect(() => {
    const requestContactsPermission = async () => {
      await AsyncStorage.removeItem('contacts_permission_requested');
      try {
        // Check if we've already asked before
        const alreadyAsked = await AsyncStorage.getItem(CONTACTS_PERMISSION_REQUESTED_KEY);

        if (!alreadyAsked) {
          // First time - request permission
          const { status } = await Contacts.requestPermissionsAsync();
          
          // Mark that we've requested it (whether granted or denied)
          await AsyncStorage.setItem(CONTACTS_PERMISSION_REQUESTED_KEY, 'true');

          if (status === 'granted') {
            console.log('✅ Contacts permission granted');
          } else {
            console.log('❌ Contacts permission denied');
            Alert.alert(
              'Permission Required',
              'To access your contacts and find friends on Rabta, please enable contact permissions in Settings.',
              [{ text: 'OK' }]
            );
          }
        }
      } catch (error) {
        console.error('Error requesting contacts permission:', error);
      }
    };

    requestContactsPermission();
  }, []);
}
