# Memory Index

- [Release process](feedback_release_process.md) — release checklist: branch, changelog, README, version bump in BOTH plugin.json and marketplace.json, tag, push
- [CLAUDE.md template guidance](feedback_claude_md_template.md) — sdd-init template should give project context first and use SDD selectively, not blanket-invoke sdd-workflow
- [sdd-execute subagent dispatch](feedback_sdd_execute_subagent_dispatch.md) — always dispatch subagents per work unit in sdd-execute, never implement directly even for prose edits
- [Review: intermediate-phase state](feedback_review_intermediate_phase_state.md) — multi-phase same-session skill builds look "inconsistent" mid-build; check if it resolves by the final phase before fixing
- [ExitWorktree not proactive](feedback_exit_worktree_not_proactive.md) — don't call ExitWorktree just because a skill's standard flow calls for cleanup; only when the user asks
- [Superpowers consolidation pattern](feedback_superpowers_consolidation_pattern.md) — fold reintroduced superpowers capabilities into the existing consolidated skill and keep them opt-in, but always ask first
- [sdd-execute worktree branch rename](feedback_sdd_execute_worktree_branch_rename.md) — sdd-execute's branch gate only rejects main/master; rename EnterWorktree's auto-generated branch to match branch_pattern before dispatching implementers
