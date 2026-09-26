#!/usr/bin/env bash
# Verify writing-skills compliance for all SDD skills
PASS=0
FAIL=0

check_words() {
  local f="$1" max="$2"
  local count=$(wc -w < "$f")
  local name=$(basename $(dirname "$f"))
  if [ "$count" -gt "$max" ]; then
    echo "FAIL [word-count] $name: $count words (max $max)"
    FAIL=$((FAIL+1))
  else
    echo "PASS [word-count] $name: $count words"
    PASS=$((PASS+1))
  fi
}

check_section() {
  local f="$1" section="$2"
  local name=$(basename $(dirname "$f"))
  if ! grep -q "$section" "$f"; then
    echo "FAIL [structure] $name: missing '$section'"
    FAIL=$((FAIL+1))
  else
    PASS=$((PASS+1))
  fi
}

check_description() {
  local f="$1"
  local name=$(basename $(dirname "$f"))
  # Check length
  local desc_line=$(grep "^description:" "$f" | head -1)
  local len=${#desc_line}
  if [ "$len" -gt 1024 ]; then
    echo "FAIL [description-length] $name: description >1024 chars"
    FAIL=$((FAIL+1))
  else
    PASS=$((PASS+1))
  fi
  # Check CSO: must start with "Use when" (case-insensitive)
  if ! echo "$desc_line" | grep -qi "use when"; then
    echo "FAIL [description-cso] $name: description does not start with 'Use when'"
    FAIL=$((FAIL+1))
  else
    PASS=$((PASS+1))
  fi
  # Check no workflow summary indicators
  if echo "$desc_line" | grep -qiE "(dispatches|guides|creates|invoked by|called by|presents options)"; then
    echo "FAIL [description-workflow] $name: description may contain workflow summary"
    FAIL=$((FAIL+1))
  else
    PASS=$((PASS+1))
  fi
}

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

# FR-1: writing-skills must exist in skills/
if [ -d "$ROOT/skills/writing-skills" ]; then
  PASS=$((PASS+1)); echo "PASS [fr1] skills/writing-skills exists"
else
  FAIL=$((FAIL+1)); echo "FAIL [fr1] skills/writing-skills missing"
fi
if [ -d "$ROOT/writing-skills" ]; then
  FAIL=$((FAIL+1)); echo "FAIL [fr1] writing-skills/ still at repo root"
else
  PASS=$((PASS+1)); echo "PASS [fr1] writing-skills/ removed from root"
fi

# FR-2: description checks for all skills
for f in "$ROOT/skills"/*/SKILL.md; do
  check_description "$f"
done

# FR-3: word count checks
check_words "$ROOT/skills/sdd-workflow/SKILL.md" 200
for f in "$ROOT/skills"/*/SKILL.md; do
  name=$(basename $(dirname "$f"))
  [ "$name" = "sdd-workflow" ] && continue
  [ "$name" = "subagent-driven-development" ] && continue
  [ "$name" = "systematic-debugging" ] && continue
  [ "$name" = "test-driven-development" ] && continue
  [ "$name" = "writing-skills" ] && continue
  check_words "$f" 500
done

# FR-3: content preservation — combined word count (SKILL.md + reference files) >= 80% of original
# (baseline counts stored in baseline_wordcounts.txt during Phase 0)
if [ -f "$ROOT/docs/specs/004-apply-writing-skills-best-practices/baseline_wordcounts.txt" ]; then
  while IFS=',' read -r skill original; do
    skill_dir="$ROOT/skills/$skill"
    combined=0
    for f in "$skill_dir"/*.md; do
      [ -f "$f" ] && combined=$((combined + $(wc -w < "$f")))
    done
    threshold=$(( original * 80 / 100 ))
    if [ "$combined" -lt "$threshold" ]; then
      echo "FAIL [content-preservation] $skill: combined $combined words < 80% of original $original"
      FAIL=$((FAIL+1))
    else
      PASS=$((PASS+1))
    fi
  done < "$ROOT/docs/specs/004-apply-writing-skills-best-practices/baseline_wordcounts.txt"
fi

# FR-4: required sections
DISCIPLINE_SKILLS="test-driven-development verification-before-completion sdd-workflow systematic-debugging"
for f in "$ROOT/skills"/*/SKILL.md; do
  name=$(basename $(dirname "$f"))
  [ "$name" = "subagent-driven-development" ] && continue
  [ "$name" = "systematic-debugging" ] && continue
  [ "$name" = "test-driven-development" ] && continue
  check_section "$f" "## Overview"
  check_section "$f" "## When to Use"
  check_section "$f" "## Quick Reference"
  for d in $DISCIPLINE_SKILLS; do
    [ "$name" = "$d" ] && check_section "$f" "## Common Mistakes"
  done
done

# FR-4: no placeholder text
for f in "$ROOT/skills"/*/SKILL.md; do
  name=$(basename $(dirname "$f"))
  if grep -qiE "\bTODO\b|\bTBD\b|as needed|as appropriate" "$f"; then
    echo "FAIL [placeholder] $name: contains TODO/TBD/placeholder text"
    FAIL=$((FAIL+1))
  else
    PASS=$((PASS+1))
  fi
done

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
