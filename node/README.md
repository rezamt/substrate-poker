# Blockchain Poker Node

After building, run `./heads-up.sh` for running two nodes, one for Alice and one for Bob.

You can check status of launched processes with `./status.sh`.

# Building

Install Rust:

```bash
curl https://sh.rustup.rs -sSf | sh
```

Install required tools:

```bash
./scripts/init.sh
```

Build the WebAssembly binary:

```bash
./scripts/build.sh
```

Build all native code:

```bash
cargo build
```
