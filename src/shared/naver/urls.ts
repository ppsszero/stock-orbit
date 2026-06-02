import { StockSymbol, inferCategory } from '@/shared/types';

export const getNewsUrl = (officeId: string, articleId: string) =>
  `https://n.news.naver.com/article/${officeId}/${articleId}`;

export const getNaverStockUrl = (symbol: Pick<StockSymbol, 'code' | 'nation' | 'reutersCode'> & Partial<Pick<StockSymbol, 'market' | 'category'>>) => {
  const cat = inferCategory(symbol as StockSymbol);

  // 지수/선물: code-pattern 기반 라우팅 (nation 기반은 자동완성 오분류로 깨짐)
  if (cat === 'index' || cat === 'futures') {
    const c = (symbol.code || '').toUpperCase();
    const rc = (symbol.reutersCode || '').toUpperCase();
    const ref = symbol.reutersCode || symbol.code;
    if (c.startsWith('.') || rc.startsWith('.')) {
      return `https://m.stock.naver.com/worldstock/index/${ref}`;
    }
    if (/CV\d+$/i.test(c) || /CV\d+$/i.test(rc)) {
      return `https://m.stock.naver.com/worldstock/futures/${ref}/price`;
    }
    return `https://m.stock.naver.com/domestic/index/${symbol.code}`;
  }

  return symbol.nation === 'KR'
    ? `https://m.stock.naver.com/domestic/stock/${symbol.code}/total`
    : `https://m.stock.naver.com/worldstock/stock/${symbol.reutersCode || symbol.code}/total`;
};
