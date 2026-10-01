import { describe, expect, it } from 'vitest';
import { formatFieldReference, formatPayloadReference, formatPayloadRoot } from '../src';
import type { PayloadReference, PayloadReferenceRoot } from '../src';

const getItemsFull: PayloadReferenceRoot = { kind: 'outputs', actionName: 'Get items' };
const getItemsBody: PayloadReferenceRoot = { kind: 'body', actionName: 'Get items' };
const composeFull: PayloadReferenceRoot = { kind: 'outputs', actionName: 'Compose' };
const triggerFull: PayloadReferenceRoot = { kind: 'triggerOutputs' };
const triggerBody: PayloadReferenceRoot = { kind: 'triggerBody' };

// Spec Appendix A (normative). Case 23 (the inline copy format) and case 24 (a
// blank action name) are UI behaviour; jsonReferenceState.test.ts covers them.
const appendixA: Array<[number, PayloadReference, string]> = [
  [1, { root: getItemsFull, path: ['body', 'value', 0, 'Requester', 'Email'] }, "outputs('Get_items')?['body']?['value'][0]?['Requester']?['Email']"],
  [2, { root: getItemsBody, path: ['value', 0, 'Title'] }, "body('Get_items')?['value'][0]?['Title']"],
  [3, { root: triggerFull, path: ['body', 'customer', 'name'] }, "triggerOutputs()?['body']?['customer']?['name']"],
  [4, { root: triggerBody, path: ['customer', 'name'] }, "triggerBody()?['customer']?['name']"],
  [5, { root: composeFull, path: ['customer'] }, "outputs('Compose')?['customer']"],
  [6, { root: getItemsBody, path: [] }, "body('Get_items')"],
  [7, { root: triggerFull, path: [] }, 'triggerOutputs()'],
  [8, { root: getItemsFull, path: ['body', '@odata.nextLink'] }, "outputs('Get_items')?['body']?['@odata.nextLink']"],
  [9, { root: triggerBody, path: ["O'Brien"] }, "triggerBody()?['O''Brien']"],
  [10, { root: triggerBody, path: ['a.b'] }, "triggerBody()?['a.b']"],
  [11, { root: triggerBody, path: ['body/value'] }, "triggerBody()?['body/value']"],
  [12, { root: triggerBody, path: ['first name', '[x]'] }, "triggerBody()?['first name']?['[x]']"],
  [13, { root: triggerBody, path: [''] }, "triggerBody()?['']"],
  [14, { root: triggerBody, path: ['0'] }, "triggerBody()?['0']"],
  [15, { root: triggerBody, path: [0, 'id'] }, "triggerBody()[0]?['id']"],
  [16, { root: composeFull, path: ['matrix', 0, 1] }, "outputs('Compose')?['matrix'][0][1]"],
  [17, { root: triggerBody, path: ['__proto__'] }, "triggerBody()?['__proto__']"],
  [18, { root: triggerBody, path: ['naïve 名前'] }, "triggerBody()?['naïve 名前']"],
  [19, { root: { kind: 'outputs', actionName: '  Get   my items ' }, path: [] }, "outputs('Get_my_items')"],
  [20, { root: { kind: 'body', actionName: "Get Bob's items" }, path: [] }, "body('Get_Bob''s_items')"],
  [21, { root: { kind: 'outputs', actionName: 'get Items' }, path: [] }, "outputs('get_Items')"],
  [22, { root: { kind: 'outputs', actionName: 'Get\titems\n2' }, path: [] }, "outputs('Get_items_2')"],
];

describe('formatPayloadReference (spec Appendix A)', () => {
  it.each(appendixA)('case %i', (_case, reference, expected) => {
    expect(formatPayloadReference(reference)).toBe(expected);
  });

  it('writes an index as [n] and a numeric key as a quoted key', () => {
    expect(formatPayloadReference({ root: triggerBody, path: [0] })).toBe('triggerBody()[0]');
    expect(formatPayloadReference({ root: triggerBody, path: ['0'] })).toBe("triggerBody()?['0']");
  });

  it('adds no body segment of its own', () => {
    expect(formatPayloadReference({ root: getItemsBody, path: ['body'] })).toBe("body('Get_items')?['body']");
    expect(formatPayloadReference({ root: getItemsFull, path: [] })).toBe("outputs('Get_items')");
  });
});

describe('formatPayloadRoot', () => {
  it.each<[PayloadReferenceRoot, string]>([
    [getItemsFull, "outputs('Get_items')"],
    [getItemsBody, "body('Get_items')"],
    [triggerFull, 'triggerOutputs()'],
    [triggerBody, 'triggerBody()'],
    [{ kind: 'item' }, 'item()'],
    [{ kind: 'items', actionName: ' Apply to   each ' }, "items('Apply_to_each')"],
  ])('formats %o', (root, expected) => {
    expect(formatPayloadRoot(root)).toBe(expected);
  });
});

describe('existing field references (spec Appendix A case 25)', () => {
  it('formats a trigger-condition field path exactly as before', () => {
    expect(
      formatFieldReference({ id: 'b', label: 'b', type: 'string', path: ['a', 'b'] }, 'triggerCondition'),
    ).toBe("triggerBody()?['a']?['b']");
  });
});
