#!/usr/bin/env bash
set -euo pipefail

SKILLS_DIR="skills"
ERRORS=0
SKILL_COUNT=0

PHASE1_SKILLS=(
  "test-driven-development"
  "systematic-debugging"
  "verification-before-completion"
  "sdd-specify"
  "sdd-execute"
  "sdd-brainstorm"
  "requesting-code-review"
)

for skill_dir in "$SKILLS_DIR"/*/; do
  skill_name=$(basename "$skill_dir")
  if [ "$skill_name" = "writing-skills" ]; then continue; fi

  skill_file="$skill_dir/SKILL.md"
  if [ ! -f "$skill_file" ]; then continue; fi
  SKILL_COUNT=$((SKILL_COUNT + 1))

  lines=$(wc -l < "$skill_file")
  if [ "$lines" -gt 500 ]; then
    echo "FAIL [$skill_name]: $lines lines (exceeds 500)"
    ERRORS=$((ERRORS + 1))
  fi

  if ! grep -q "<examples>" "$skill_file"; then
    echo "FAIL [$skill_name]: missing <examples> block"
    ERRORS=$((ERRORS + 1))
  fi

  is_phase1=false
  for p1 in "${PHASE1_SKILLS[@]}"; do
    if [ "$skill_name" = "$p1" ]; then is_phase1=true; break; fi
  done
  if $is_phase1; then
    example_count=$(grep -c "<example>" "$skill_file" || true)
    if [ "$example_count" -lt 2 ]; then
      echo "FAIL [$skill_name]: Phase 1 skill has $example_count <example> entries (need >= 2)"
      ERRORS=$((ERRORS + 1))
    fi
  fi

  if ! grep -q "^## Constraints" "$skill_file"; then
    echo "FAIL [$skill_name]: missing ## Constraints section"
    ERRORS=$((ERRORS + 1))
  fi

  if ! grep -q "^## Error Handling" "$skill_file"; then
    echo "FAIL [$skill_name]: missing ## Error Handling section"
    ERRORS=$((ERRORS + 1))
  fi

  if grep -q "^## Constraints" "$skill_file" && grep -q "^## Error Handling" "$skill_file"; then
    constraints_line=$(grep -n "^## Constraints" "$skill_file" | head -1 | cut -d: -f1)
    error_line=$(grep -n "^## Error Handling" "$skill_file" | head -1 | cut -d: -f1)
    if [ "$error_line" -lt "$constraints_line" ]; then
      echo "FAIL [$skill_name]: ## Error Handling appears before ## Constraints"
      ERRORS=$((ERRORS + 1))
    fi
  fi

  if ! grep -q "User requests gate bypass" "$skill_file"; then
    echo "FAIL [$skill_name]: missing 'User requests gate bypass' in Error Handling"
    ERRORS=$((ERRORS + 1))
  fi

done

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo "TOTAL: $ERRORS failure(s)"
  exit 1
else
  echo "All $SKILL_COUNT skills pass structural validation."
fi
