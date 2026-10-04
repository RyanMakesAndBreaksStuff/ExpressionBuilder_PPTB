// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ExpressionPreview } from '../src/components/ExpressionPreview';

afterEach(() => cleanup());

function renderPreview(expression: string) {
  render(<ExpressionPreview expression={expression} label="Preview under test" />);
  const preview = screen.getByLabelText('Preview under test');
  const tokens = (className: string) =>
    [...preview.querySelectorAll(`.${className}`)].map((element) => element.textContent);
  return { preview, tokens };
}

describe('ExpressionPreview highlighting (FR-046)', () => {
  it.each([
    "outputs('Get_items')?['body']?['value'][0]?['Requester']?['Email']",
    "@{outputs('Get_items')?['body']?['value'][0]?['Requester']?['Email']}",
    "triggerBody()?['O''Brien']",
    "triggerBody()?['']",
    "outputs('Compose')?['matrix'][0][1]",
    "body('Get_Bob''s_items')",
    "@and(equals(triggerBody()?['Status'],'Approved'),greater(triggerBody()?['Amount'],5000))",
    "@equals(toLower(item()?['Approver']),toLower('finance'))",
  ])('shows exactly the text it was given: %s', (expression) => {
    expect(renderPreview(expression).preview.textContent).toBe(expression);
  });

  it('colours the payload root functions as functions', () => {
    for (const name of ['outputs', 'body', 'triggerBody', 'triggerOutputs', 'items']) {
      cleanup();
      expect(renderPreview(`${name}()`).tokens('fn')).toEqual([name]);
    }
  });

  it('keeps a string with doubled apostrophes as one string', () => {
    expect(renderPreview("triggerBody()?['O''Brien']").tokens('str')).toEqual(["'O''Brien'"]);
  });

  it('treats brackets, braces and the at sign as symbols, and an index as a number', () => {
    const { tokens } = renderPreview('@{triggerBody()[0]}');

    expect(tokens('sym')).toEqual(['@', '{', '(', ')', '[', ']', '}']);
    expect(tokens('num')).toEqual(['0']);
  });

  it('does not colour a key that happens to be a function name', () => {
    expect(renderPreview("triggerBody()?['body']").tokens('fn')).toEqual(['triggerBody']);
  });
});
