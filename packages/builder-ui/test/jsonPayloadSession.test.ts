import { describe, expect, it } from 'vitest';
import {
  createJsonPayloadSession,
  getParsedSources,
  payloadLabel,
  type JsonPayloadSession,
  jsonPayloadSessionReducer,
} from '../src/workbench/jsonPayloadSession';
import { searchPayloads } from '../src/workbench/payloadSearchModel';
import type { JsonReferenceAction } from '../src/workbench/jsonReferenceState';

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
});

describe('payload session behaviour', () => {
  const load = (
    session: JsonPayloadSession,
    payloadId: string,
    text: string,
    defaultActionName = 'Action',
  ) => jsonPayloadSessionReducer(session, {
    type: 'edit',
    payloadId,
    action: { type: 'pasteAndParse', text, defaultActionName },
  });
  const withPayloads = (count: number) => {
    let session = createJsonPayloadSession();
    for (let index = 1; index < count; index += 1) {
      session = jsonPayloadSessionReducer(session, { type: 'add' });
    }
    return session;
  };
  const ids = (session: JsonPayloadSession) =>
    session.payloads.map((payload) => payload.id);

  it('selects the neighbour at the same index, or the last, when the active payload closes', () => {
    let session = withPayloads(3);
    const [first, second, third] = ids(session);
    session = jsonPayloadSessionReducer(session, { type: 'activate', payloadId: second });
    session = jsonPayloadSessionReducer(session, { type: 'close', payloadId: second });
    expect(session.activeId).toBe(third);

    session = jsonPayloadSessionReducer(session, { type: 'close', payloadId: third });
    expect(session.activeId).toBe(first);

    expect(jsonPayloadSessionReducer(session, { type: 'close', payloadId: first }))
      .toBe(session);
  });

  it('keeps the active payload when another one closes', () => {
    let session = withPayloads(3);
    const [first, second] = ids(session);
    session = jsonPayloadSessionReducer(session, { type: 'activate', payloadId: first });
    session = jsonPayloadSessionReducer(session, { type: 'close', payloadId: second });
    expect(session.activeId).toBe(first);
  });

  it('labels duplicate triggers and blank action names stably', () => {
    let session = withPayloads(4);
    const [a, b, c, d] = ids(session);
    const edit = (payloadId: string, action: JsonReferenceAction) => {
      session = jsonPayloadSessionReducer(session, { type: 'edit', payloadId, action });
    };
    edit(a, { type: 'setOutputFrom', value: 'trigger' });
    edit(b, { type: 'setOutputFrom', value: 'trigger' });
    edit(c, { type: 'setActionName', value: '  Get items ' });
    // d keeps a blank action name

    expect(session.payloads.map((_, index) => payloadLabel(session.payloads, index)))
      .toEqual(['Trigger', 'Trigger 2', 'Get items', 'Payload 4']);
    expect(d).toBe('payload-4');
  });

  it('keeps settings independent per payload', () => {
    let session = withPayloads(2);
    const [first, second] = ids(session);
    session = jsonPayloadSessionReducer(session, {
      type: 'edit', payloadId: first, action: { type: 'setShape', value: 'body' },
    });
    session = jsonPayloadSessionReducer(session, {
      type: 'edit', payloadId: first, action: { type: 'setActionName', value: 'One' },
    });
    session = load(session, second, '{"a":1}', 'Two');

    const [one, two] = session.payloads.map((payload) => payload.state);
    expect(one).toMatchObject({ shape: 'body', actionName: 'One', parsed: null });
    expect(two).toMatchObject({ shape: 'full', actionName: 'Two' });
    expect(two.parsed).not.toBeNull();
    expect(one.expanded).not.toBe(two.expanded);
  });

  it('retains the last successful data after an invalid automatic edit', () => {
    let session = createJsonPayloadSession();
    const id = session.activeId;
    const edit = (action: JsonReferenceAction) => {
      session = jsonPayloadSessionReducer(session, { type: 'edit', payloadId: id, action });
    };
    edit({ type: 'setText', value: '{"a":1}' });
    edit({ type: 'autoParse', expectedText: '{"a":1}' });
    const good = session.payloads[0].state.parsed;
    expect(good).not.toBeNull();

    edit({ type: 'setText', value: '{"a":' });
    edit({ type: 'autoParse', expectedText: '{"a":' });

    const state = session.payloads[0].state;
    expect(state.error).not.toBeNull();
    expect(state.parsed).toBe(good);
    expect(state.lastSuccessfulPayload).toBe(good);
    expect(getParsedSources(session.payloads)).toHaveLength(1);

    // The same failed text is not re-attempted.
    expect(jsonPayloadSessionReducer(session, {
      type: 'edit', payloadId: id,
      action: { type: 'autoParse', expectedText: '{"a":' },
    })).toBe(session);
  });

  it('rejects an automatic parse for text that has since changed', () => {
    let session = createJsonPayloadSession();
    const id = session.activeId;
    session = jsonPayloadSessionReducer(session, {
      type: 'edit', payloadId: id, action: { type: 'setText', value: '{"b":2}' },
    });
    expect(jsonPayloadSessionReducer(session, {
      type: 'edit', payloadId: id,
      action: { type: 'autoParse', expectedText: '{"a":1}' },
    })).toBe(session);
  });

  it('searches scalar roots as (root)', () => {
    let session = withPayloads(2);
    const [first, second] = ids(session);
    session = load(session, first, 'null');
    session = load(session, second, '42');

    expect(searchPayloads(session.payloads, 'null').matches).toMatchObject([
      { payloadId: first, path: [], pathLabel: '(root)', preview: 'null' },
    ]);
    expect(searchPayloads(session.payloads, '42').matches).toMatchObject([
      { payloadId: second, path: [], pathLabel: '(root)', preview: '42' },
    ]);
    expect(searchPayloads(session.payloads, '(root)').total).toBe(2);
  });

  it('renders at most eight matches but counts every match across payloads', () => {
    let session = withPayloads(2);
    const [first, second] = ids(session);
    const list = (count: number) =>
      JSON.stringify({ hits: Array.from({ length: count }, () => 'hit') });
    session = load(session, first, list(6));
    session = load(session, second, list(7));

    const result = searchPayloads(session.payloads, 'HIT');
    expect(result.matches).toHaveLength(8);
    // A leaf matching by both label and value still counts once.
    expect(result.total).toBe(13);
    expect(result.parsedSourceCount).toBe(2);
    expect(result.matches.slice(0, 6).every((match) => match.payloadId === first)).toBe(true);
    expect(searchPayloads(session.payloads, '  ').total).toBe(0);
  });
});
