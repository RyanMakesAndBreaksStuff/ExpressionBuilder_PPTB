import { useEffect, useId, useRef, type Dispatch } from "react";
import type { PlatformAdapter } from "@ryanmakes/eb_platformadapter";
import { ChoiceGroup } from "./controls/ChoiceGroup";
import { TextAlignLeftIcon, TextAlignRightIcon } from "./icons/BuilderIcons";
import { JsonSourcePane } from "./JsonSourcePane";
import { PayloadTree } from "./PayloadTree";
import type { PayloadReveal } from "./jsonPayloadSession";
import { ReferencePanel } from "./ReferencePanel";
import {
	copyText,
	rootExpression,
	showBodyHint,
	type CopyFormat,
	type JsonReferenceAction,
	type JsonReferenceState,
} from "./jsonReferenceState";
import { countLabel } from "./payloadTreeModel";

/** Where payload values sit in a tree row: after the key, or at the pane's right edge. */
export type ValueAlign = "left" | "right";

const VALUE_ALIGN_OPTIONS = [
	{ value: "left", label: "Left", icon: <TextAlignLeftIcon /> },
	{ value: "right", label: "Right", icon: <TextAlignRightIcon /> },
] as const;

interface JsonReferenceWorkspaceProps {
	adapter: PlatformAdapter;
	/** False while another screen is selected; the workspace stays mounted so its state survives (FR-008). */
	active: boolean;
	state: JsonReferenceState;
	dispatch: Dispatch<JsonReferenceAction>;
	reveal?: PayloadReveal | null;
	valueAlign?: ValueAlign;
	/** Omit to hide the alignment toggle. */
	onValueAlignChange?: (value: ValueAlign) => void;
}

export function JsonReferenceWorkspace({
	active,
	adapter,
	state,
	dispatch,
	reveal,
	valueAlign = "right",
	onValueAlignChange,
}: JsonReferenceWorkspaceProps) {
	const autoParseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);

	useEffect(() => () => clearTimeout(autoParseTimer.current), []);

	// Auto-parse an unvalidated edit after a short delay, only while visible.
	useEffect(() => {
		clearTimeout(autoParseTimer.current);
		if (
			!active ||
			state.text === state.lastAttemptedText ||
			(!state.text.trim() && state.lastSuccessfulPayload === null)
		)
			return;
		autoParseTimer.current = setTimeout(
			() => dispatch({ type: "autoParse", expectedText: state.text }),
			600,
		);
		return () => clearTimeout(autoParseTimer.current);
	}, [
		active,
		state.text,
		state.lastAttemptedText,
		state.lastSuccessfulPayload,
		dispatch,
	]);

	const copy = async (format: CopyFormat) => {
		const text = copyText(state, format);
		if (text === null) return;
		try {
			await adapter.copyToClipboard(text);
		} catch (error) {
			void adapter.notify(
				`Could not copy expression: ${error instanceof Error ? error.message : "clipboard unavailable"}`,
				"error",
			);
			return;
		}
		void adapter.notify("Expression copied", "success");
	};

	const copyRaw = async (text: string) => {
		try {
			await adapter.copyToClipboard(text);
		} catch (error) {
			void adapter.notify(
				`Could not copy expression: ${error instanceof Error ? error.message : "clipboard unavailable"}`,
				"error",
			);
			return;
		}
		void adapter.notify("Expression copied", "success");
	};

	return (
		<div className="eb-json-workspace">
			<JsonSourcePane state={state} dispatch={dispatch} />
			<div className="eb-json-content">
				<PayloadPanel
					state={state}
					dispatch={dispatch}
					reveal={reveal}
					valueAlign={valueAlign}
					onValueAlignChange={onValueAlignChange}
				/>
				<ReferencePanel
					state={state}
					onCopy={(format) => void copy(format)}
					onCopyText={(text) => void copyRaw(text)}
					onLoopNameChange={(value) => dispatch({ type: "setLoopName", value })}
				/>
			</div>
		</div>
	);
}

interface PayloadPanelProps {
	state: JsonReferenceState;
	dispatch: Dispatch<JsonReferenceAction>;
	reveal?: PayloadReveal | null;
	valueAlign: ValueAlign;
	onValueAlignChange?: (value: ValueAlign) => void;
}

function PayloadPanel({
	dispatch,
	onValueAlignChange,
	reveal,
	state,
	valueAlign,
}: PayloadPanelProps) {
	const headingId = useId();
	const { parsed } = state;

	return (
		<section
			className={`eb-json-card eb-json-payload is-values-${valueAlign}`}
			aria-labelledby={headingId}>
			<div className="eb-json-card-header">
				<h2 id={headingId}>Payload</h2>
				{parsed ? (
					<span className="eb-dock-meta">
						{countLabel(parsed.valueCount, "value")}
					</span>
				) : null}
				{parsed && onValueAlignChange ? (
					<ChoiceGroup
						className="eb-json-value-align"
						ariaLabel="Value alignment"
						options={VALUE_ALIGN_OPTIONS}
						value={valueAlign}
						onChange={onValueAlignChange}
					/>
				) : null}
			</div>
			{showBodyHint(state) ? (
				<p className="eb-json-hint">
					This sample has a top-level <code>body</code> key. If you pasted the
					full output, choose <strong>Full output</strong>.
				</p>
			) : null}
			{parsed ? (
				<PayloadTree
					labelledBy={headingId}
					value={parsed.value}
					rootLabel={rootExpression(state)}
					expanded={state.expanded}
					showAll={state.showAll}
					selectedPath={state.selectedPath}
					onSelect={(path) => dispatch({ type: "select", path })}
					onToggle={(key) => dispatch({ type: "toggleExpanded", key })}
					onShowAll={(key) => dispatch({ type: "showAll", key })}
					reveal={reveal}
				/>
			) : (
				<div className="eb-json-empty">
					<p className="eb-json-empty-title">No sample yet</p>
					<p>Paste an action or trigger output from a flow run to parse it.</p>
				</div>
			)}
		</section>
	);
}
