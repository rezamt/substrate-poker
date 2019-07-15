# Blockchain Poker Node

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

# Tests

You can run tests with `cargo test --all`
