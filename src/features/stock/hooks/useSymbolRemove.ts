import { useCallback } from 'react';
import { StockSymbol } from '@/shared/types';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import { useToast } from '@/shared/ui/Toast';

interface UseSymbolRemoveOptions {
  /** true면 startViewTransition으로 감싸 삭제 (StockTile용) */
  withTransition?: boolean;
}

/**
 * 종목 삭제 확인 다이얼로그 + 토스트 패턴 공용 훅.
 * StockRow, GridCard, StockTile에서 동일하게 사용.
 *
 * onRemove가 undefined면 핸들러는 no-op (StockTile의 optional onRemove 케이스 대응).
 */
export const useSymbolRemove = (
  sym: StockSymbol,
  displayName: string,
  onRemove: ((code: string) => void) | undefined,
  options: UseSymbolRemoveOptions = {},
) => {
  const confirm = useConfirm();
  const toast = useToast();
  const { withTransition } = options;

  return useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onRemove) return;
    const ok = await confirm({
      title: `"${displayName}" 삭제`,
      message: '이 종목을 관심목록에서 삭제할까요?',
      confirmText: '삭제', cancelText: '취소', danger: true,
    });
    if (!ok) return;

    if (withTransition) {
      type DocWithTransition = Document & { startViewTransition?: (cb: () => void) => void };
      const doc = document as DocWithTransition;
      if (typeof doc.startViewTransition === 'function') {
        doc.startViewTransition(() => onRemove(sym.code));
      } else {
        onRemove(sym.code);
      }
    } else {
      onRemove(sym.code);
    }
    toast.show(`"${displayName}" 종목을 삭제했어요.`, 'delete');
  }, [onRemove, sym.code, displayName, confirm, toast, withTransition]);
};
