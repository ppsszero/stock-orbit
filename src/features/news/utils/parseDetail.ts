/** AI 브리핑 detail HTML을 <b>제목</b>\n본문 블록으로 파싱 */
export interface DetailSection {
  heading: string;
  body: string;
}

export const parseDetail = (html: string): DetailSection[] => {
  const blocks = html.split(/\n\n+/).filter(Boolean);
  return blocks.map(block => {
    const match = block.match(/^<b>(.*?)<\/b>\s*\n?([\s\S]*)$/);
    if (match) return { heading: match[1], body: match[2].trim() };
    return { heading: '', body: block.replace(/<[^>]+>/g, '').trim() };
  }).filter(b => b.body || b.heading);
};
