import { useEffect, useRef, useState } from 'react';

const getSessionStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

export function readPageSessionState<T>(pageKey: string, fallback: T): T {
  const storage = getSessionStorage();
  const key = (pageKey || 'page-session').trim();

  if (!storage || !key) {
    return fallback;
  }

  try {
    const rawValue = storage.getItem(key);
    if (!rawValue) {
      return fallback;
    }

    return JSON.parse(rawValue) as T;
  } catch {
    storage.removeItem(key);
    return fallback;
  }
}

export function writePageSessionState<T>(pageKey: string, value: T): void {
  const storage = getSessionStorage();
  const key = (pageKey || 'page-session').trim();

  if (!storage || !key) {
    return;
  }

  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota/storage errors and keep the in-memory state usable.
  }
}

export function clearPageSessionState(pageKey: string): void {
  const storage = getSessionStorage();
  const key = (pageKey || 'page-session').trim();

  if (storage && key) {
    storage.removeItem(key);
  }
}

export function usePageSessionState<T>(pageKey: string, initialState: T) {
  const key = (pageKey || 'page-session').trim();
  const skipNextPersistRef = useRef(false);
  const [state, setState] = useState<T>(() =>
    readPageSessionState<T>(key, initialState),
  );

  useEffect(() => {
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }

    writePageSessionState(key, state);
  }, [key, state]);

  const resetState = () => {
    skipNextPersistRef.current = true;
    clearPageSessionState(key);
    setState(initialState);
  };

  return { state, setState, resetState };
}
