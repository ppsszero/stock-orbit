module.exports = {
  meta: {
    type: 'problem',
    messages: { found: 'Hardcoded spacing "{{value}}". Use spacing.* tokens.' },
  },
  create(context) {
    // padding/margin/gap만 검사. width/height/top/left 등 컴포넌트 고유 크기는 제외.
    const PATTERN = /(?:padding|margin|gap)\s*:\s*(\d+)px/g;
    // 0: 리셋, 1: 라인/보더, 2: spacing.xs
    const ALLOWED = [0, 1, 2];
    const EXEMPT = ['tokens.ts', 'global.ts'];

    return {
      TemplateLiteral(node) {
        if (EXEMPT.some(f => (context.filename || '').endsWith(f))) return;
        node.quasis.forEach(q => {
          PATTERN.lastIndex = 0;
          let m;
          while ((m = PATTERN.exec(q.value.raw)) !== null) {
            if (!ALLOWED.includes(parseInt(m[1]))) {
              context.report({ node: q, messageId: 'found', data: { value: m[0] } });
            }
          }
        });
      },
    };
  },
};
