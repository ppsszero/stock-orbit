import { useState, useCallback, useRef } from 'react';
import { NaverAutoCompleteItem } from '@/shared/types';
import { searchStocks } from '@/shared/naver';

export const useSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NaverAutoCompleteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback((q: string) => {
    setQuery(q);
    clearTimeout(debounceRef.current);

    if (!q.trim()) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const items = await searchStocks(q);
        setResults(items);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
  }, []);

  return { query, results, loading, search, clear };
};
