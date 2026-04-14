module.exports = {
  meta: {
    type: 'problem',
    messages: { found: 'Direct sem.* usage in UI component. Use componentTokens instead.' },
  },
  create(context) {
    const filename = context.filename || '';
    const isUI = /shared[\\/]ui[\\/]/.test(filename);
    if (!isUI) return {};

    return {
      MemberExpression(node) {
        if (
          node.object.type === 'Identifier' &&
          node.object.name === 'sem'
        ) {
          context.report({ node, messageId: 'found' });
        }
      },
    };
  },
};
