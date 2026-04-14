import { useRef, useEffect, useState, useCallback } from 'react';
import { NaverAutoCompleteItem, StockSymbol } from '@/shared/types';
import { useBackAction } from '@/shared/hooks/useBackAction';
import { useSearch } from './useSearch';
import { useToast } from '@/shared/ui/Toast';
import { mapNationCode } from '@/shared/utils/format';
import { MAX_TOTAL_SYMBOLS } from '@/app/store';

interface UseSearchSheetParams {
  open: boolean;
  existingCodes: string[];
  presetName?: string;
  onClose: () => void;
  /** true = 추가 성공, false = 전체 한도(30개) 초과로 거부됨 */
  onAdd: (s: StockSymbol) => boolean;
  onRemove: (code: string) => void;
}

export const useSearchSheet = ({
  open, existingCodes, presetName, onClose, onAdd, onRemove,
}: UseSearchSheetParams) => {
  const { query, results, loading, search, clear } = useSearch();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const toast = useToast();

  useBackAction(open, onClose);

  useEffect(() => {
    if (open) {
      clear();
      setSelectedIdx(-1);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIdx(-1);
  }, [results]);

  // 선택된 항목이 보이도록 스크롤
  useEffect(() => {
    if (selectedIdx < 0 || !resultsRef.current) return;
    const rows = resultsRef.current.children;
    if (rows[selectedIdx]) (rows[selectedIdx] as HTMLElement).scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  const handleToggle = useCallback((item: NaverAutoCompleteItem) => {
    const added = existingCodes.includes(item.code);
    if (added) {
      onRemove(item.code);
      toast.show(`${presetName || '그룹'}에서 삭제했어요.`, 'delete');
    } else {
      const nation = mapNationCode(item.nationCode);
      const ok = onAdd({
        code: item.code, name: item.name, market: item.typeCode || '', nation,
        reutersCode: nation !== 'KR' ? item.reutersCode : undefined,
      });
      if (ok) {
        toast.show(`${presetName || '그룹'}에 추가했어요.`);
      } else {
        toast.show(`최대 ${MAX_TOTAL_SYMBOLS}개까지만 저장할 수 있어요`, 'error');
      }
    }
  }, [existingCodes, onAdd, onRemove, presetName, toast]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(prev => prev < results.length - 1 ? prev + 1 : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(prev => prev > 0 ? prev - 1 : results.length - 1);
    } else if ((e.key === 'Enter' || e.key === ' ') && selectedIdx >= 0) {
      e.preventDefault();
      handleToggle(results[selectedIdx]);
    }
  }, [results, selectedIdx, handleToggle, onClose]);

  return {
    query, results, loading, search, clear,
    inputRef, resultsRef, selectedIdx,
    handleToggle, handleKeyDown,
  };
};
