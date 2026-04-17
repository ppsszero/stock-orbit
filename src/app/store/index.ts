import { create } from 'zustand';
import { AppSettings, Preset, StockSymbol, StockPrice } from '@/shared/types';
import { logger } from '@/shared/utils/logger';

/* ─── Default Values ─── */

const PRESETS_KEY = 'orbit-presets';
const ACTIVE_KEY = 'orbit-active-preset';
const SETTINGS_KEY = 'orbit-settings';

/** 네이버 API 차단 방지 — 전체 그룹에서 중복 없는 종목 수의 상한 (베타) */
export const MAX_TOTAL_SYMBOLS = 30;

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  opacity: 0.95,
  alwaysOnTop: false,
  refreshIntervalDomestic: 15,
  refreshIntervalOverseas: 70,
  tickerSpeed: 50,
  currencyMode: 'KRW',
  resolution: { width: 420, height: 680 },
  fontSize: 'medium',
  autoCleanLogs: true,
  autoLaunch: false,
  viewMode: 'list',
  sortKey: 'custom',
  sortDir: 'desc',
  screenshot: {
    shortcut: 'F9',
    mode: 'clipboard',
    savePath: '',  // 빈 문자열이면 Electron에서 Desktop/stock-orbit으로 기본 설정
  },
};

const DEFAULT_PRESETS: Preset[] = [
  {
    id: 'default',
    name: '관심종목',
    symbols: [
      { code: '005930', name: '삼성전자', market: 'KOSPI', nation: 'KR' },
      { code: '000660', name: 'SK하이닉스', market: 'KOSPI', nation: 'KR' },
      { code: 'AAPL.O', name: 'Apple', nameEn: 'Apple', market: 'NASDAQ', nation: 'US', reutersCode: 'AAPL.O' },
      { code: 'NVDA.O', name: 'NVIDIA', nameEn: 'NVIDIA', market: 'NASDAQ', nation: 'US', reutersCode: 'NVDA.O' },
    ],
  },
];

/* ─── Helpers ─── */

const loadSettings = (): AppSettings => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(stored);
    // 마이그레이션: 기존 refreshInterval → 새 필드로 변환
    if ('refreshInterval' in parsed && !('refreshIntervalDomestic' in parsed)) {
      parsed.refreshIntervalDomestic = Math.max(10, parsed.refreshInterval);
      parsed.refreshIntervalOverseas = Math.max(70, parsed.refreshInterval * 2);
      delete parsed.refreshInterval;
    }
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch { return DEFAULT_SETTINGS; }
};

// NOTE: 구버전에서는 심볼을 문자열("005930", "AAPL.O")로 저장했음.
// 이 함수는 문자열 → StockSymbol 객체로 마이그레이션. 한 번 변환 후 새 형식으로 덮어씀.
const migrateSymbols = (symbols: unknown[]): StockSymbol[] =>
  symbols.map(s => {
    if (typeof s === 'string') {
      const isKR = s.endsWith('.KS') || s.endsWith('.KQ') || /^\d{6}$/.test(s);
      const code = s.replace(/\.(KS|KQ)$/, '');
      return { code: isKR ? code : s, name: code, market: isKR ? 'KRX' : 'US', nation: isKR ? 'KR' : 'US', reutersCode: isKR ? undefined : `${s}.O` };
    }
    if (typeof s === 'object' && s !== null && 'code' in s) return s as StockSymbol;
    return null;
  }).filter(Boolean) as StockSymbol[];

const loadPresets = (): Preset[] => {
  try {
    const stored = localStorage.getItem(PRESETS_KEY);
    if (!stored) return DEFAULT_PRESETS;
    const parsed = JSON.parse(stored) as (Omit<Preset, 'symbols'> & { symbols?: unknown[] })[];
    const migrated = parsed.map(p => ({ ...p, symbols: migrateSymbols(p.symbols || []) }));
    localStorage.setItem(PRESETS_KEY, JSON.stringify(migrated));
    return migrated;
  } catch { return DEFAULT_PRESETS; }
};

const savePresets = (presets: Preset[]) =>
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));

const saveSettings = (settings: AppSettings) =>
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

/* ─── Sheet Names ─── */

export type SheetName =
  | 'search' | 'settings' | 'investor'
  | 'ranking' | 'news' | 'marquee' | 'newGroup';

/* ─── Store Interface ─── */

interface AppState {
  // Settings
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;

  // Presets
  presets: Preset[];
  activeId: string;
  setActiveId: (id: string) => void;
  addPreset: (name: string) => void;
  removePreset: (id: string) => void;
  renamePreset: (id: string, name: string) => void;
  /** 종목 추가. true = 성공, false = 전체 30개 제한 초과로 거부됨 */
  addSymbol: (symbol: StockSymbol) => boolean;
  removeSymbol: (code: string) => void;
  reorderSymbols: (from: number, to: number) => void;
  reorderByCode: (activeCode: string, overCode: string) => void;

  // UI Sheets
  openSheet: SheetName | null;
  setSheet: (name: SheetName | null) => void;

  // Detail views
  detailSymbol: StockSymbol | null;
  setDetailSymbol: (sym: StockSymbol | null) => void;
  infoSymbol: { sym: StockSymbol; price: StockPrice } | null;
  setInfoSymbol: (info: { sym: StockSymbol; price: StockPrice } | null) => void;
  highlightCode: string | null;
  setHighlightCode: (code: string | null) => void;

  // Reset
  resetAll: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  /* ─── Settings ─── */
  settings: loadSettings(),
  updateSettings: (patch) => set(state => {
    const next = { ...state.settings, ...patch };
    saveSettings(next);
    return { settings: next };
  }),

  /* ─── Presets ─── */
  presets: loadPresets(),
  activeId: localStorage.getItem(ACTIVE_KEY) || 'default',

  setActiveId: (id) => {
    localStorage.setItem(ACTIVE_KEY, id);
    set({ activeId: id });
  },

  addPreset: (name) => {
    const id = `preset-${Date.now()}`;
    const next = [...get().presets, { id, name, symbols: [] }];
    savePresets(next);
    localStorage.setItem(ACTIVE_KEY, id);
    set({ presets: next, activeId: id });
    logger.info('그룹 추가', name);
  },

  removePreset: (id) => {
    const { presets, activeId } = get();
    if (presets.length <= 1) return;
    const next = presets.filter(p => p.id !== id);
    savePresets(next);
    const newActiveId = activeId === id ? next[0].id : activeId;
    if (activeId === id) localStorage.setItem(ACTIVE_KEY, newActiveId);
    set({ presets: next, activeId: newActiveId });
  },

  renamePreset: (id, name) => {
    const next = get().presets.map(p => p.id === id ? { ...p, name } : p);
    savePresets(next);
    set({ presets: next });
  },

  addSymbol: (symbol) => {
    const { presets, activeId } = get();
    const targetId = presets.find(p => p.id === activeId) ? activeId : presets[0]?.id;
    if (!targetId) return false;
    // 전체 그룹을 통틀어 중복 없는 종목 수가 MAX_TOTAL_SYMBOLS를 넘지 않도록 제한
    // (네이버 API 차단 방지 — 베타 기간 동안 적용)
    const uniqueCodes = new Set(presets.flatMap(p => p.symbols.map(s => s.code)));
    if (!uniqueCodes.has(symbol.code) && uniqueCodes.size >= MAX_TOTAL_SYMBOLS) {
      return false;
    }
    const next = presets.map(p =>
      p.id === targetId && !p.symbols.find(s => s.code === symbol.code)
        ? { ...p, symbols: [...p.symbols, symbol] }
        : p
    );
    savePresets(next);
    set({ presets: next });
    return true;
  },

  removeSymbol: (code) => {
    const { presets, activeId } = get();
    const hasTarget = presets.some(p => p.id === activeId);
    const next = presets.map(p => {
      if (hasTarget ? p.id === activeId : true) {
        return { ...p, symbols: p.symbols.filter(s => s.code !== code) };
      }
      return p;
    });
    savePresets(next);
    set({ presets: next });
  },

  reorderSymbols: (fromIndex, toIndex) => {
    const { presets, activeId } = get();
    const next = presets.map(p => {
      if (p.id !== activeId) return p;
      const syms = [...p.symbols];
      const [moved] = syms.splice(fromIndex, 1);
      syms.splice(toIndex, 0, moved);
      return { ...p, symbols: syms };
    });
    savePresets(next);
    set({ presets: next });
  },

  // NOTE: reorderSymbols(인덱스 기반)와 별도로 코드 기반 리오더를 제공.
  // dnd-kit은 id(=sym.code)만 전달하므로 인덱스 변환 없이 직접 찾음.
  // WARNING: activeId를 사용하지 않음 — "전체" 탭에서도 올바른 프리셋을 자동 탐색.
  reorderByCode: (activeCode, overCode) => {
    const { presets } = get();
    const next = presets.map(p => {
      const syms = [...p.symbols];
      const fromIdx = syms.findIndex(s => s.code === activeCode);
      const toIdx = syms.findIndex(s => s.code === overCode);
      if (fromIdx === -1 || toIdx === -1) return p;
      const [moved] = syms.splice(fromIdx, 1);
      syms.splice(toIdx, 0, moved);
      return { ...p, symbols: syms };
    });
    savePresets(next);
    set({ presets: next });
  },

  /* ─── UI Sheets ─── */
  openSheet: null,
  setSheet: (name) => set({ openSheet: name }),

  /* ─── Detail views ─── */
  detailSymbol: null,
  setDetailSymbol: (sym) => set({ detailSymbol: sym }),
  infoSymbol: null,
  setInfoSymbol: (info) => set({ infoSymbol: info }),
  highlightCode: null,
  setHighlightCode: (code) => set({ highlightCode: code }),

  /* ─── Reset ─── */
  // WARNING: localStorage.clear()가 아닌 앱 키만 선택 삭제.
  // clear()는 다른 앱/라이브러리의 데이터까지 날리므로 사용 금지.
  resetAll: () => {
    [PRESETS_KEY, ACTIVE_KEY, SETTINGS_KEY].forEach(k => localStorage.removeItem(k));
    // 실제 Electron 창 크기도 기본값으로 복원
    window.electronAPI?.setSize(DEFAULT_SETTINGS.resolution);
    window.electronAPI?.setOpacity(DEFAULT_SETTINGS.opacity);
    logger.info('전체 초기화 완료');
    window.location.reload();
  },
}));
