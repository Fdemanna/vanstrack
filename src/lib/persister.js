import { get, set, del } from 'idb-keyval';

/**
 * Creates an IndexedDB persister for TanStack Query Client persistence
 * @param {string} idbKey - The key to store the client state in IndexedDB
 * @returns {import('@tanstack/react-query-persist-client').Persister}
 */
export function createIndexedDBPersister(idbKey = 'vantrack-query-cache') {
  return {
    persistClient: async (client) => {
      try {
        await set(idbKey, client);
      } catch (err) {
        console.error('Error persisting query client to IndexedDB:', err);
      }
    },
    restoreClient: async () => {
      try {
        return await get(idbKey);
      } catch (err) {
        console.error('Error restoring query client from IndexedDB:', err);
        return undefined;
      }
    },
    removeClient: async () => {
      try {
        await del(idbKey);
      } catch (err) {
        console.error('Error removing query client from IndexedDB:', err);
      }
    },
  };
}
