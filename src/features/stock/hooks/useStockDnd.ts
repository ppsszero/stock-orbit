import { useCallback } from 'react';
import { MouseSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';

/**
 * Stock 뷰(List/Grid)에서 사용하는 dnd-kit 공용 셋업.
 * sensors + drag-end 핸들러를 한 번에 반환.
 *
 * NOTE: PointerSensor 대신 MouseSensor 사용 — Electron에서 setPointerCapture 이슈 회피.
 */
export const useStockDnd = (onReorder: (activeId: string, overId: string) => void) => {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorder(active.id as string, over.id as string);
  }, [onReorder]);

  return { sensors, handleDragEnd };
};
