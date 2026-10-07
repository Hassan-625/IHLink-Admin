type AuthStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export const REMEMBER_DEVICE_KEY = 'ih_remember_device';

export function createAuthStorage(device: () => AuthStorage, tab: () => AuthStorage): AuthStorage {
  const memory = new Map<string, string>();
  const remembered = () => { try { return device().getItem(REMEMBER_DEVICE_KEY) === '1'; } catch { return false; } };
  const removeDeviceItem = (key: string) => { try { device().removeItem(key); } catch { /* Browser storage may be blocked. */ } };
  return {
    getItem(key) {
      const useDevice = remembered();
      if (!useDevice) removeDeviceItem(key);
      try { return (useDevice ? device() : tab()).getItem(key); } catch { return memory.get(key) ?? null; }
    },
    setItem(key, value) {
      memory.set(key, value);
      const useDevice = remembered();
      try { (useDevice ? device() : tab()).setItem(key, value); } catch { /* Keep only the in-memory session if storage is blocked. */ }
      if (!useDevice) removeDeviceItem(key);
      else { try { tab().removeItem(key); } catch { /* No tab storage is available. */ } }
    },
    removeItem(key) {
      memory.delete(key);
      removeDeviceItem(key);
      try { tab().removeItem(key); } catch { /* No tab storage is available. */ }
    },
  };
}

export const browserAuthStorage = createAuthStorage(
  () => window.localStorage,
  () => window.sessionStorage,
);
