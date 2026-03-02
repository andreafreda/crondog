#!/bin/sh
echo "======================================"
echo "Hello World!"
echo "Timestamp: $(date)"
echo "======================================"

# Random exit: 0 (success) or 1 (failure) with 50% probability
RANDOM_NUM=$(shuf -i 0-99 -n 1 2>/dev/null || awk 'BEGIN{srand(); print int(rand()*100)}')
if [ "$RANDOM_NUM" -lt 50 ]; then
  echo "Result: SUCCESS (exit 0)"
  exit 0
else
  echo "Result: FAILURE (exit 1)"
  exit 1
fi
