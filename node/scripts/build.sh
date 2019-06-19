#!/usr/bin/env bash

set -e

PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." >/dev/null && pwd )"

export CARGO_INCREMENTAL=0

bold=$(tput bold)
normal=$(tput sgr0)

# Save current directory.
pushd . >/dev/null

if [ "$1" = "--debug" ]
then
    FLAG=""
else
    FLAG="--release"
fi

for SRC in runtime/wasm
do
  echo "${bold}Building webassembly binary in $SRC...${normal}"
  cd "$PROJECT_ROOT/$SRC"

  ./build.sh $FLAG

  cd - >> /dev/null
done

# Restore initial directory.
popd >/dev/null
