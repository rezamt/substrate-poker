# Blockchain Poker Node

## Building the project

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
./scripts/build.sh --release
```

Build all native code:

```bash
cargo build --release
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

# Tests

You can run tests with `cargo test --all`
