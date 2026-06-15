# ForkIt MCP Server

Rust MCP (Model Context Protocol) server that exposes the ForkIt API to AI agents over stdio or SSE.

## Quick Start

```bash
docker compose up --build
```

## Build & Run

```bash
cargo build --release
./target/release/forkit-mcp-server
```

## Deployment

See `k8s/` for Kubernetes manifests.
