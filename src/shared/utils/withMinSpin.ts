/**
 * 비동기 작업을 최소 표시 시간(기본 400ms) 보장과 함께 실행.
 *
 * 캐시 히트 등으로 즉시 반환되는 경우 사용자가 새로고침을 인지하지 못하므로
 * 일정 시간 동안 스피너를 보여 "갱신됐다"는 피드백을 명확히 한다.
 *
 * 사용 예:
 *   const data = await withMinSpin(() => fetchInvestorData('KOSPI'));
 */
export const withMinSpin = async <T>(
  fn: () => Promise<T>,
  minMs = 400,
): Promise<T> => {
  const started = Date.now();
  const result = await fn();
  const elapsed = Date.now() - started;
  if (elapsed < minMs) {
    await new Promise(r => setTimeout(r, minMs - elapsed));
  }
  return result;
};
