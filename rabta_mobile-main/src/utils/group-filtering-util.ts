import { RegisteredContact } from '../hooks/useSyncContacts';

/**
 * Filters a raw list of users (e.g., from a general search or database query)
 * to only include users who exist in the user's synced registered contacts.
 * 
 * This is useful for:
 * 1. Creating a new group
 * 2. Adding members to an existing group
 * 3. Viewing group members (highlighting who is a contact)
 *
 * @param allUsers The raw list of users fetched from the backend or store.
 * @param syncedContacts The list of registered contacts synced from the device's phonebook.
 * @returns A filtered array containing only users that are in the synced contacts.
 */
export function filterUsersBySyncedContacts(
  allUsers: any[],
  syncedContacts: RegisteredContact[]
): any[] {
  if (!allUsers || !syncedContacts) return [];

  // Create a Set of synced contact IDs for O(1) lookup
  const syncedIds = new Set(syncedContacts.map(contact => contact._id));

  // Filter the allUsers list
  return allUsers.filter(user => syncedIds.has(user._id));
}

/**
 * Example usage in a Component:
 * 
 * const { registeredContacts } = useSyncContacts();
 * const [allUsers, setAllUsers] = useState([]);
 * 
 * // When creating a group, you only want to allow selecting from synced contacts:
 * const eligibleGroupMembers = useMemo(() => {
 *    return filterUsersBySyncedContacts(allUsers, registeredContacts);
 * }, [allUsers, registeredContacts]);
 */
