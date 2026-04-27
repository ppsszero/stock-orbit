import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * useSortable의 transform/transition을 inline style 객체로 변환하는 thin wrapper.
 * StockRow, GridCard 등 sortable item에서 공유.
 *
 * WARNING: Emotion css와 style.transform이 충돌하면 안 됨 — css에는 transform 사용 금지.
 */
export const useSortableStyle = (id: string) => {
  const {
    attributes, listeners, setNodeRef,
    transform, transition: sortTransition, isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: sortTransition ?? undefined,
  };

  return { attributes, listeners, setNodeRef, style, isDragging };
};
