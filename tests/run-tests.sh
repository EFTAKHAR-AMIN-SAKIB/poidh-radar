#!/usr/bin/env bash
# Run every suite against the shipped file. Exits non-zero if anything fails.
set -uo pipefail
cd "$(dirname "$0")"

TOTAL_PASS=0
TOTAL_FAIL=0
BAD=0

for t in test-core.mjs test-net.mjs test-ui.mjs test-resilience.mjs test-blackout.mjs test-flaky.mjs test-static.mjs; do
  out=$(timeout 180 node "$t" 2>&1)
  code=$?
  line=$(printf '%s\n' "$out" | grep -E '^PASS ' | tail -1)
  p=$(printf '%s\n' "$line" | sed -nE 's/^PASS ([0-9]+).*/\1/p')
  f=$(printf '%s\n' "$line" | sed -nE 's/.*FAIL ([0-9]+).*/\1/p')
  p=${p:-0}; f=${f:-0}
  TOTAL_PASS=$((TOTAL_PASS + p))
  TOTAL_FAIL=$((TOTAL_FAIL + f))
  if [ "$code" -ne 0 ] || [ "$f" -ne 0 ]; then
    BAD=1
    printf '%-16s FAIL  (pass %s, fail %s, exit %s)\n' "$t" "$p" "$f" "$code"
    printf '%s\n' "$out" | grep -A40 'FAILURES:'
    printf '%s\n' "$out" | grep -A20 'RUNTIME ERRORS:'
  else
    printf '%-16s ok    (%s assertions)\n' "$t" "$p"
  fi
done

echo "─────────────────────────────────────────────"
echo "TOTAL  pass $TOTAL_PASS   fail $TOTAL_FAIL"
[ "$BAD" -eq 0 ] && echo "all suites green" || echo "SOMETHING FAILED"
exit $BAD
