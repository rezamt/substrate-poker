# Blockchain Poker Node

## Building the project

Install Rust:

```bash
curl https://sh.rustup.rs -sSf | sh
```

**Make sure** that you have installed required versions of toolchains:

```bash
./scripts/init.sh
```

Build the WebAssembly binary:

```bash
./scripts/build.sh --release
```

Build all native code:

```bash
cargo build --release
```

## Running the tests

```bash
cargo test --all --release
```

## Running the node

This will start backend in development mode with preconfigured accounts:

```bash
./target/release/poker --dev
```

In case you want to clear state of the blockchain, run this:

```bash
./target/release/poker purge-chain --dev
```
