# Feature 003: Conversion functions in the Functions catalog

**Status:** Draft
**Version:** 0.1.0
**Created:** 2026-10-14
**Branch:** Documentation prepared on `functions-prep-for-release`; implementation branch is deferred until execution.
**Baseline:** [Spec 001](../001-functions-screen/spec.md) (Functions screen, catalog FR-9, nav FR-10, argument parsing FR-13). This spec extends Spec 001's catalog scope (D2) with one more Microsoft Learn category and changes nothing else in Spec 001. It does not touch [Spec 002](../002-multi-payload-json-workspace/spec.md).
**Source:** Microsoft Learn, [Reference guide to functions in expressions — Conversion functions](https://learn.microsoft.com/en-us/azure/logic-apps/expression-functions-reference#conversion-functions), page dated 2026-07-21, read 2026-10-14. Every signature below was checked against that function's own Learn section on that date.

## Problem Statement

The Functions catalog covers five Learn categories (String, Collection, Logical comparison, Math, Date and time) and omits Conversion. Makers can't pick `int`, `string`, `json` or other conversion functions from the nav. Spec 001 FR-13 also rejects unknown function names inside arguments, so a common nested expression such as `int(triggerBody()?['Qty'])`, typed into any argument, is currently reported as invalid (`"int" is not a known function.`) even though Power Automate accepts it.

## Goals

- List every current, non-deprecated Learn conversion function in a sixth nav group, **Conversion**, with its Learn signature.
- Accept conversion calls nested inside any argument, with the same arity checks Spec 001 applies to other catalog functions.
- Leave every existing group, function, default selection and behavior unchanged.

## Non-Goals

- Deprecated conversion functions: `decodeBase64` (Learn: use `base64ToString`) and `parse` (marked deprecated in Learn's table).
- Evaluating conversions, previewing results, or warning about Learn's designer-visibility note for base64 and data URI functions.
- Validating argument values against their declared types (Spec 001 shows the type as a badge only).
- Reordering existing groups or adding usage-based ordering.

## Users and Context

**Primary users:** Power Automate makers building expressions on the Functions screen.
**Usage context:** Unchanged from Spec 001: standalone browser app and Power Platform Toolbox host.
**User mental model:** Nav groups mirror Learn's categories. A function that Learn documents is accepted wherever an expression is accepted.

## Decisions

| # | Question | Decision |
|---|----------|----------|
| D1 | Include deprecated functions? | No. 24 functions, not 26. |
| D2 | Include base64 and data URI functions despite Learn's designer-rendering note? | Yes. The note concerns designer display only. Those functions are valid in expressions. |
| D3 | Group position and order within the group | Conversion is appended after Date and time, so the existing five groups and their order (and String expanded on first load) are unchanged. Functions within Conversion are alphabetical, matching the other groups. Learn publishes no usage data to rank by popularity. |
| D4 | XML and JSON return types | No new badge types. `json` and `base64ToJson` return **any** (Learn: JSON native type, object or array). `xml` returns **object** (Learn: Object). `decimal` and `float` return **number**. |

## Catalog content

Learn's own parameter names are used. "any" means Learn types the argument as Any.

| Function | Arguments (name: type, required unless marked) | Returns | Description (from Learn's task text) |
|---|---|---|---|
| `array` | value: string | collection | Return an array from a single input. |
| `base64` | value: string | string | Return the base64-encoded version of a string. |
| `base64ToBinary` | value: string | string | Return the binary version of a base64-encoded string. |
| `base64ToJson` | value: string | any | Return the JSON value of a base64-encoded string. |
| `base64ToString` | value: string | string | Return the string version of a base64-encoded string. |
| `binary` | value: string | string | Return the binary version of an input value. |
| `bool` | value: any | boolean | Return the Boolean version of a value. |
| `createArray` | object1: any; object2: any; further objects: any, optional, repeating | collection | Return an array from multiple inputs. |
| `dataUri` | value: string | string | Return the data URI for an input value. |
| `dataUriToBinary` | value: string | string | Return the binary version of a data URI. |
| `dataUriToString` | value: string | string | Return the string version of a data URI. |
| `decimal` | value: string | number | Return the decimal number for a decimal string. |
| `decodeDataUri` | value: string | string | Return the binary version of a data URI. |
| `decodeUriComponent` | value: string | string | Replace escape characters with decoded versions. |
| `encodeBase64` | value: string | string | Return the base64-encoded version of a string. |
| `encodeUriComponent` | value: string | string | Replace URL-unsafe characters with escape characters. |
| `float` | value: string; locale: string, optional | number | Return a floating-point number for an input value. |
| `int` | value: string | integer | Return the integer version of a string. |
| `json` | value: string | any | Return the JSON value or object for a string or XML. |
| `string` | value: any | string | Return the string version of a value. |
| `uriComponent` | value: string | string | Return the URI-encoded version of a value. |
| `uriComponentToBinary` | value: string | string | Return the binary version of a URI-encoded string. |
| `uriComponentToString` | value: string | string | Return the string version of a URI-encoded string. |
| `xml` | value: string | object | Return the XML version of a string. |

Notes: Learn's `createArray` requires "at least two items", so two arguments are required and more may follow (Spec 001 D9 repeating slot). `json` accepts string or XML. XML values come from `xml(…)`, so the argument is typed string, as Learn's syntax line `json('<value>')` shows. None of these functions appears in another Learn category, so this spec adds no two-group twins.

## User Stories

### Story 1: Find conversion functions in the nav

**As a** maker
**I want** a Conversion group in the Functions nav
**So that** I can build conversion expressions the same way as other functions.

**Acceptance criteria:**

- [ ] **AC-1.1** Given the Functions screen on first load When the nav renders Then six groups appear in the order String, Collection, Logical, Math, Date and time, Conversion; Conversion shows a count of 24 and is collapsed; String is expanded and `concat` is selected.
- [ ] **AC-1.2** Given the Conversion group is expanded When its rows render Then they are exactly the 24 names in the catalog table above, in alphabetical (case-insensitive) order, and neither `decodeBase64` nor `parse` appears anywhere in the nav.
- [ ] **AC-1.3** Given the nav search is empty When the user types `toBinary` Then only the Conversion group is visible, expanded, listing `base64ToBinary`, `dataUriToBinary` and `uriComponentToBinary`; clearing the search restores all six groups with their previous expansion.
- [ ] **AC-1.4** Given any group other than Conversion When its rows and count render Then they are identical to the behavior before this feature (String 20, Collection 14, Logical 12, Math 10, Date and time 23).

### Story 2: Fill a conversion function's arguments

**As a** maker
**I want** each conversion function to show Learn's arguments
**So that** I fill in exactly what Power Automate expects.

**Acceptance criteria:**

- [ ] **AC-2.1** Given the catalog When each Conversion entry is inspected Then its argument names, types, required flags, repeating flag, return type and non-empty description match the catalog table above.
- [ ] **AC-2.2** Given `int` is selected When the user sets `value` to `triggerBody()?['Qty']` Then Status shows **Valid**, "1 of 1 required set", and the expression is `int(triggerBody()?['Qty'])`.
- [ ] **AC-2.3** Given `float` is selected When only `value` is set to `'1.5'` Then Status shows **Valid**, "1 of 1 required set", and the expression is `float('1.5')`. When `locale` is also set to `'en-US'` Then the expression is `float('1.5', 'en-US')`.
- [ ] **AC-2.4** Given `createArray` is selected When `object1` is `'a'` and `object2` is empty Then Status shows **Invalid**. When `object2` is `'b'` Then Status shows **Valid**, "2 of 2 required set", and one more empty optional slot appears.

### Story 3: Use conversion calls inside other arguments

**As a** maker
**I want** conversion calls to be accepted inside any argument
**So that** nested expressions such as `add(int(…), 1)` validate.

**Acceptance criteria:**

- [ ] **AC-3.1** Given `add` is selected When `summand1` is `int(triggerBody()?['Qty'])` and `summand2` is `1` Then both arguments parse and Status shows **Valid**.
- [ ] **AC-3.2** Given any argument When its value is `string(item())`, `json(body('Get_item'))` or `bool(1)` Then the argument parses without error.
- [ ] **AC-3.3** Given any argument When its value is `int('1', '2')` Then it is invalid with the message `int takes at most 1 argument.`; When its value is `createArray('a')` Then it is invalid with the message `createArray needs at least 2 arguments.`
- [ ] **AC-3.4** Given any argument When its value is `decodeBase64('aGk=')` or `parse('{}')` Then it is invalid with the existing unknown-function message (deprecated functions remain outside the catalog).

## Functional Requirements

### FR-1: Conversion catalog group

**Must:** Add the 24 functions in the catalog table as a sixth catalog group named Conversion, with the arguments, types, required and repeating flags, return types and descriptions in that table. Order the group's functions alphabetically. Append the group after Date and time. Satisfy Spec 001 FR-9 and AC-9.1 for the new group: per-group names match Learn's category exactly, minus the deprecated functions excluded by D1; argument names are unique within each function; optional arguments follow required ones.

**Must not:** Add `decodeBase64` or `parse`; change any existing group's name, order, membership, signatures or count; change the first-load expanded group or selected function.

### FR-2: Nav, search and selection

**Must:** Show the Conversion group with the same count, expand/collapse, search filtering, selection and keyboard behavior that Spec 001 FR-10 and FR-11 define for the other groups.

### FR-3: Argument parsing

**Must:** Treat each Conversion function as a known catalog function in argument parsing (Spec 001 FR-13), applying the same minimum and maximum argument-count checks and messages.

**Must not:** Change the parsing of payload roots, literals, accessors or existing functions.

## Non-Functional Requirements

### Performance

- Nav render and search remain within existing behavior. Adding 24 entries raises the catalog from 79 to 103, and there is no new performance target.

### Accessibility

- The Conversion group and its rows have the same roles, accessible names, focus indication and keyboard operation as existing groups (Spec 001 FR-6, FR-10). No new controls are introduced.

### Reliability

- Existing Spec 001 catalog, Functions state and argument-parser tests keep passing after their pinned group list and counts are updated to include Conversion.

## Error Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| Required conversion argument left empty | Status **Invalid** with the existing "N of M required set" caption; Copy disabled (Spec 001 FR-17, AC-23.1). |
| Too many arguments in a nested conversion call | Invalid argument with `<name> takes at most N argument(s).` |
| Too few arguments in nested `createArray` | Invalid argument with `createArray needs at least 2 arguments.` |
| Deprecated `decodeBase64` / `parse` typed in an argument | Invalid with the existing unknown-function message. |
| Search matches no conversion function | Conversion group hidden, as for any group without matches (Spec 001 FR-11). |

## Open Questions

None. On 2026-10-14 the user confirmed D1 (exclude deprecated functions), D2 (include base64 and data URI functions), allowed alphabetical or usage ordering (D3 records alphabetical, because no usage source exists), and chose a new spec over amending Spec 001.

## Out of Scope (Future Considerations)

- Other Learn categories not yet in the catalog (Workflow, URI parsing, Manipulation: JSON & XML).
- Usage-based ordering of functions or groups.
- A designer-visibility warning for base64 and data URI functions.
- Type-checking argument values against their declared types.
