import { describe, expect, it } from 'vitest';
import {
  createJsonPayloadSession,
  getParsedSources,
  jsonPayloadSessionReducer,
  payloadLabel,
  type JsonPayloadAction,
  type JsonPayloadSession,
} from '../src/workbench/jsonPayloadSession';
import { searchPayloads } from '../src/workbench/payloadSearchModel';

describe('payload session', () => {
  it('caps capacity and never reuses a closed payload identity', () => {
    let session = createJsonPayloadSession();
    for (let index = 0; index < 4; index += 1) {
      session = jsonPayloadSessionReducer(session, { type: 'add' });
    }

    expect(session.payloads).toHaveLength(5);
    expect(jsonPayloadSessionReducer(session, { type: 'add' }))
      .toBe(session);

    const removed = session.activeId;
    session = jsonPayloadSessionReducer(session, {
      type: 'close',
      payloadId: removed,
    });
    session = jsonPayloadSessionReducer(session, { type: 'add' });

    expect(session.activeId).not.toBe(removed);
    expect(session.payloads).toHaveLength(5);
  });

  it('rejects delayed work for an inactive or removed payload', () => {
    let session = createJsonPayloadSession();
    const first = session.activeId;
    session = jsonPayloadSessionReducer(session, {
      type: 'edit',
      payloadId: first,
      action: { type: 'setText', value: '{"a":1}' },
    });
    session = jsonPayloadSessionReducer(session, { type: 'add' });

    const delayed = {
      type: 'edit',
      payloadId: first,
      action: {
        type: 'autoParse',
        expectedText: '{"a":1}',
      },
    } as const;

    expect(jsonPayloadSessionReducer(session, delayed)).toBe(session);

    session = jsonPayloadSessionReducer(session, {
      type: 'close',
      payloadId: first,
    });
    expect(jsonPayloadSessionReducer(session, delayed)).toBe(session);
  });

  it('searches complete values and rejects an obsolete reveal', () => {
    let session = createJsonPayloadSession();
    const id = session.activeId;
    session = jsonPayloadSessionReducer(session, {
      type: 'edit',
      payloadId: id,
      action: {
        type: 'pasteAndParse',
        defaultActionName: 'Action',
        text: JSON.stringify({
          rows: Array.from({ length: 25 }, (_, index) => ({
            Email: 'x'.repeat(140) + (index === 24 ? 'NEEDLE' : ''),
          })),
        }),
      },
    });

    const result = searchPayloads(session.payloads, 'needle');
    expect(result.total).toBe(1);
    expect(result.matches[0].path).toEqual(['rows', 24, 'Email']);

    const match = result.matches[0];
    session = jsonPayloadSessionReducer(session, {
      type: 'edit',
      payloadId: id,
      action: {
        type: 'pasteAndParse',
        defaultActionName: 'Action',
        text: '{"replacement":true}',
      },
    });

    expect(jsonPayloadSessionReducer(session, {
      type: 'reveal',
      match,
    })).toBe(session);
  });

  function reduce(
    session: JsonPayloadSession,
    ...actions: JsonPayloadAction[]
  ): JsonPayloadSession {
    return actions.reduce(jsonPayloadSessionReducer, session);
  }

  function withPayloads(count: number): JsonPayloadSession {
    let session = createJsonPayloadSession();
    for (let index = 1; index < count; index += 1) {
      session = reduce(session, { type: 'add' });
    }
    return session;
  }

  function paste(payloadId: string, text: string): JsonPayloadAction {
    return {
      type: 'edit',
      payloadId,
      action: { type: 'pasteAndParse', defaultActionName: 'Action', text },
    };
  }

  it('closing the active payload activates the neighbour at the same index, else the last', () => {
    let session = withPayloads(4);
    const [a, b, c, d] = session.payloads.map((payload) => payload.id);

    session = reduce(session, { type: 'activate', payloadId: b });
    session = reduce(session, { type: 'close', payloadId: b });
    expect(session.activeId).toBe(c);

    session = reduce(session, { type: 'activate', payloadId: d });
    session = reduce(session, { type: 'close', payloadId: d });
    expect(session.activeId).toBe(c);

    // Closing an inactive payload keeps the active one.
    session = reduce(session, { type: 'close', payloadId: a });
    expect(session.activeId).toBe(c);

    // The last remaining payload cannot be closed.
    session = reduce(session, { type: 'close', payloadId: c });
    const only = session.payloads;
    expect(only).toHaveLength(1);
    expect(reduce(session, { type: 'close', payloadId: only[0].id })).toBe(session);
  });

  it('ignores activation of an unknown payload', () => {
    const session = createJsonPayloadSession();
    expect(reduce(session, { type: 'activate', payloadId: 'missing' })).toBe(session);
  });

  it('disambiguates Trigger labels and falls back to Payload N for blank names', () => {
    let session = withPayloads(4);
    const [a, , c, d] = session.payloads.map((payload) => payload.id);
    session = reduce(
      session,
      { type: 'edit', payloadId: a, action: { type: 'setOutputFrom', value: 'trigger' } },
      { type: 'edit', payloadId: c, action: { type: 'setOutputFrom', value: 'trigger' } },
      { type: 'edit', payloadId: d, action: { type: 'setActionName', value: '  Get rows ' } },
    );

    expect(session.payloads.map((_, index) => payloadLabel(session.payloads, index)))
      .toEqual(['Trigger', 'Payload 2', 'Trigger 2', 'Get rows']);
  });

  it('keeps settings independent per payload', () => {
    let session = withPayloads(2);
    const [a, b] = session.payloads.map((payload) => payload.id);
    session = reduce(
      session,
      { type: 'edit', payloadId: a, action: { type: 'setShape', value: 'body' } },
      { type: 'edit', payloadId: a, action: { type: 'setActionName', value: 'First' } },
      { type: 'edit', payloadId: b, action: { type: 'setOutputFrom', value: 'trigger' } },
      { type: 'edit', payloadId: b, action: { type: 'setLoopName', value: 'Loop' } },
    );

    const [first, second] = session.payloads.map((payload) => payload.state);
    expect(first).toMatchObject({ shape: 'body', actionName: 'First', outputFrom: 'action', loopName: '' });
    expect(second).toMatchObject({ shape: 'full', actionName: '', outputFrom: 'trigger', loopName: 'Loop' });
    // Fresh states do not share mutable sets.
    expect(first.expanded).not.toBe(second.expanded);
    expect(first.showAll).not.toBe(second.showAll);
  });

  it('retains the last successful data after a failed edit and rejects stale autoParse text', () => {
    let session = createJsonPayloadSession();
    const id = session.activeId;
    session = reduce(
      session,
      paste(id, '{"a":1}'),
      { type: 'edit', payloadId: id, action: { type: 'setText', value: '{"a":' } },
    );

    // Obsolete delayed work (text has moved on) is rejected.
    const stale = {
      type: 'edit',
      payloadId: id,
      action: { type: 'autoParse', expectedText: '{"a":1}' },
    } as const;
    expect(reduce(session, stale)).toBe(session);

    session = reduce(session, {
      type: 'edit',
      payloadId: id,
      action: { type: 'autoParse', expectedText: '{"a":' },
    });
    const state = session.payloads[0].state;
    expect(state.error).not.toBeNull();
    expect(state.parsed?.value).toEqual({ a: 1 });
    expect(getParsedSources(session.payloads)).toHaveLength(1);

    // The same failed text is not re-attempted.
    expect(reduce(session, {
      type: 'edit',
      payloadId: id,
      action: { type: 'autoParse', expectedText: '{"a":' },
    })).toBe(session);
  });

  it('exposes parsed sources with label, caption and reference root, skipping unparsed payloads', () => {
    let session = withPayloads(3);
    const [a, b] = session.payloads.map((payload) => payload.id);
    session = reduce(
      session,
      paste(a, '{"a":1}'),
      { type: 'edit', payloadId: a, action: { type: 'setActionName', value: 'My Action' } },
      { type: 'edit', payloadId: b, action: { type: 'setOutputFrom', value: 'trigger' } },
      paste(b, '{"t":2}'),
    );

    const sources = getParsedSources(session.payloads);
    expect(sources.map((source) => source.id)).toEqual([a, b]);
    expect(sources[0]).toMatchObject({
      label: 'My Action',
      rootCaption: "outputs('My_Action')",
      referenceRoot: { kind: 'outputs', actionName: 'My Action' },
    });
    expect(sources[1]).toMatchObject({
      label: 'Trigger',
      referenceRoot: { kind: 'triggerOutputs' },
    });
  });

  it('previews a blank action name as Action_name and gives no reference root', () => {
    let session = createJsonPayloadSession();
    const id = session.activeId;
    // Typed parse (not paste) leaves the name blank.
    session = reduce(
      session,
      { type: 'edit', payloadId: id, action: { type: 'setText', value: '{"a":1}' } },
      { type: 'edit', payloadId: id, action: { type: 'parse' } },
    );

    const [source] = getParsedSources(session.payloads);
    expect(source.label).toBe('Payload 1');
    expect(source.rootCaption).toBe("outputs('Action_name')");
    expect(source.referenceRoot).toBeNull();
  });

  it('searches scalar roots and empty containers as a single (root) leaf', () => {
    let session = withPayloads(2);
    const [a, b] = session.payloads.map((payload) => payload.id);
    session = reduce(session, paste(a, '"hello root"'), paste(b, '{}'));

    const hit = searchPayloads(session.payloads, 'hello');
    expect(hit.total).toBe(1);
    expect(hit.matches[0]).toMatchObject({ payloadId: a, path: [], pathLabel: '(root)' });

    const byLabel = searchPayloads(session.payloads, '(root)');
    expect(byLabel.total).toBe(2);
  });

  it('caps results at eight while counting every match, and reports parsed sources', () => {
    let session = withPayloads(3);
    const [a, b] = session.payloads.map((payload) => payload.id);
    const rows = (prefix: string) =>
      JSON.stringify(Array.from({ length: 6 }, (_, index) => ({ name: `${prefix}${index}` })));
    session = reduce(session, paste(a, rows('hit')), paste(b, rows('hit')));

    const result = searchPayloads(session.payloads, 'HIT');
    expect(result.matches).toHaveLength(8);
    expect(result.total).toBe(12);
    expect(result.parsedSourceCount).toBe(2);
    expect(result.matches.slice(0, 6).every((match) => match.payloadId === a)).toBe(true);
    expect(result.matches[6].payloadId).toBe(b);

    const blank = searchPayloads(session.payloads, '   ');
    expect(blank).toMatchObject({ total: 0, parsedSourceCount: 2 });
    expect(blank.matches).toEqual([]);
  });

  it('reveals a match: activates, expands ancestors, pages in and selects', () => {
    let session = withPayloads(2);
    const [a, b] = session.payloads.map((payload) => payload.id);
    session = reduce(
      session,
      paste(a, JSON.stringify({ rows: Array.from({ length: 30 }, (_, index) => ({ v: index === 25 ? 'target' : 'x' })) })),
      { type: 'activate', payloadId: b },
    );

    const [match] = searchPayloads(session.payloads, 'target').matches;
    session = reduce(session, { type: 'reveal', match });

    const state = session.payloads[0].state;
    expect(session.activeId).toBe(a);
    expect(state.selectedPath).toEqual(['rows', 25, 'v']);
    expect([...state.expanded]).toEqual(expect.arrayContaining([
      JSON.stringify([]), JSON.stringify(['rows']), JSON.stringify(['rows', 25]),
    ]));
    expect(state.showAll.size).toBe(1);
    expect(session.reveal).toMatchObject({ sequence: 1, payloadId: a, path: ['rows', 25, 'v'] });

    // Editing that payload clears the reveal; closing it does too.
    const edited = reduce(session, { type: 'edit', payloadId: a, action: { type: 'select', path: [] } });
    expect(edited.reveal).toBeNull();
    expect(reduce(session, { type: 'close', payloadId: a }).reveal).toBeNull();
  });
});
