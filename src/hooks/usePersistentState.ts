import { useCallback, useState } from "react";

/** useState that survives reloads via localStorage (silently falls back to memory if storage is blocked). */
export function usePersistentState<T>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  const set = useCallback(
    (next: T) => {
      setValue(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* storage unavailable — keep the in-memory value */
      }
    },
    [key]
  );
  return [value, set];
}
