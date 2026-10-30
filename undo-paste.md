# Allow Ctrl+Z in the Sample JSON textarea

## Context

`packages/builder-ui/src/workbench/JsonSourcePane.tsx:189-198` currently intercepts paste with `event.preventDefault()` and dispatches `pasteAndParse`. React then writes the pasted text into the controlled textarea programmatically, bypassing the browser’s native editing history.

Let the browser perform the paste so undo and redo remain available. Preserve the existing behavior of replacing the whole sample and parsing automatically.

Use `onInput` for paste detection because React can suppress `onChange` when the pasted text equals the existing textarea value.

## Changes

Production changes are limited to:

- `packages/builder-ui/src/workbench/JsonSourcePane.tsx`

Add focused regression coverage in:

- `packages/builder-ui/test/jsonReferenceWorkspace.test.tsx`

### `onPaste`: select the sample without intercepting insertion

Keep the clipboard-text guard, then select the whole textarea:

```tsx
onPaste={(event) => {
	const pasted = event.clipboardData.getData("text");
	if (!pasted) return;
	event.currentTarget.select();
}}
```

Remove `preventDefault()` and the reducer dispatch from this handler.

The browser’s default paste replaces the selected sample. Keeping the guard avoids selecting the whole sample when the clipboard contains no text.

Treat manual steps 1–4 as acceptance gates in every supported browser: native paste must replace the whole sample and preserve undo and redo. If a gate fails, stop and re-plan the approach or resolve the supported-browser scope before accepting the implementation. Do not fall back to `preventDefault()` + `setRangeText`; that bypasses native undo history and fails this task's acceptance criterion.

### `onInput`: handle paste and ordinary editing

Use one `onInput` handler for all Sample JSON edits and remove the textarea's `onChange` handler. React's controlled-value warning accepts `onInput` in place of `onChange`.

Dispatch `pasteAndParse` for `insertFromPaste`; dispatch `setText` for every other input type, including typing, deletion, undo, redo, and drag-and-drop:

```tsx
onInput={(event) => {
	const { value } = event.currentTarget;
	dispatch(
		(event.nativeEvent as InputEvent).inputType === "insertFromPaste"
			? { type: "pasteAndParse", text: value, defaultActionName: ACTION_NAME_PLACEHOLDER }
			: { type: "setText", value },
	);
}}
```

Read the resulting DOM value directly and dispatch synchronously. Do not trim, format, or otherwise transform the pasted text.

## Reducer and status behavior

Leave `jsonReferenceState.ts` unchanged.

Because the browser has already inserted the text, the reducer’s `state.text` matches the DOM value and React avoids another `.value` assignment.

Undo and redo restore textarea text only; they do not restore previous parsed trees, selections, or action names.

Existing status behavior remains:

- After a successful parse, differing text shows “Sample changed. Parse again to update.”
- Text matching the current parsed sample shows the parsed status again.
- After an invalid paste, undo restores the previous text but retains “Could not parse” and an empty tree until the user selects Parse.

## Verification

### Automated

Run:

```powershell
npm test -w packages/builder-ui -- jsonReferenceWorkspace builderSwitching
```

Add focused assertions that:

- Pasting replaces the whole sample despite a partial selection.
- Typing valid JSON, then pasting identical JSON, still parses and fills the default action name.
- Ordinary edits retain the existing stale-sample behavior.

Existing paste tests must continue passing, including invalid JSON and preservation of an entered action name.

> **Review:**
> - `fireEvent.paste` doesn't insert anything in jsdom, so a test using it can't prove "replaces the whole sample despite a partial selection." Use `userEvent.paste`, which honours the selection and sends `inputType: "insertFromPaste"`. Otherwise, reword the assertion to "paste selects all."
> - For the identical-JSON case, use `fireEvent.input(textarea, { target: { value }, inputType: "insertFromPaste" })`. That's the case where `onChange` would have been skipped, which is why the plan uses `onInput` in the first place.

### Manual browser verification

Use a running browser with actual clipboard paste:

1. Type sample A, paste sample B, then undo: sample A returns.
2. Redo: sample B returns.
3. Paste sample C and undo/redo through both pastes.
4. Paste with only part of the sample selected: the whole sample is replaced.
5. Type valid JSON, then paste identical JSON: automatic parsing still occurs.
6. Paste invalid JSON, undo, then select Parse: the restored valid sample parses successfully.
7. Paste clipboard content without text: the handler does not select the whole sample.

Check text, parsed status, and tree behavior. Synthetic paste events and jsdom do not prove native undo history.

## Excluded

- Deprecated `execCommand("insertText")`.
- A custom undo stack.
- Reducer changes or restoration of parsed state during undo.
- New dependencies.
- Auto-parse on drag-and-drop (`insertFromDrop`); dropped text is saved without parsing, as today. *(Added in review.)*
