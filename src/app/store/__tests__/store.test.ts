import { useStore } from '..';
import type { StockSymbol } from '../../types';

// localStorage mock
const storage: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => storage[key] ?? null),
  setItem: vi.fn((key: string, val: string) => { storage[key] = val; }),
  removeItem: vi.fn((key: string) => { delete storage[key]; }),
  clear: vi.fn(() => { Object.keys(storage).forEach(k => delete storage[k]); }),
  get length() { return Object.keys(storage).length; },
  key: vi.fn((i: number) => Object.keys(storage)[i] ?? null),
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// window.location.reload mock
const reloadMock = vi.fn();
Object.defineProperty(globalThis, 'location', {
  value: { reload: reloadMock },
  writable: true,
});

const sym: StockSymbol = { code: '005930', name: '삼성전자', market: 'KOSPI', nation: 'KR' };
const sym2: StockSymbol = { code: 'AAPL.O', name: 'Apple', market: 'NASDAQ', nation: 'US', reutersCode: 'AAPL.O' };

beforeEach(() => {
  Object.keys(storage).forEach(k => delete storage[k]);
  vi.clearAllMocks();
  // store 초기 상태로 리셋 — Zustand setState 사용
  useStore.setState({
    presets: [{ id: 'default', name: '관심종목', symbols: [] }],
    activeId: 'default',
    settings: useStore.getState().settings,
  });
});

describe('Store — 종목 관리', () => {
  it('addSymbol로 종목을 추가할 수 있다', () => {
    useStore.getState().addSymbol(sym);
    const presets = useStore.getState().presets;
    expect(presets[0].symbols).toHaveLength(1);
    expect(presets[0].symbols[0].code).toBe('005930');
  });

  it('중복 종목은 추가되지 않는다', () => {
    useStore.getState().addSymbol(sym);
    useStore.getState().addSymbol(sym);
    expect(useStore.getState().presets[0].symbols).toHaveLength(1);
  });

  it('removeSymbol로 종목을 제거할 수 있다', () => {
    useStore.getState().addSymbol(sym);
    useStore.getState().addSymbol(sym2);
    useStore.getState().removeSymbol('005930');
    const symbols = useStore.getState().presets[0].symbols;
    expect(symbols).toHaveLength(1);
    expect(symbols[0].code).toBe('AAPL.O');
  });

  it('reorderSymbols로 순서를 변경할 수 있다', () => {
    useStore.getState().addSymbol(sym);
    useStore.getState().addSymbol(sym2);
    useStore.getState().reorderSymbols(0, 1);
    const symbols = useStore.getState().presets[0].symbols;
    expect(symbols[0].code).toBe('AAPL.O');
    expect(symbols[1].code).toBe('005930');
  });

  it('reorderByCode로 코드 기반 순서 변경이 된다', () => {
    useStore.getState().addSymbol(sym);
    useStore.getState().addSymbol(sym2);
    useStore.getState().reorderByCode('005930', 'AAPL.O');
    const symbols = useStore.getState().presets[0].symbols;
    expect(symbols[0].code).toBe('AAPL.O');
    expect(symbols[1].code).toBe('005930');
  });
});

describe('Store — 프리셋 관리', () => {
  it('addPreset으로 새 그룹을 추가할 수 있다', () => {
    useStore.getState().addPreset('테스트');
    const presets = useStore.getState().presets;
    expect(presets).toHaveLength(2);
    expect(presets[1].name).toBe('테스트');
  });

  it('removePreset으로 그룹을 삭제할 수 있다', () => {
    useStore.getState().addPreset('삭제할그룹');
    const id = useStore.getState().presets[1].id;
    useStore.getState().removePreset(id);
    expect(useStore.getState().presets).toHaveLength(1);
  });

  it('renamePreset으로 그룹 이름을 변경할 수 있다', () => {
    const id = useStore.getState().presets[0].id;
    useStore.getState().renamePreset(id, '새이름');
    expect(useStore.getState().presets[0].name).toBe('새이름');
  });
});

describe('Store — resetAll', () => {
  it('앱 키만 삭제하고 다른 localStorage 데이터는 보존한다', () => {
    // 앱 외부 데이터 설정
    storage['other-app-key'] = 'should-survive';
    storage['orbit-presets'] = '[]';
    storage['orbit-active-preset'] = 'default';
    storage['orbit-settings'] = '{}';

    useStore.getState().resetAll();

    // 앱 키 3개만 삭제되었는지 확인
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('orbit-presets');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('orbit-active-preset');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('orbit-settings');
    // 다른 데이터 보존
    expect(storage['other-app-key']).toBe('should-survive');
    // clear는 호출되지 않음
    expect(localStorageMock.clear).not.toHaveBeenCalled();
  });

  it('resetAll 후 reload를 호출한다', () => {
    useStore.getState().resetAll();
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});

describe('Store — 설정', () => {
  it('updateSettings로 설정을 변경할 수 있다', () => {
    useStore.getState().updateSettings({ theme: 'light' });
    expect(useStore.getState().settings.theme).toBe('light');
  });

  it('부분 업데이트만 적용하고 나머지는 유지한다', () => {
    const before = useStore.getState().settings;
    useStore.getState().updateSettings({ opacity: 0.5 });
    const after = useStore.getState().settings;
    expect(after.opacity).toBe(0.5);
    expect(after.theme).toBe(before.theme);
    expect(after.refreshIntervalDomestic).toBe(before.refreshIntervalDomestic);
    expect(after.refreshIntervalOverseas).toBe(before.refreshIntervalOverseas);
  });
});
