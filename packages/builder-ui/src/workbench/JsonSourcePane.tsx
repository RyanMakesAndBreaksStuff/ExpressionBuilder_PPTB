import { Fragment, useId, type Dispatch, type KeyboardEvent } from "react";
import { ActionButton } from "./controls/ActionButton";
import {
	ACTION_NAME_PLACEHOLDER,
	rootExpressionFor,
	showActionNameInvalid,
	type JsonReferenceAction,
	type JsonReferenceState,
	type OutputFrom,
	type PayloadShape,
} from "./jsonReferenceState";

interface JsonSourcePaneProps {
	state: JsonReferenceState;
	dispatch: Dispatch<JsonReferenceAction>;
}

type ReferenceRootKey = `${OutputFrom}-${PayloadShape}`;

const ALL_ROOT_KEYS: readonly ReferenceRootKey[] = [
	"action-full",
	"action-body",
	"trigger-full",
	"trigger-body",
];

// Off for pasted payloads and names: some browsers send spell-check text to a
// cloud service (FR-062).
const NO_TEXT_ASSISTANCE = {
	spellCheck: false,
	autoComplete: "off",
	autoCorrect: "off",
	autoCapitalize: "off",
} as const;

export function JsonSourcePane({ dispatch, state }: JsonSourcePaneProps) {
	const id = useId();
	const headingId = `${id}-heading`;
	const rootId = `${id}-root`;
	const nameId = `${id}-name`;
	const nameHelpId = `${id}-name-help`;
	const sampleId = `${id}-sample`;
	const errorId = `${id}-error`;
	const nameInvalid = showActionNameInvalid(state);
	const rootKey: ReferenceRootKey = `${state.outputFrom}-${state.shape}`;

	const rootSections = [
		{
			heading: "Action",
			options: [
				{
					key: "action-full" as ReferenceRootKey,
					label: "Full output",
					ariaLabel: "Action · Full output",
					detailId: `${id}-af`,
					detail: rootExpressionFor(state, "action", "full"),
				},
				{
					key: "action-body" as ReferenceRootKey,
					label: "Body only",
					ariaLabel: "Action · Body only",
					detailId: `${id}-ab`,
					detail: rootExpressionFor(state, "action", "body"),
				},
			],
		},
		{
			heading: "Trigger",
			options: [
				{
					key: "trigger-full" as ReferenceRootKey,
					label: "Full output",
					ariaLabel: "Trigger · Full output",
					detailId: `${id}-tf`,
					detail: rootExpressionFor(state, "trigger", "full"),
				},
				{
					key: "trigger-body" as ReferenceRootKey,
					label: "Body only",
					ariaLabel: "Trigger · Body only",
					detailId: `${id}-tb`,
					detail: rootExpressionFor(state, "trigger", "body"),
				},
			],
		},
	];

	const handleRootKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[
			event.key
		];
		if (step === undefined) return;
		event.preventDefault();
		const buttons = Array.from(
			event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]'),
		);
		const currentIndex = ALL_ROOT_KEYS.indexOf(rootKey);
		const nextIndex =
			(currentIndex + step + ALL_ROOT_KEYS.length) % ALL_ROOT_KEYS.length;
		const [outputFrom, shape] = ALL_ROOT_KEYS[nextIndex].split("-") as [
			OutputFrom,
			PayloadShape,
		];
		dispatch({ type: "setReferenceRoot", outputFrom, shape });
		buttons[nextIndex]?.focus();
	};

	return (
		<section
			className="eb-json-card eb-json-source"
			aria-labelledby={headingId}>
			<div className="eb-json-card-header">
				<h2 id={headingId}>Source</h2>
			</div>
			<div className="eb-json-card-body">
				<div className="eb-json-field">
					<span className="eb-label" id={rootId}>
						Reference root
					</span>
					<div
						className="eb-root-grid"
						role="radiogroup"
						aria-labelledby={rootId}
						onKeyDown={handleRootKeyDown}>
						{rootSections.map(({ heading, options }) => (
							<Fragment key={heading}>
								<span className="eb-root-section-header" aria-hidden="true">
									{heading}
								</span>
								{options.map(({ key, label, ariaLabel, detailId, detail }) => (
									<button
										key={key}
										type="button"
										role="radio"
										aria-checked={key === rootKey}
										aria-label={ariaLabel}
										aria-describedby={detailId}
										tabIndex={key === rootKey ? 0 : -1}
										onClick={() => {
											const [outputFrom, shape] = key.split("-") as [
												OutputFrom,
												PayloadShape,
											];
											dispatch({ type: "setReferenceRoot", outputFrom, shape });
										}}>
										<span className="eb-choice-label">{label}</span>
										<span id={detailId} className="eb-choice-detail">
											<code>{detail}</code>
										</span>
									</button>
								))}
							</Fragment>
						))}
					</div>
				</div>

				{state.outputFrom === "action" ? (
					<div className="eb-json-field">
						<label className="eb-label" htmlFor={nameId}>
							Action name
						</label>
						<input
							{...NO_TEXT_ASSISTANCE}
							id={nameId}
							className="eb-input"
							value={state.actionName}
							aria-invalid={nameInvalid}
							aria-describedby={nameHelpId}
							onChange={(event) =>
								dispatch({ type: "setActionName", value: event.target.value })
							}
						/>
						<p
							id={nameHelpId}
							className={`eb-json-help${nameInvalid ? " is-invalid" : ""}`}>
							{nameInvalid
								? "Enter the action name to build the reference."
								: "As shown in the flow designer. Spaces become underscores."}
						</p>
					</div>
				) : null}

				<div className="eb-json-field eb-json-sample">
					<label className="eb-label" htmlFor={sampleId}>
						Sample JSON
					</label>
					<textarea
						{...NO_TEXT_ASSISTANCE}
						id={sampleId}
						className="eb-textarea"
						placeholder="Paste the output from a flow run"
						value={state.text}
						aria-invalid={state.error !== null}
						aria-describedby={state.error !== null ? errorId : undefined}
						onChange={(event) =>
							dispatch({ type: "setText", value: event.target.value })
						}
						onPaste={(event) => {
							const pasted = event.clipboardData.getData("text");
							if (!pasted) return;
							event.preventDefault();
							dispatch({
								type: "pasteAndParse",
								text: pasted,
								defaultActionName: ACTION_NAME_PLACEHOLDER,
							});
						}}
					/>
				</div>

				<div className="eb-json-parse-row">
					<ActionButton onClick={() => dispatch({ type: "parse" })}>
						Parse
					</ActionButton>
				</div>

				{state.error !== null ? (
					<div id={errorId} role="alert" className="eb-json-error">
						{state.error}
					</div>
				) : null}
			</div>
		</section>
	);
}
