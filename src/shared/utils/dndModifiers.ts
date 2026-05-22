import type { Modifier } from '@dnd-kit/core';

/**
 * 활성 드래그 아이템의 X축 이동을 막아 세로축 reorder만 허용.
 *
 * 왜 필요한가:
 * - dnd-kit의 verticalListSortingStrategy는 *다른* 아이템 재배치만 세로축으로 제한하고,
 *   드래그 중인 active 아이템 자체는 포인터 X 델타까지 translate되어 가로로 튀어나감.
 * - 좁은 시트(EditSymbolsSheet, GroupEditSheet) 안에서 가로로 끌면 행이 컨테이너 밖으로
 *   빠져서 가로 스크롤바가 무한 증식하는 사고가 발생.
 * - DndContext의 modifiers 배열에 넣으면 transform.x를 0으로 고정해서 해결.
 */
export const restrictToYAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 });
