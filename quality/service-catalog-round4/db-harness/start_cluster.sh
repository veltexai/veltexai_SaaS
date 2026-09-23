#!/usr/bin/env bash
# Dedicated disposable cluster only; refuses an existing unmarked directory.
set -euo pipefail
: "${HARNESS_PGDATA:?Choose a new /tmp/veltex-catalog-* directory}"
case "$HARNESS_PGDATA" in /tmp/veltex-catalog-*) ;; *) echo 'Refusing non-harness directory' >&2; exit 2;; esac
PG_BIN="${PG_BIN:-/usr/lib/postgresql/16/bin}"
if [ "${1:-start}" = stop ]; then
  test -f "$HARNESS_PGDATA/.veltex-disposable"
  "$PG_BIN/pg_ctl" -D "$HARNESS_PGDATA/data" stop
  exit 0
fi
if [ -e "$HARNESS_PGDATA" ]; then echo 'Choose a fresh harness directory' >&2; exit 2; fi
umask 077
mkdir "$HARNESS_PGDATA"
"$PG_BIN/initdb" -D "$HARNESS_PGDATA/data" -A trust -U "$(id -un)" >/dev/null
touch "$HARNESS_PGDATA/.veltex-disposable"
"$PG_BIN/pg_ctl" -D "$HARNESS_PGDATA/data" -o "-p ${PGPORT:-55432} -k $HARNESS_PGDATA -c listen_addresses=''" -l "$HARNESS_PGDATA/log" start
