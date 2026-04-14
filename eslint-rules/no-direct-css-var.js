module.exports = {
  meta: {
    type: 'problem',
    messages: { found: 'Direct CSS var "{{value}}". Use sem.* tokens.' },
  },
  create(context) {
    const EXEMPT = ['vars.ts', 'semantic.ts', 'global.ts', 'sharedStyles.ts', 'componentTokens.ts', 'groupTab.ts'];

    return {
      TemplateLiteral(node) {
        if (EXEMPT.some(f => (context.filename || '').endsWith(f))) return;
        node.quasis.forEach(q => {
          const m = q.value.raw.match(/var\(--c-[^)]+\)/);
          if (m) context.report({ node: q, messageId: 'found', data: { value: m[0] } });
        });
      },
    };
  },
};
