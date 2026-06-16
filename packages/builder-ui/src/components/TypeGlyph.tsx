import type { FieldType } from '@ryanmakes/eb_engine';

const labels: Record<FieldType, string> = {
  string: 'Ab',
  number: '12',
  boolean: 'T',
  dateTime: 'Dt',
  choice: 'Ch',
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
