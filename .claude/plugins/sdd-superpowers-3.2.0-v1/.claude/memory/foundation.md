# SDD Superpowers Foundation

> Loaded every session. To amend, follow the Amendment Process below.

## Mission

SDD Superpowers exists to make Specification-Driven Development the default workflow
for any developer using Claude Code — enforcing discipline through skills and gates
so specs remain the source of truth and code is their generated expression.

## Principles

1. Every change — to skills, code, or principles — begins with an approved specification.
2. Every task has a prior failing test before any implementation code is written.
3. No completion is claimed without fresh verification evidence.
4. Gates are enforced unconditionally — they apply under time pressure and cannot be bypassed.
5. Skills remain faithful to the discipline they describe — skill prose and enforcement behavior stay synchronized.

## Operational Context

Steering files in `.claude/memory/steering/` carry project-specific operational context
(tech stack, test strategy, conventions, team practices). Each file's `loaded-by`
frontmatter lists which skills silently incorporate it during that skill's session.
Edit steering files freely — they are not subject to the amendment process.

## Amendment Process

Any change to a principle requires: written rationale documenting why the change is
needed, explicit team approval, and a backwards-compatibility check confirming that
existing specifications still hold under the amended principle.
