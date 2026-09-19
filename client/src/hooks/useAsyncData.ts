import { useEffect, useRef, useState } from 'react';

export interface AsyncState<T> {
  data: T | null;
  prev: T | null;
  loading: boolean;
  updating: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAsyncData<T>(fetcher: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const prev = useRef<T | null>(null);
  const first = useRef(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = (isRefetch = false) => {
    if (!isRefetch && fetcherRef.current === undefined) return;
    if (first.current) setLoading(true);
    else if (!isRefetch) setUpdating(true);
    else setLoading(true);
    fetcherRef
      .current()
      .then((res) => {
        prev.current = data;
        setData(res);
        setError(null);
      })
      .catch((e: Error) => {
        setError(e.message || 'Failed to load data');
      })
      .finally(() => {
        setLoading(false);
        setUpdating(false);
        first.current = false;
      });
  };

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, prev: prev.current, loading, updating, error, refetch: () => run(true) };
}