module.exports = {
  meta: {
    type: 'problem',
    messages: { found: 'Alpha concatenation detected. Use sem.action.*Tint tokens.' },
  },
  create(context) {
    return {
      BinaryExpression(node) {
        if (node.operator !== '+') return;
        if (
          node.right.type === 'Literal' &&
          typeof node.right.value === 'string' &&
          /^[0-9a-fA-F]{2}$/.test(node.right.value)
        ) {
          context.report({ node, messageId: 'found' });
        }
      },
    };
  },
};
