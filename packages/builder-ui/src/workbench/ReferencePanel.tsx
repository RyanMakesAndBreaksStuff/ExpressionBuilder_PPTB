import { useEffect, useId, useState, type ReactNode } from "react";
import { ExpressionPreview } from "../components/ExpressionPreview";
import { CodeIcon, CopyIcon, InfoIcon } from "./icons/BuilderIcons";
import {
	NO_TEXT_ASSISTANCE,
	canCopy,
	copyText,
	fixedPositionNote,
	loopItemExpression,
	loopItemsExpression,
	rootExpression,
	type CopyFormat,
	type JsonReferenceState,
} from "./jsonReferenceState";
import { segmentLabel } from "./payloadTreeModel";

type InfoKey = "bare" | "item" | "items";

function InfoBtn({
	k,
	label,
	children,
	infoOpen,
	onToggle,
	onClose,
}: {
	k: InfoKey;
	label: string;
	children: ReactNode;
	infoOpen: InfoKey | null;
	onToggle: (k: InfoKey) => void;
	onClose: () => void;
}) {
	return (
		<span className="eb-copy-block-info-wrap">
			<button
				type="button"
				className={`eb-copy-block-info${infoOpen === k ? " is-open" : ""}`}
				aria-label={label}
				aria-expanded={infoOpen === k}
				onClick={() => onToggle(k)}
				onKeyDown={(e) => e.key === "Escape" && onClose()}>
				<InfoIcon aria-hidden />
			</button>
			{infoOpen === k && (
				<div className="eb-copy-block-popover" role="tooltip">
					{children}
				</div>
			)}
		</span>
	);
}

// Stable file-level component — prevents unmounting when the parent re-renders.
function CopyActions({
	bareLabel = "Copy",
	inlineLabel = "Copy @{}",
	onCopyBare,
	onCopyInline,
}: {
	bareLabel?: string;
	inlineLabel?: string;
	onCopyBare: () => void;
	onCopyInline: () => void;
}) {
	return (
		<div className="eb-copy-block-actions">
			<button
				type="button"
				className="eb-copy-action-btn eb-copy-action-inline"
				aria-label={inlineLabel}
				title="Paste into a text field (inline expression)"
				onClick={onCopyInline}>
				<span aria-hidden>{"@{}"}</span>
			</button>
			<button
				type="button"
				className="eb-copy-action-btn"
				aria-label={bareLabel}
				title="Paste directly into the formula editor"
				onClick={onCopyBare}>
				<CopyIcon aria-hidden />
			</button>
		</div>
	);
}

interface ReferencePanelProps {
	state: JsonReferenceState;
	onCopy: (format: CopyFormat) => void;
	onCopyText: (text: string) => void;
	onLoopNameChange: (value: string) => void;
}

export function ReferencePanel({
	onCopy,
	onCopyText,
	onLoopNameChange,
	state,
}: ReferencePanelProps) {
	const headingId = useId();
	const loopNameId = useId();
	const note = fixedPositionNote(state);
	const crumbs = [
		rootExpression(state),
		...state.selectedPath.map(segmentLabel),
	];
	const ready = canCopy(state);
	const itemExpr = loopItemExpression(state);
	const itemsExpr = loopItemsExpression(state);
	const wrap = (expr: string) => `@{${expr}}`;

	const [infoOpen, setInfoOpen] = useState<InfoKey | null>(null);
	const toggleInfo = (k: InfoKey) => setInfoOpen(infoOpen === k ? null : k);
	const closeInfo = () => setInfoOpen(null);

	useEffect(() => {
		if (!infoOpen) return;
		const close = (e: MouseEvent) => {
			if (!(e.target as Element).closest(".eb-copy-block-info-wrap"))
				setInfoOpen(null);
		};
		document.addEventListener("mousedown", close);
		return () => document.removeEventListener("mousedown", close);
	}, [infoOpen]);

	// ── Shared sub-views ─────────────────────────────────────────────────────

	const infoBtnProps = { infoOpen, onToggle: toggleInfo, onClose: closeInfo };

	return (
		<section
			className="eb-json-card eb-json-reference"
			aria-labelledby={headingId}>
			<div className="eb-json-card-header">
				<h2 id={headingId}>
					<CodeIcon aria-hidden="true" />
					Reference
				</h2>
			</div>
			<div className="eb-json-card-body">
				{state.parsed ? (
					<nav className="eb-json-breadcrumb" aria-label="Selected path">
						<ol>
							{crumbs.map((crumb, index) => (
								<li key={index}>
									{index > 0 ? (
										<span
											className="eb-json-crumb-separator"
											aria-hidden="true">
											›
										</span>
									) : null}
									<span className="eb-json-crumb">{crumb}</span>
								</li>
							))}
						</ol>
					</nav>
				) : null}

				{ready ? (
					<div className="eb-json-copy-blocks">
						<div className="eb-json-copy-block">
							<div className="eb-copy-block-header">
								<span className="eb-json-copy-block-label">
									Reference
									<InfoBtn k="bare" label="Reference info" {...infoBtnProps}>
										<strong>Copy</strong> pastes the bare expression into the
										expression editor. <strong>Copy @{"{}"}</strong> wraps it
										for embedding inside a text field.
									</InfoBtn>
								</span>
								<CopyActions
									onCopyBare={() => onCopy("bare")}
									onCopyInline={() => onCopy("inline")}
								/>
							</div>
							<ExpressionPreview
								expression={copyText(state, "bare")!}
								label="Reference expression"
							/>
						</div>
						{note ? <p className="eb-json-note">{note}</p> : null}
						{itemExpr !== null && (
							<div className="eb-json-copy-block">
								<div className="eb-copy-block-header">
									<span className="eb-json-copy-block-label">
										Apply to each — item()
										<InfoBtn k="item" label="item() info" {...infoBtnProps}>
											Use inside an <strong>Apply to each</strong> loop body.
										</InfoBtn>
									</span>
									<CopyActions
										bareLabel="Copy item()"
										inlineLabel="Copy item() @{}"
										onCopyBare={() => onCopyText(itemExpr)}
										onCopyInline={() => onCopyText(wrap(itemExpr))}
									/>
								</div>
								<ExpressionPreview
									expression={itemExpr}
									label="Loop item() reference"
								/>
							</div>
						)}

						{itemExpr !== null && (
							<div className="eb-json-copy-block">
								<div className="eb-copy-block-header">
									<span className="eb-json-copy-block-label">
										Apply to each — items()
										<InfoBtn k="items" label="items() info" {...infoBtnProps}>
											<code>items()</code> reads the current item of the named{" "}
											<strong>Apply to each</strong>, so it still works inside a
											nested loop.
										</InfoBtn>
									</span>
									{itemsExpr !== null && (
										<CopyActions
											bareLabel="Copy items()"
											inlineLabel="Copy items() @{}"
											onCopyBare={() => onCopyText(itemsExpr)}
											onCopyInline={() => onCopyText(wrap(itemsExpr))}
										/>
									)}
								</div>
								<div className="eb-json-field">
									<label className="eb-label" htmlFor={loopNameId}>
										Loop name
									</label>
									<input
										{...NO_TEXT_ASSISTANCE}
										id={loopNameId}
										className="eb-input"
										value={state.loopName}
										aria-describedby={`${loopNameId}-help`}
										onChange={(event) => onLoopNameChange(event.target.value)}
									/>
									<p id={`${loopNameId}-help`} className="eb-json-help">
										The Apply to each name as shown in the flow designer, not
										the source action. Spaces become underscores.
									</p>
								</div>
								{itemsExpr !== null && (
									<ExpressionPreview
										expression={itemsExpr}
										label="Loop items() reference"
									/>
								)}
							</div>
						)}
					</div>
				) : null}
			</div>
		</section>
	);
}
