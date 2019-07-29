#!/usr/bin/env bash

set -e

echo "*** Initializing WASM build environment"

if [ -z $CI_PROJECT_NAME ] ; then
   rustup install $(cat wasm.toolchain)
   rustup update stable
fi

rustup target add wasm32-unknown-unknown --toolchain $(cat wasm.toolchain)

# Install wasm-gc. It's useful for stripping slimming down wasm binaries.
command -v wasm-gc || \
	cargo +$(cat wasm.toolchain) install --git https://github.com/alexcrichton/wasm-gc --force
