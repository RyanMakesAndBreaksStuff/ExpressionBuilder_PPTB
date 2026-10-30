import type { PayloadTab, PayloadSearchMatch } from './jsonPayloadSession';
import { payloadLabel } from './jsonPayloadSession';
import { collectPayloadLeaves, previewValue } from './payloadTreeModel';

export function searchPayloads(
  payloads: readonly PayloadTab[],
  query: string,
): {
  matches: PayloadSearchMatch[];
  total: number;
  parsedSourceCount: number;
} {
  const needle = query.trim().toLowerCase();
  const matches: PayloadSearchMatch[] = [];
  let total = 0;
  let parsedSourceCount = 0;

  payloads.forEach((payload, index) => {
    const parsed = payload.state.parsed;
    if (parsed === null) return;
    parsedSourceCount += 1;
    if (needle === '') return;

    for (const leaf of collectPayloadLeaves(parsed.value)) {
      const fullValue = typeof leaf.value === 'string'
        ? leaf.value
        : JSON.stringify(leaf.value) ?? '';
      if (!leaf.label.toLowerCase().includes(needle) &&
          !fullValue.toLowerCase().includes(needle)) continue;

      total += 1;
      if (matches.length < 8) {
        matches.push({
          payloadId: payload.id,
          parsed,
          path: leaf.path,
          payloadLabel: payloadLabel(payloads, index),
          pathLabel: leaf.label,
          preview: previewValue(leaf.value),
        });
      }
    }
  });

  return { matches, total, parsedSourceCount };
}
