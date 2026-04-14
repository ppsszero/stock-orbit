export type LogLevel = 'info' | 'warn' | 'error' | 'api';

export interface LogEntry {
  id: number;
  timestamp: Date;
  level: LogLevel;
  message: string;
  detail?: string;
}

const MAX_LOGS = 500;
let _id = 0;
let _logs: LogEntry[] = [];
let _listeners: Array<() => void> = [];
let _autoClean = true;

const notify = () => _listeners.forEach(fn => fn());

export const logger = {
  log(level: LogLevel, message: string, detail?: string) {
    _logs = [{ id: ++_id, timestamp: new Date(), level, message, detail }, ..._logs];
    if (_autoClean && _logs.length > MAX_LOGS) _logs = _logs.slice(0, MAX_LOGS);
    notify();
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    fn(`[${level.toUpperCase()}] ${message}`, detail || '');
  },
  info: (msg: string, detail?: string) => logger.log('info', msg, detail),
  warn: (msg: string, detail?: string) => logger.log('warn', msg, detail),
  error: (msg: string, detail?: string) => logger.log('error', msg, detail),
  api: (msg: string, detail?: string) => logger.log('api', msg, detail),
  getLogs: () => _logs,
  clear: () => { _logs = []; notify(); },
  setAutoClean: (v: boolean) => { _autoClean = v; },
  getAutoClean: () => _autoClean,
  subscribe: (fn: () => void) => {
    _listeners.push(fn);
    return () => { _listeners = _listeners.filter(l => l !== fn); };
  },
};

if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    logger.error('Uncaught Error', `${e.message} at ${e.filename}:${e.lineno}`);
  });
  window.addEventListener('unhandledrejection', (e) => {
    logger.error('Unhandled Promise', String(e.reason));
  });
}
