/**
 * Squarified Treemap 알고리즘 (Bruls·Huijse·van Wijk, 2000).
 * 가중치(value)에 비례한 면적의 사각형을 종횡비 1에 가깝게 배치.
 *
 * 외부 라이브러리 없이 11~30개 정도 아이템에 충분.
 * 입력: items with value(>0), 컨테이너 width/height
 * 출력: 각 item에 x, y, w, h 좌표 부여한 결과
 */
export interface SquarifyInput<T> {
  value: number;
  data: T;
}
export interface SquarifyTile<T> {
  x: number;
  y: number;
  w: number;
  h: number;
  data: T;
}

interface Rect { x: number; y: number; w: number; h: number; }

/** 한 row에 추가 시 최악 종횡비 — 작을수록 정사각형에 가까움 (Bruls eq 1) */
const worst = (areas: number[], shortSide: number): number => {
  if (areas.length === 0 || shortSide === 0) return Infinity;
  const sum = areas.reduce((s, a) => s + a, 0);
  const max = Math.max(...areas);
  const min = Math.min(...areas);
  const s2 = shortSide * shortSide;
  const sum2 = sum * sum;
  return Math.max((s2 * max) / sum2, sum2 / (s2 * min));
};

export const squarify = <T>(items: SquarifyInput<T>[], width: number, height: number): SquarifyTile<T>[] => {
  if (items.length === 0 || width <= 0 || height <= 0) return [];
  const sorted = items.filter(i => i.value > 0).sort((a, b) => b.value - a.value);
  if (sorted.length === 0) return [];
  const totalValue = sorted.reduce((s, i) => s + i.value, 0);
  const totalArea = width * height;
  // value → 면적으로 환산 (전체 컨테이너 = totalArea가 totalValue에 대응)
  const scaled = sorted.map(i => ({ area: (i.value / totalValue) * totalArea, data: i.data }));

  const result: SquarifyTile<T>[] = [];
  let rect: Rect = { x: 0, y: 0, w: width, h: height };
  let row: { area: number; data: T }[] = [];

  // row 확정 → 짧은 변을 따라 펼치고, 남은 rect 반환
  const layoutAndAdvance = (currentRow: { area: number; data: T }[], currentRect: Rect): Rect => {
    const rowSum = currentRow.reduce((s, r) => s + r.area, 0);
    if (rowSum === 0) return currentRect;
    const wideHorizontal = currentRect.w <= currentRect.h;
    const otherSide = rowSum / (wideHorizontal ? currentRect.w : currentRect.h);
    if (wideHorizontal) {
      // 짧은 변이 w → row가 가로로 펼침, 두께 = otherSide
      let cx = currentRect.x;
      currentRow.forEach(r => {
        const tileW = r.area / otherSide;
        result.push({ x: cx, y: currentRect.y, w: tileW, h: otherSide, data: r.data });
        cx += tileW;
      });
      return { x: currentRect.x, y: currentRect.y + otherSide, w: currentRect.w, h: currentRect.h - otherSide };
    }
    // 짧은 변이 h → row가 세로로 펼침, 두께 = otherSide
    let cy = currentRect.y;
    currentRow.forEach(r => {
      const tileH = r.area / otherSide;
      result.push({ x: currentRect.x, y: cy, w: otherSide, h: tileH, data: r.data });
      cy += tileH;
    });
    return { x: currentRect.x + otherSide, y: currentRect.y, w: currentRect.w - otherSide, h: currentRect.h };
  };

  for (const item of scaled) {
    const shortSide = Math.min(rect.w, rect.h);
    if (shortSide === 0) break;
    const rowAreas = row.map(r => r.area);
    const wBefore = worst(rowAreas, shortSide);
    const wAfter = worst([...rowAreas, item.area], shortSide);
    if (row.length === 0 || wAfter <= wBefore) {
      row.push(item);
    } else {
      rect = layoutAndAdvance(row, rect);
      row = [item];
    }
  }
  if (row.length > 0) layoutAndAdvance(row, rect);
  return result;
};
