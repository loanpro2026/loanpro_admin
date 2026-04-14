type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

type CacheStore = Map<string, CacheEntry>;

const GLOBAL_KEY = '__loanpro_admin_response_cache__';

function getStore(): CacheStore {
  const g = globalThis as Record<string, unknown>;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = new Map<string, CacheEntry>();
  }
  return g[GLOBAL_KEY] as CacheStore;
}

function pruneExpired(store: CacheStore) {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.expiresAt <= now) {
      store.delete(key);
    }
  }
}

export function getCachedResponse<T>(key: string): T | null {
  const store = getStore();
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setCachedResponse<T>(key: string, value: T, ttlMs = 15000) {
  const store = getStore();
  pruneExpired(store);
  store.set(key, {
    expiresAt: Date.now() + Math.max(1000, ttlMs),
    value,
  });
}

export function invalidateCacheByPrefix(prefix: string) {
  const store = getStore();
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}

export function invalidateCacheByPrefixes(prefixes: string[]) {
  for (const prefix of prefixes) {
    invalidateCacheByPrefix(prefix);
  }
}
