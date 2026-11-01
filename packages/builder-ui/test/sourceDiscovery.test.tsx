// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel, type UserEvent } from '@testing-library/user-event';
import type { FieldDefinition } from '@ryanmakes/eb_engine';
import type {
  PlatformAdapter,
  PlatformSettings,
  RelatedTableRef,
} from '@ryanmakes/eb_platformadapter';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExpressionBuilderShell } from '../src/app/ExpressionBuilderShell';

afterEach(() => {
  cleanup();
});

/**
 * Related-field fetches raise the busy overlay, which covers the controls used to
 * replace the source. Hit-testing would hide the races these tests have to drive.
 */
function setupUser() {
  return userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });
}

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

function defer<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function settle<T>(pending: Deferred<T>, value: T) {
  await act(async () => {
    pending.resolve(value);
  });
}

async function fail(pending: Deferred<unknown>, error: Error) {
  await act(async () => {
    pending.reject(error);
  });
}

const accountField: FieldDefinition = {
  id: 'name',
  label: 'Name',
  type: 'string',
  path: ['name'],
};
const contactField: FieldDefinition = {
  id: 'email',
  label: 'Email',
  type: 'string',
  path: ['email'],
};

function section(displayName: string, navigationProperty: string): RelatedTableRef {
  return {
    navigationProperty,
    table: 'systemuser',
    displayName,
    relationshipType: 'ManyToOne',
  };
}

const staleField: FieldDefinition = {
  id: 'stale-related',
  label: 'Stale Related',
  type: 'string',
  path: ['stale-related'],
};

function createSettings(seed: Record<string, string> = {}): PlatformSettings {
  const store = new Map(Object.entries(seed));
  return {
    get: vi.fn(async (key: string) => {
      if (store.has(key)) return store.get(key) ?? null;
      return key === 'eb.onboarding.seen.v1' ? '1' : null;
    }),
    set: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    remove: vi.fn(async (key: string) => {
      store.delete(key);
    }),
  };
}

const billingSettings = {
  'eb.profiles.index.v1': JSON.stringify(['Billing']),
  'eb.profile.v1.Billing': JSON.stringify([
    { id: 'invoice', label: 'Invoice', type: 'string', path: ['invoice'] },
  ]),
};

type RelatedCall = { table: string; pending: Deferred<RelatedTableRef[]> };
type FieldCall = {
  table: string;
  navigationProperty: string;
  pending: Deferred<{ fields: FieldDefinition[] }>;
};

function createAdapter(options?: {
  settings?: PlatformSettings;
  relatedTables?: boolean;
}): {
  adapter: PlatformAdapter;
  related: RelatedCall[];
  relatedFields: FieldCall[];
} {
  const related: RelatedCall[] = [];
  const relatedFields: FieldCall[] = [];
  const adapter: PlatformAdapter = {
    copyToClipboard: vi.fn(async () => undefined),
    notify: vi.fn(async () => undefined),
    getTheme: vi.fn(async () => 'light' as const),
    onThemeChanged: vi.fn(() => () => undefined),
    settings: options?.settings ?? createSettings(),
    getDataverseFields: vi.fn(async () => []),
    getTables: vi.fn(async () => [
      { logicalName: 'account', displayName: 'Account' },
      { logicalName: 'contact', displayName: 'Contact' },
    ]),
    discoverFields: vi.fn(async (discoverOptions) => ({
      fields: discoverOptions?.table === 'contact' ? [contactField] : [accountField],
    })),
    discoverRelatedFields: vi.fn((table: string, navigationProperty: string) => {
      const pending = defer<{ fields: FieldDefinition[] }>();
      relatedFields.push({ table, navigationProperty, pending });
      return pending.promise;
    }),
  };
  if (options?.relatedTables !== false) {
    adapter.getRelatedTables = vi.fn((table: string) => {
      const pending = defer<RelatedTableRef[]>();
      related.push({ table, pending });
      return pending.promise;
    });
  }
  return { adapter, related, relatedFields };
}

function fieldButton(label: string, type: string) {
  return screen.queryByRole('button', {
    name: `Add a rule for ${label}, ${type}`,
    hidden: true,
  });
}

function sectionButton(displayName: string) {
  return screen.queryByRole('button', {
    // Header name is "<displayName><navigationProperty>" with no separator.
    name: new RegExp(`^${displayName}`),
    hidden: true,
  });
}

function expressionText() {
  return within(screen.getByLabelText('Trigger / Filter', { hidden: true })).getByLabelText(
    'Generated expression',
    { hidden: true },
  ).textContent;
}

async function connectTable(user: UserEvent, displayName: 'Account' | 'Contact') {
  const label = displayName === 'Account' ? 'Name' : 'Email';
  const starter = screen.queryByRole('button', { name: 'Connect a table' });
  if (starter) {
    await user.click(starter);
  } else {
    await user.click(screen.getByRole('button', { name: 'Data source menu', hidden: true }));
    await user.click(await screen.findByRole('menuitem', { name: 'Switch table…', hidden: true }));
  }
  const dialog = await screen.findByRole('dialog', { hidden: true });
  await user.click(
    await within(dialog).findByRole('option', { name: new RegExp(displayName), hidden: true }),
  );
  await user.click(within(dialog).getByRole('button', { name: 'Connect', hidden: true }));
  await screen.findByRole('button', {
    name: `Add a rule for ${label}, string`,
    hidden: true,
  });
}

async function loadSamples(user: UserEvent) {
  await user.click(screen.getByRole('button', { name: 'Data source menu', hidden: true }));
  await user.click(await screen.findByRole('menuitem', { name: 'Load sample fields', hidden: true }));
  await screen.findByRole('button', { name: 'Add a rule for Status, choice', hidden: true });
}

async function importFieldSchema(user: UserEvent) {
  await user.click(screen.getByRole('button', { name: 'Data source menu', hidden: true }));
  await user.click(await screen.findByRole('menuitem', { name: 'Import schema…', hidden: true }));
  const dialog = await screen.findByRole('dialog', { hidden: true });
  const input = within(dialog).getByLabelText('Field JSON input');
  await user.click(input);
  await user.paste(
    JSON.stringify([{ id: 'imported', label: 'Imported Field', type: 'string', path: ['imported'] }]),
  );
  await user.click(within(dialog).getByRole('button', { name: 'Import', hidden: true }));
  await screen.findByRole('button', { name: 'Add a rule for Imported Field, string', hidden: true });
}

async function loadBillingProfile(user: UserEvent) {
  await user.click(screen.getByRole('button', { name: 'Data source menu', hidden: true }));
  await user.click(await screen.findByRole('menuitem', { name: 'Manage profiles…', hidden: true }));
  const dialog = await screen.findByRole('dialog', { hidden: true });
  await user.click(await within(dialog).findByRole('button', { name: 'Load', hidden: true }));
  await screen.findByRole('button', { name: 'Add a rule for Invoice, string', hidden: true });
}

const savedDocument = JSON.stringify({
  version: 2,
  mode: 'triggerCondition',
  fields: [{ id: 'saved', label: 'Saved Field', type: 'string', path: ['saved'] }],
  root: { id: 'root', kind: 'group', conjunction: 'and', children: [] },
  source: { kind: 'import', label: 'Saved snapshot' },
});

async function importSavedDocument(user: UserEvent) {
  await user.click(screen.getByRole('button', { name: 'More actions', hidden: true }));
  await user.click(await screen.findByRole('menuitem', { name: 'Import', hidden: true }));
  const dialog = await screen.findByRole('dialog', { hidden: true });
  const input = within(dialog).getByLabelText('Saved expression JSON to import');
  await user.click(input);
  await user.paste(savedDocument);
  await user.click(within(dialog).getByRole('button', { name: 'Import', hidden: true }));
  await screen.findByRole('button', { name: 'Add a rule for Saved Field, string', hidden: true });
}

async function refreshFields(user: UserEvent, related: RelatedCall[]) {
  const before = related.length;
  await user.click(screen.getByRole('button', { name: 'Refresh fields', hidden: true }));
  await waitFor(() => expect(related.length).toBe(before + 1));
}

type Replacement = {
  name: string;
  sourceLabel: string;
  fieldLabel: string;
  fieldType: string;
  absentField?: string;
  followsUp: boolean;
  settings?: Record<string, string>;
  run: (user: UserEvent, related: RelatedCall[]) => Promise<void>;
};

const replacements: Replacement[] = [
  {
    name: 'switching to another table',
    sourceLabel: 'Contact',
    fieldLabel: 'Email',
    fieldType: 'string',
    absentField: 'Name',
    followsUp: true,
    run: (user) => connectTable(user, 'Contact'),
  },
  {
    name: 'loading sample fields',
    sourceLabel: 'Sample fields',
    fieldLabel: 'Status',
    fieldType: 'choice',
    absentField: 'Name',
    followsUp: false,
    run: loadSamples,
  },
  {
    name: 'importing a schema',
    sourceLabel: 'Imported JSON',
    fieldLabel: 'Imported Field',
    fieldType: 'string',
    absentField: 'Name',
    followsUp: false,
    run: importFieldSchema,
  },
  {
    name: 'loading a profile',
    sourceLabel: 'Billing',
    fieldLabel: 'Invoice',
    fieldType: 'string',
    absentField: 'Name',
    followsUp: false,
    settings: billingSettings,
    run: loadBillingProfile,
  },
  {
    name: 'importing a saved document',
    sourceLabel: 'Saved snapshot',
    fieldLabel: 'Saved Field',
    fieldType: 'string',
    absentField: 'Name',
    followsUp: false,
    run: importSavedDocument,
  },
  {
    name: 'refreshing the same table',
    sourceLabel: 'Account',
    fieldLabel: 'Name',
    fieldType: 'string',
    followsUp: true,
    run: refreshFields,
  },
];

async function finishFollowUp(related: RelatedCall[], followsUp: boolean) {
  if (!followsUp) return;
  await waitFor(() => expect(related).toHaveLength(2));
  await settle(related[1].pending, [section('CurrentRel', 'current_rel')]);
  expect(sectionButton('CurrentRel')).toBeInTheDocument();
}

describe('source discovery completions', () => {
  it.each(replacements)(
    'drops a deferred related-table response from account after $name',
    async (replacement) => {
      const harness = createAdapter({
        settings: createSettings(replacement.settings),
      });
      render(<ExpressionBuilderShell adapter={harness.adapter} />);
      const user = setupUser();
      await connectTable(user, 'Account');
      expect(harness.related.map((call) => call.table)).toEqual(['account']);

      await replacement.run(user, harness.related);
      await finishFollowUp(harness.related, replacement.followsUp);
      await settle(harness.related[0].pending, [section('StaleOwner', 'stale_owner')]);

      expect(sectionButton('StaleOwner')).not.toBeInTheDocument();
      if (replacement.followsUp) expect(sectionButton('CurrentRel')).toBeInTheDocument();
      expect(fieldButton(replacement.fieldLabel, replacement.fieldType)).toBeInTheDocument();
      if (replacement.absentField) {
        expect(fieldButton(replacement.absentField, 'string')).not.toBeInTheDocument();
      }
      expect(screen.getAllByText(replacement.sourceLabel).length).toBeGreaterThan(0);
    },
  );

  it.each(replacements)(
    'drops deferred related fields from account after $name',
    async (replacement) => {
      const harness = createAdapter({
        settings: createSettings(replacement.settings),
      });
      render(<ExpressionBuilderShell adapter={harness.adapter} />);
      const user = setupUser();
      await connectTable(user, 'Account');
      await settle(harness.related[0].pending, [section('ShownOwner', 'shown_owner')]);
      expect(sectionButton('ShownOwner')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /ShownOwner/, hidden: true }));
      expect(harness.relatedFields).toHaveLength(1);

      await replacement.run(user, harness.related);

      expect(sectionButton('ShownOwner')).not.toBeInTheDocument();
      await finishFollowUp(harness.related, replacement.followsUp);
      await settle(harness.relatedFields[0].pending, { fields: [staleField] });

      expect(fieldButton('Stale Related', 'string')).not.toBeInTheDocument();
      expect(fieldButton(replacement.fieldLabel, replacement.fieldType)).toBeInTheDocument();
      if (replacement.followsUp) expect(sectionButton('CurrentRel')).toBeInTheDocument();
      expect(screen.getAllByText(replacement.sourceLabel).length).toBeGreaterThan(0);
    },
  );

  it('drops a deferred related-table response after the adapter is replaced', async () => {
    const first = createAdapter();
    const view = render(<ExpressionBuilderShell adapter={first.adapter} />);
    const user = setupUser();
    await connectTable(user, 'Account');
    const next = createAdapter();
    view.rerender(<ExpressionBuilderShell adapter={next.adapter} />);

    await settle(first.related[0].pending, [section('StaleOwner', 'stale_owner')]);

    expect(sectionButton('StaleOwner')).not.toBeInTheDocument();
    expect(fieldButton('Name', 'string')).toBeInTheDocument();
    expect(screen.getAllByText('Account').length).toBeGreaterThan(0);
    expect(next.related).toHaveLength(0);
  });

  it('drops deferred related fields after the adapter is replaced without clearing current sections', async () => {
    const first = createAdapter();
    const view = render(<ExpressionBuilderShell adapter={first.adapter} />);
    const user = setupUser();
    await connectTable(user, 'Account');
    await settle(first.related[0].pending, [section('ShownOwner', 'shown_owner')]);
    await user.click(screen.getByRole('button', { name: /ShownOwner/, hidden: true }));
    const next = createAdapter();
    view.rerender(<ExpressionBuilderShell adapter={next.adapter} />);

    expect(sectionButton('ShownOwner')).toBeInTheDocument();
    await settle(first.relatedFields[0].pending, { fields: [staleField] });

    expect(fieldButton('Stale Related', 'string')).not.toBeInTheDocument();
    expect(sectionButton('ShownOwner')).toBeInTheDocument();
    expect(fieldButton('Name', 'string')).toBeInTheDocument();
  });

  it('clears sections when a refresh uses an adapter with no related-table method', async () => {
    const first = createAdapter();
    const view = render(<ExpressionBuilderShell adapter={first.adapter} />);
    const user = setupUser();
    await connectTable(user, 'Account');
    await settle(first.related[0].pending, [section('ShownOwner', 'shown_owner')]);
    expect(sectionButton('ShownOwner')).toBeInTheDocument();

    const next = createAdapter({ relatedTables: false });
    view.rerender(<ExpressionBuilderShell adapter={next.adapter} />);
    expect(sectionButton('ShownOwner')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Refresh fields', hidden: true }));
    await waitFor(() => expect(sectionButton('ShownOwner')).not.toBeInTheDocument());

    expect(sectionButton('ShownOwner')).not.toBeInTheDocument();
    expect(fieldButton('Name', 'string')).toBeInTheDocument();
    expect(next.adapter.getRelatedTables).toBeUndefined();
  });

  it('clears sections when a table switch uses an adapter with no related-table method', async () => {
    const first = createAdapter();
    const view = render(<ExpressionBuilderShell adapter={first.adapter} />);
    const user = setupUser();
    await connectTable(user, 'Account');
    await settle(first.related[0].pending, [section('ShownOwner', 'shown_owner')]);
    const next = createAdapter({ relatedTables: false });
    view.rerender(<ExpressionBuilderShell adapter={next.adapter} />);

    await connectTable(user, 'Contact');

    expect(sectionButton('ShownOwner')).not.toBeInTheDocument();
    expect(fieldButton('Email', 'string')).toBeInTheDocument();
    expect(fieldButton('Name', 'string')).not.toBeInTheDocument();
  });

  it('notifies when the current related-table request fails', async () => {
    const harness = createAdapter();
    render(<ExpressionBuilderShell adapter={harness.adapter} />);
    const user = setupUser();
    await connectTable(user, 'Account');

    await fail(harness.related[0].pending, new Error('network down'));

    expect(harness.adapter.notify).toHaveBeenCalledExactlyOnceWith(
      'Could not load related tables: network down',
      'warning',
    );
    expect(fieldButton('Name', 'string')).toBeInTheDocument();
    expect(sectionButton('StaleOwner')).not.toBeInTheDocument();
  });

  it('does not notify when a superseded related-table request fails', async () => {
    const harness = createAdapter();
    render(<ExpressionBuilderShell adapter={harness.adapter} />);
    const user = setupUser();
    await connectTable(user, 'Account');
    await connectTable(user, 'Contact');

    await fail(harness.related[0].pending, new Error('network down'));

    expect(harness.adapter.notify).not.toHaveBeenCalled();
    expect(fieldButton('Email', 'string')).toBeInTheDocument();
    expect(sectionButton('StaleOwner')).not.toBeInTheDocument();
  });

  it('notifies when the current related-field request fails', async () => {
    const harness = createAdapter();
    render(<ExpressionBuilderShell adapter={harness.adapter} />);
    const user = setupUser();
    await connectTable(user, 'Account');
    await settle(harness.related[0].pending, [section('ShownOwner', 'shown_owner')]);
    await user.click(screen.getByRole('button', { name: /ShownOwner/, hidden: true }));

    await fail(harness.relatedFields[0].pending, new Error('lookup failed'));

    expect(harness.adapter.notify).toHaveBeenCalledExactlyOnceWith(
      'Could not expand related fields: lookup failed',
      'warning',
    );
    expect(fieldButton('Stale Related', 'string')).not.toBeInTheDocument();
    expect(fieldButton('Name', 'string')).toBeInTheDocument();
    expect(sectionButton('ShownOwner')).toBeInTheDocument();
  });

  it('does not notify when a superseded related-field request fails', async () => {
    const harness = createAdapter();
    render(<ExpressionBuilderShell adapter={harness.adapter} />);
    const user = setupUser();
    await connectTable(user, 'Account');
    await settle(harness.related[0].pending, [section('ShownOwner', 'shown_owner')]);
    await user.click(screen.getByRole('button', { name: /ShownOwner/, hidden: true }));
    await loadSamples(user);

    await fail(harness.relatedFields[0].pending, new Error('lookup failed'));

    expect(harness.adapter.notify).not.toHaveBeenCalled();
    expect(fieldButton('Stale Related', 'string')).not.toBeInTheDocument();
    expect(fieldButton('Status', 'choice')).toBeInTheDocument();
  });

  it('does not notify either adapter when a replaced adapter related-table request fails', async () => {
    const first = createAdapter();
    const view = render(<ExpressionBuilderShell adapter={first.adapter} />);
    const user = setupUser();
    await connectTable(user, 'Account');
    const next = createAdapter();
    view.rerender(<ExpressionBuilderShell adapter={next.adapter} />);

    await fail(first.related[0].pending, new Error('network down'));

    expect(first.adapter.notify).not.toHaveBeenCalled();
    expect(next.adapter.notify).not.toHaveBeenCalled();
    expect(fieldButton('Name', 'string')).toBeInTheDocument();
  });

  it('keeps the current document when a proposed source switch is canceled', async () => {
    const harness = createAdapter();
    render(<ExpressionBuilderShell adapter={harness.adapter} />);
    const user = setupUser();
    await connectTable(user, 'Account');
    await user.click(screen.getByRole('button', { name: 'Add a rule for Name, string', hidden: true }));
    await screen.findByRole('group', { name: /Name equals/, hidden: true });
    const expressionBefore = expressionText();

    await user.click(screen.getByRole('button', { name: 'Data source menu', hidden: true }));
    await user.click(await screen.findByRole('menuitem', { name: 'Switch table…', hidden: true }));
    const picker = await screen.findByRole('dialog', { hidden: true });
    await user.click(await within(picker).findByRole('option', { name: /Contact/, hidden: true }));
    await user.click(within(picker).getByRole('button', { name: 'Connect', hidden: true }));
    const heading = await screen.findByRole('heading', {
      name: 'Switch source to Contact',
      hidden: true,
    });
    const decision = heading.closest('[role="dialog"]');
    if (!(decision instanceof HTMLElement)) throw new Error('Switch dialog was not found.');

    await settle(harness.related[0].pending, [section('ShownOwner', 'shown_owner')]);
    expect(sectionButton('ShownOwner')).toBeInTheDocument();

    await user.click(within(decision).getByRole('button', { name: 'Cancel', hidden: true }));

    expect(screen.queryByRole('heading', { name: 'Switch source to Contact', hidden: true })).not.toBeInTheDocument();
    expect(expressionText()).toBe(expressionBefore);
    expect(screen.getByRole('group', { name: /Name equals/, hidden: true })).toBeInTheDocument();
    expect(sectionButton('ShownOwner')).toBeInTheDocument();
    expect(fieldButton('Name', 'string')).toBeInTheDocument();
    expect(fieldButton('Email', 'string')).not.toBeInTheDocument();
    expect(screen.getAllByText('Account').length).toBeGreaterThan(0);
    expect(harness.related.map((call) => call.table)).toEqual(['account']);
  });

  it('still applies an earlier related-field request after a successful insertion', async () => {
    const harness = createAdapter();
    render(<ExpressionBuilderShell adapter={harness.adapter} />);
    const user = setupUser();
    await connectTable(user, 'Account');
    await settle(harness.related[0].pending, [
      section('OwnerSection', 'ownerid'),
      section('ParentSection', 'parentid'),
    ]);
    await user.click(screen.getByRole('button', { name: /OwnerSection/, hidden: true }));
    await user.click(screen.getByRole('button', { name: /ParentSection/, hidden: true }));
    expect(harness.relatedFields.map((call) => call.navigationProperty)).toEqual([
      'ownerid',
      'parentid',
    ]);

    await settle(harness.relatedFields[1].pending, {
      fields: [{ id: 'parent-name', label: 'Parent Name', type: 'string', path: ['parent-name'] }],
    });
    expect(fieldButton('Parent Name', 'string')).toBeInTheDocument();

    await settle(harness.relatedFields[0].pending, {
      fields: [{ id: 'owner-name', label: 'Owner Name', type: 'string', path: ['owner-name'] }],
    });

    expect(fieldButton('Owner Name', 'string')).toBeInTheDocument();
    expect(fieldButton('Parent Name', 'string')).toBeInTheDocument();
    expect(fieldButton('Name', 'string')).toBeInTheDocument();
    expect(sectionButton('OwnerSection')).toBeInTheDocument();
    expect(sectionButton('ParentSection')).toBeInTheDocument();
  });
});

describe('related section load status', () => {
  async function openOwner(harness: ReturnType<typeof createAdapter>, user: UserEvent, index: number) {
    await settle(harness.related[index].pending, [section('Owner', 'ownerid')]);
    await user.click(screen.getByRole('button', { name: /Owner/, hidden: true }));
  }

  it('discovers the same navigation name again after switching tables', async () => {
    const harness = createAdapter();
    render(<ExpressionBuilderShell adapter={harness.adapter} />);
    const user = setupUser();
    await connectTable(user, 'Account');
    await openOwner(harness, user, 0);
    await settle(harness.relatedFields[0].pending, { fields: [] });

    await connectTable(user, 'Contact');
    await openOwner(harness, user, 1);

    expect(harness.relatedFields.map((call) => call.table)).toEqual(['account', 'contact']);
  });

  it('dedupes pending work, then offers retry after failure', async () => {
    const harness = createAdapter();
    render(<ExpressionBuilderShell adapter={harness.adapter} />);
    const user = setupUser();
    await connectTable(user, 'Account');
    await openOwner(harness, user, 0);
    await user.click(screen.getByRole('button', { name: /Owner/, hidden: true }));
    await user.click(screen.getByRole('button', { name: /Owner/, hidden: true }));
    expect(harness.relatedFields).toHaveLength(1);

    await fail(harness.relatedFields[0].pending, new Error('lookup failed'));
    await user.click(screen.getByRole('button', { name: 'Retry loading Owner fields', hidden: true }));
    expect(harness.relatedFields).toHaveLength(2);
    await settle(harness.relatedFields[1].pending, {
      fields: [{ id: 'owner-name', label: 'Owner Name', type: 'string', path: ['owner-name'], group: 'Owner' }],
    });

    expect(fieldButton('Owner Name', 'string')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Retry/, hidden: true })).not.toBeInTheDocument();
  });

  it('shows an empty state for a successful empty response', async () => {
    const harness = createAdapter();
    render(<ExpressionBuilderShell adapter={harness.adapter} />);
    const user = setupUser();
    await connectTable(user, 'Account');
    await openOwner(harness, user, 0);
    await settle(harness.relatedFields[0].pending, { fields: [] });

    expect(screen.getByText('No fields.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Retry/, hidden: true })).not.toBeInTheDocument();
  });

  it('ignores a late failure after the source is refreshed', async () => {
    const harness = createAdapter();
    render(<ExpressionBuilderShell adapter={harness.adapter} />);
    const user = setupUser();
    await connectTable(user, 'Account');
    await openOwner(harness, user, 0);
    await refreshFields(user, harness.related);
    await openOwner(harness, user, 1);
    expect(harness.relatedFields).toHaveLength(2);

    await fail(harness.relatedFields[0].pending, new Error('late'));

    expect(screen.queryByRole('button', { name: /Retry/, hidden: true })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Owner/, hidden: true }));
    expect(screen.queryByRole('button', { name: /Retry/, hidden: true })).not.toBeInTheDocument();
    expect(harness.relatedFields).toHaveLength(2);
  });

  it('allows retry after the adapter is replaced mid-request', async () => {
    const first = createAdapter();
    const view = render(<ExpressionBuilderShell adapter={first.adapter} />);
    const user = setupUser();
    await connectTable(user, 'Account');
    await openOwner(first, user, 0);
    const next = createAdapter();
    view.rerender(<ExpressionBuilderShell adapter={next.adapter} />);

    await user.click(screen.getByRole('button', { name: /Owner/, hidden: true }));
    await user.click(screen.getByRole('button', { name: /Owner/, hidden: true }));

    expect(next.relatedFields).toHaveLength(1);
  });
});

describe('primary discovery rejection', () => {
  function overlay() {
    return document.querySelector('.eb-busy-overlay');
  }

  async function pickContact(user: UserEvent) {
    await user.click(screen.getByRole('button', { name: 'Data source menu', hidden: true }));
    await user.click(await screen.findByRole('menuitem', { name: 'Switch table…', hidden: true }));
    const dialog = await screen.findByRole('dialog', { hidden: true });
    await user.click(await within(dialog).findByRole('option', { name: /Contact/, hidden: true }));
    await user.click(within(dialog).getByRole('button', { name: 'Connect', hidden: true }));
  }

  it('notifies once, clears busy, keeps the source, and retries a rejected table switch', async () => {
    const harness = createAdapter();
    render(<ExpressionBuilderShell adapter={harness.adapter} />);
    const user = setupUser();
    await connectTable(user, 'Account');
    const original = harness.adapter.discoverFields;
    harness.adapter.discoverFields = vi.fn(async () => {
      throw new Error('service down');
    });

    await pickContact(user);

    await waitFor(() =>
      expect(harness.adapter.notify).toHaveBeenCalledExactlyOnceWith(
        'Could not load fields: service down',
        'error',
      ),
    );
    expect(overlay()).not.toBeInTheDocument();
    expect(fieldButton('Name', 'string')).toBeInTheDocument();
    expect(fieldButton('Email', 'string')).not.toBeInTheDocument();

    harness.adapter.discoverFields = original;
    await connectTable(user, 'Contact');
    expect(fieldButton('Email', 'string')).toBeInTheDocument();
  });

  it('notifies once and keeps the document when a refresh rejects', async () => {
    const harness = createAdapter();
    render(<ExpressionBuilderShell adapter={harness.adapter} />);
    const user = setupUser();
    await connectTable(user, 'Account');
    harness.adapter.discoverFields = vi.fn(async () => {
      throw new Error('service down');
    });

    await user.click(screen.getByRole('button', { name: 'Refresh fields', hidden: true }));

    await waitFor(() =>
      expect(harness.adapter.notify).toHaveBeenCalledExactlyOnceWith(
        'Could not load fields: service down',
        'error',
      ),
    );
    expect(overlay()).not.toBeInTheDocument();
    expect(fieldButton('Name', 'string')).toBeInTheDocument();
  });

  it('does not notify the new adapter when a superseded discovery rejects', async () => {
    const first = createAdapter();
    const view = render(<ExpressionBuilderShell adapter={first.adapter} />);
    const user = setupUser();
    await connectTable(user, 'Account');
    const pending = defer<{ fields: FieldDefinition[] }>();
    first.adapter.discoverFields = vi.fn(() => pending.promise);
    await user.click(screen.getByRole('button', { name: 'Refresh fields', hidden: true }));
    const next = createAdapter();
    view.rerender(<ExpressionBuilderShell adapter={next.adapter} />);

    await fail(pending as Deferred<unknown>, new Error('late'));

    expect(first.adapter.notify).not.toHaveBeenCalled();
    expect(next.adapter.notify).not.toHaveBeenCalled();
    expect(fieldButton('Name', 'string')).toBeInTheDocument();
  });

  it('does not apply a superseded discovery that succeeds after adapter replacement', async () => {
    const first = createAdapter();
    const view = render(<ExpressionBuilderShell adapter={first.adapter} />);
    const user = setupUser();
    await connectTable(user, 'Account');
    const pending = defer<{ fields: FieldDefinition[] }>();
    first.adapter.discoverFields = vi.fn(() => pending.promise);
    await user.click(screen.getByRole('button', { name: 'Refresh fields', hidden: true }));
    const next = createAdapter();
    view.rerender(<ExpressionBuilderShell adapter={next.adapter} />);

    await settle(pending, {
      fields: [{ id: 'Stale', label: 'Stale', path: 'Stale', type: 'string' } as FieldDefinition],
    });

    expect(screen.queryByRole('button', { name: /Stale/, hidden: true })).not.toBeInTheDocument();
    expect(fieldButton('Name', 'string')).toBeInTheDocument();
  });

  it('keeps the overlay while an older run is still busy after a newer one finishes', async () => {
    const harness = createAdapter();
    render(<ExpressionBuilderShell adapter={harness.adapter} />);
    const user = setupUser();
    await connectTable(user, 'Account');
    await settle(harness.related[0].pending, [
      section('OwnerSection', 'ownerid'),
      section('ParentSection', 'parentid'),
    ]);
    await user.click(screen.getByRole('button', { name: /OwnerSection/, hidden: true }));
    await user.click(screen.getByRole('button', { name: /ParentSection/, hidden: true }));

    await settle(harness.relatedFields[1].pending, { fields: [] });
    expect(overlay()).toBeInTheDocument();

    await settle(harness.relatedFields[0].pending, { fields: [] });
    expect(overlay()).not.toBeInTheDocument();
  });

  it('lets an earlier busy operation finish without clearing a newer overlay', async () => {
    const harness = createAdapter();
    render(<ExpressionBuilderShell adapter={harness.adapter} />);
    const user = setupUser();
    await connectTable(user, 'Account');
    await settle(harness.related[0].pending, [
      section('OwnerSection', 'ownerid'),
      section('ParentSection', 'parentid'),
    ]);
    await user.click(screen.getByRole('button', { name: /OwnerSection/, hidden: true }));
    await user.click(screen.getByRole('button', { name: /ParentSection/, hidden: true }));

    await settle(harness.relatedFields[0].pending, { fields: [] });
    expect(overlay()).toBeInTheDocument();

    await settle(harness.relatedFields[1].pending, { fields: [] });
    expect(overlay()).not.toBeInTheDocument();
  });

  it('does not reload tables when the shell re-renders while the picker is open', async () => {
    const harness = createAdapter();
    render(<ExpressionBuilderShell adapter={harness.adapter} />);
    const user = setupUser();
    await user.click(await screen.findByRole('button', { name: 'Connect a table' }));
    await screen.findByRole('option', { name: /Account/, hidden: true });
    expect(harness.adapter.getTables).toHaveBeenCalledTimes(1);

    const handler = vi.mocked(harness.adapter.onThemeChanged).mock.calls[0][0];
    act(() => handler('dark'));
    await new Promise((r) => setTimeout(r, 0));

    expect(harness.adapter.getTables).toHaveBeenCalledTimes(1);
  });
});
