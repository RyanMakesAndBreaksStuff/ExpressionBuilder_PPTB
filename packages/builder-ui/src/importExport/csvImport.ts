import type { FieldDefinition, FieldType } from '@ryanmakes/eb_engine';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;

/** Minimal RFC-4180-ish single line splitter (handles quoted commas). */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function inferCell(value: string | undefined): FieldType {
  if (value === undefined || value === '') return 'string';
  if (value === 'true' || value === 'false') return 'boolean';
  if (!Number.isNaN(Number(value))) return 'number';
  if (ISO_DATE.test(value)) return 'dateTime';
  return 'string';
}

function slug(label: string): string {
  return label.replace(/[^A-Za-z0-9]/g, '_') || 'field';
}

/** Parse CSV header (+ optional first data row for type inference) into fields. */
export function importCsv(source: string): FieldDefinition[] | { error: string } {
  const lines = source.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { error: 'CSV is empty.' };

  const headers = splitCsvLine(lines[0]);
  const sample = lines.length > 1 ? splitCsvLine(lines[1]) : [];
  const seen = new Set<string>();

  return headers.map((header, index) => {
    let id = slug(header);
    while (seen.has(id)) id = `${id}_${index}`;
    seen.add(id);
    return {
      id,
      label: header || `Column ${index + 1}`,
      type: inferCell(sample[index]),
      path: [id],
      source: 'csv',
    };
  });
}
