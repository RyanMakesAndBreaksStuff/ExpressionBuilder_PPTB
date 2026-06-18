import type { FieldType } from '@ryanmakes/eb_engine';

const labels: Record<FieldType, string> = {
  string: 'Aa',
  number: '#',
  boolean: 'B',
  dateTime: 'D',
  choice: 'C',
};

export interface TypeGlyphProps {
  type: FieldType;
}

export function TypeGlyph({ type }: TypeGlyphProps) {
  return (
    <span className={`eb-type ${type}`} aria-hidden="true">
      {labels[type]}
    </span>
  );
}
