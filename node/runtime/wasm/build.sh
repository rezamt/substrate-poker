#!/usr/bin/env bash
set -e

if [ -z "$1" ]
then
        echo "No Cargo parameters, treating as DEBUG mode"
	MODE="debug"
else
        echo "Non-empty Cargo parameters, treating as RELEASE mode"
	MODE="release"
fi

if cargo --version | grep -q "nightly"; then
	CARGO_CMD="cargo"
else
	CARGO_CMD="cargo +nightly"
fi

echo "Cargo parameters: '$@'"
$CARGO_CMD build $@ --target=wasm32-unknown-unknown
for i in poker_runtime_wasm
do
	wasm-gc target/wasm32-unknown-unknown/$MODE/$i.wasm target/wasm32-unknown-unknown/$MODE/$i.compact.wasm
done
