import { useMemo, useState } from 'react';
import type { FieldDefinition } from '@ryanmakes/eb_engine';
import { TypeGlyph } from './TypeGlyph';

interface FieldSourcePaneProps {
  fields: FieldDefinition[];
  onConnect: () => void;
}

export function FieldSourcePane({ fields, onConnect }: FieldSourcePaneProps) {
  const [search, setSearch] = useState('');
  const filteredFields = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return needle.length === 0
      ? fields
      : fields.filter((field) => field.label.toLowerCase().includes(needle));
  }, [fields, search]);

  return (
    <aside className="eb-pane eb-fields" aria-label="Fields pane">
      <div className="eb-pane-header">
        <div>
          <h2>Fields</h2>
          <div className="eb-muted">No Dataverse connection</div>
        </div>
        <button type="button" className="eb-btn subtle" onClick={onConnect}>
          Connect
        </button>
      </div>

      <label className="eb-label" htmlFor="field-search">
        Search fields
      </label>
      <input
        id="field-search"
        className="eb-input"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search fields"
      />

      <ul className="eb-field-list" aria-label="Fields" role="list">
        {filteredFields.map((field) => (
          <li key={field.id}>
            <div className="eb-field-row">
              <TypeGlyph type={field.type} />
              <span className="eb-field-main">
                <span className="eb-field-title">{field.label}</span>
                <span className="eb-field-detail">{field.type}</span>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
