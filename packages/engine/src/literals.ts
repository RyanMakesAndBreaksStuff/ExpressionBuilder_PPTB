import type { LiteralNode } from './types';

export function formatLiteral(node: LiteralNode): string {
  if (node.value === null) {
    return 'null';
  }

  if (typeof node.value === 'string') {
    return `'${node.value.replaceAll("'", "''")}'`;
  }

  return String(node.value);
}
