module.exports = {
  meta: {
    type: 'problem',
    messages: { found: 'Hardcoded color "{{value}}". Use sem.* tokens.' },
  },
  create(context) {
    const HEX_PATTERN = /#[0-9a-fA-F]{3,8}\b/;
    const EXEMPT = ['theme.ts', 'semantic.ts', 'global.ts', 'vars.ts', 'tokens.ts', 'componentTokens.ts'];
    const exempt = () => EXEMPT.some(f => (context.filename || '').endsWith(f));

    return {
      TemplateLiteral(node) {
        if (exempt()) return;
        node.quasis.forEach(q => {
          const raw = q.value.raw;
          // hex 색상 탐지 (shadow/text-shadow 내부의 rgba는 허용)
          const m = raw.match(HEX_PATTERN);
          if (m) context.report({ node: q, messageId: 'found', data: { value: m[0] } });
        });
      },
    };
  },
};
