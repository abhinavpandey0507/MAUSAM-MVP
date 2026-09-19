import { useEffect } from 'react';

export function useLocalStorage<T>(key: string, initial: T) {
  // Thin wrapper kept for future/optional persistence; AppContext owns storage today.
  return { key, initial };
}

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}