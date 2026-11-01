import type { LiteralNode } from './types';

export function formatLiteral(node: LiteralNode): string {
  if (node.value === null) {
    return 'null';
  }

  if (typeof node.value === 'string') {
    return `'${node.value.replaceAll("'", "''")}'`;
  }

  if (typeof node.value === 'number' && !Number.isFinite(node.value)) {
    throw new Error('Numeric literals must be finite.');
  }

  return String(node.value);
}
