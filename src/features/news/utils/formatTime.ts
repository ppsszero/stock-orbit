/** 뉴스 datetime 문자열을 상대 시간("3분 전", "2시간 전")으로 변환 */
export const formatTime = (dt: string): string => {
  if (!dt) return '';
  const d = new Date(dt.replace(' ', 'T'));
  const diff = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diff < 1) return '방금';
  if (diff < 60) return `${diff}분 전`;
  if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`;
  return `${Math.floor(diff / 1440)}일 전`;
};
