#!/bin/sh
echo "======================================"
echo "Hello World!"
echo "Timestamp: $(date)"
echo "======================================"

# Random exit: 0 (success) o 1 (failure) con 50% di probabilità
RANDOM_NUM=$(shuf -i 0-99 -n 1 2>/dev/null || awk 'BEGIN{srand(); print int(rand()*100)}')
if [ "$RANDOM_NUM" -lt 50 ]; then
  echo "Esito: SUCCESSO (exit 0)"
  exit 0
else
  echo "Esito: FALLIMENTO (exit 1)"
  exit 1
fi
