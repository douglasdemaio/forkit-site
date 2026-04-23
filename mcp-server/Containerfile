FROM rust:1.82-slim-bookworm AS builder
WORKDIR /build

RUN apt-get update \
 && apt-get install -y --no-install-recommends pkg-config libssl-dev ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY Cargo.toml Cargo.lock ./
RUN mkdir -p src && echo "fn main() {}" > src/main.rs && cargo build --release && rm -rf src

COPY src ./src
RUN touch src/main.rs && cargo build --release

FROM debian:bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY --from=builder /build/target/release/forkme-mcp /usr/local/bin/forkme-mcp

ENV FORKIT_API_URL=http://host.docker.internal:3000
ENV RUST_LOG=info

EXPOSE 3001

ENTRYPOINT ["/usr/local/bin/forkme-mcp", "--transport", "sse", "--port", "3001"]
