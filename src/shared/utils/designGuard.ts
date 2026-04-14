const isDev = typeof process !== 'undefined' && process.env.NODE_ENV === 'development';
const STRICT_MODE = true;

const emit = (msg: string) => {
  if (!isDev) return;
  if (STRICT_MODE) throw new Error(msg);
  console.warn(msg);
};

export const designGuard = {
  buttonCombo: (variant: string, size: string) => {
    const forbidden = [
      { variant: 'primary', size: 'sm' },
      { variant: 'danger', size: 'sm' },
    ];
    if (forbidden.some(f => f.variant === variant && f.size === size)) {
      emit(`[DS] Button variant="${variant}" size="${size}" is forbidden.`);
    }
  },

  noPrimaryInCard: (variant: string, context: string) => {
    if (variant === 'primary' && context === 'card') {
      emit(`[DS] Button variant="primary" is forbidden inside Card. Use ghost or IconButton.`);
    }
  },

  segSizeConsistency: (sizes: string[]) => {
    if (new Set(sizes).size > 1) {
      emit(`[DS] SegmentedControl sizes must be consistent. Found: ${sizes.join(', ')}`);
    }
  },

  fontFamilyInherit: (element: string, hasInherit: boolean) => {
    if (!hasInherit && ['button', 'input', 'select'].includes(element)) {
      emit(`[DS] <${element}> must have font-family: inherit.`);
    }
  },

  noAlphaConcat: (value: string) => {
    if (/var\(--[^)]+\)[0-9a-fA-F]{2}$/.test(value)) {
      emit(`[DS] Alpha concatenation: "${value}". Use semantic tint tokens.`);
    }
  },
} as const;
