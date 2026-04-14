import { useState, useRef, useCallback } from 'react';
import { Preset } from '@/shared/types';
import { useToast } from '@/shared/ui/Toast';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import { useOutsideClick } from '@/shared/hooks/useOutsideClick';

interface CtxMenu {
  id: string;
  x: number;
  y: number;
}

interface UsePresetActionsParams {
  presets: Preset[];
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
}

export function usePresetActions({ presets, onRename, onRemove }: UsePresetActionsParams) {
  const toast = useToast();
  const confirm = useConfirm();

  const [ctx, setCtx] = useState<CtxMenu | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeCtx = useCallback(() => setCtx(null), []);
  useOutsideClick(menuRef, !!ctx, closeCtx);

  const openCtx = useCallback((id: string, x: number, y: number) => {
    setCtx({ id, x, y });
  }, []);

  const startRename = useCallback(() => {
    if (!ctx) return;
    const preset = presets.find(p => p.id === ctx.id);
    setRenameTarget({ id: ctx.id, name: preset?.name || '' });
    setCtx(null);
  }, [ctx, presets]);

  const commitRename = useCallback((newName: string) => {
    if (renameTarget) onRename(renameTarget.id, newName);
    setRenameTarget(null);
  }, [renameTarget, onRename]);

  const cancelRename = useCallback(() => setRenameTarget(null), []);

  const handleRemove = useCallback(async () => {
    if (!ctx) return;
    const name = presets.find(p => p.id === ctx.id)?.name || '그룹';
    setCtx(null);
    const ok = await confirm({
      title: `"${name}" 삭제`,
      message: '이 그룹을 삭제할까요?\n포함된 종목 목록도 함께 사라져요.',
      confirmText: '삭제할게요', cancelText: '아니요', danger: true,
    });
    if (ok) {
      onRemove(ctx.id);
      toast.show(`"${name}"을 삭제했어요.`, 'delete');
    }
  }, [ctx, presets, confirm, onRemove, toast]);

  return {
    ctx,
    renameTarget,
    menuRef,
    openCtx,
    startRename,
    commitRename,
    cancelRename,
    handleRemove,
    presetsCount: presets.length,
  };
}
