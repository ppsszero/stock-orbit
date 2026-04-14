// Storage utilities - now handled directly by hooks (useSettings, usePresets)
// This file is kept for backward compatibility but the main logic lives in hooks.

export const STORAGE_KEYS = {
  PRESETS: 'orbit-presets',
  ACTIVE_PRESET: 'orbit-active-preset',
  SETTINGS: 'orbit-settings',
} as const;
