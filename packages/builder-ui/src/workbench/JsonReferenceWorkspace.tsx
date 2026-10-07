import { useEffect, useId, useRef, type Dispatch } from "react";
import type { PlatformAdapter } from "@ryanmakes/eb_platformadapter";
import { JsonSourcePane } from "./JsonSourcePane";
import { PayloadTree } from "./PayloadTree";
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

interface JsonReferenceWorkspaceProps {
	adapter: PlatformAdapter;
	/** False while another screen is selected; the workspace stays mounted so its state survives (FR-008). */
	active: boolean;
	state: JsonReferenceState;
	dispatch: Dispatch<JsonReferenceAction>;
}

export function JsonReferenceWorkspace({
	active,
	adapter,
	state,
	dispatch,
}: JsonReferenceWorkspaceProps) {
	const autoParseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);
	const prevParsedText = useRef<string | undefined>(undefined);

	useEffect(() => () => clearTimeout(autoParseTimer.current), []);

	// Notify the host when a parse succeeds with new content.
	useEffect(() => {
		if (state.parsed && state.parsed.text !== prevParsedText.current) {
			prevParsedText.current = state.parsed.text;
			void adapter.notify(
				`Parsed · ${countLabel(state.parsed.valueCount, "value")}`,
				"success",
			);
		}
	}, [adapter, state.parsed]);

	// Auto-parse after a short delay when text is edited manually.
	useEffect(() => {
		if (!state.text.trim() || state.text === state.parsed?.text) return;
		clearTimeout(autoParseTimer.current);
		autoParseTimer.current = setTimeout(() => dispatch({ type: "parse" }), 600);
		return () => clearTimeout(autoParseTimer.current);
	}, [state.text, state.parsed?.text, dispatch]);

	// Clear any pending auto-parse when leaving the tab.
	useEffect(() => {
		if (active) return;
		clearTimeout(autoParseTimer.current);
	}, [active]);

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
				<PayloadPanel state={state} dispatch={dispatch} />
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
}

function PayloadPanel({ dispatch, state }: PayloadPanelProps) {
	const headingId = useId();
	const { parsed } = state;

	return (
		<section
			className="eb-json-card eb-json-payload"
			aria-labelledby={headingId}>
			<div className="eb-json-card-header">
				<h2 id={headingId}>Payload</h2>
				{parsed ? (
					<span className="eb-dock-meta">
						{countLabel(parsed.valueCount, "value")}
					</span>
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
