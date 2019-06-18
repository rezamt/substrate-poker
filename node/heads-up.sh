#!/bin/bash
cargo run -- \
  --base-path /tmp/alice \
  --chain=local \
  --alice \
  --port 30333 \
  --ws-port 9944 \
  --node-key 0000000000000000000000000000000000000000000000000000000000000001 \
  --telemetry-url ws://telemetry.polkadot.io:1024 \
  --validator &> alice.log &

echo $! > alice.pid

cargo run -- \
  --base-path /tmp/bob \
  --bootnodes /ip4/127.0.0.1/tcp/30333/p2p/QmRpheLN4JWdAnY7HGJfWFNbfkQCb6tFf4vvA6hgjMZKrR \
  --chain=local \
  --bob \
  --port 30334 \
  --ws-port 9945 \
  --telemetry-url ws://telemetry.polkadot.io:1024 \
  --validator &> bob.log &

echo $! > bob.pid

tail -f alice.log bob.log
