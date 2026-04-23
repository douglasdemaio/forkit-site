mod api;
mod server;
mod types;

use anyhow::Result;
use clap::{Parser, ValueEnum};
use rmcp::{transport::sse_server::SseServer, transport::stdio, ServiceExt};
use std::net::SocketAddr;
use tracing_subscriber::EnvFilter;

#[derive(Clone, Debug, ValueEnum)]
enum Transport {
    Stdio,
    Sse,
}

#[derive(Parser, Debug)]
#[command(name = "forkme-mcp", version, about = "MCP server for ForkIt")]
struct Args {
    #[arg(long, value_enum, default_value_t = Transport::Stdio)]
    transport: Transport,

    #[arg(long, default_value_t = 3001)]
    port: u16,

    #[arg(long, env = "FORKIT_API_URL", default_value = "http://localhost:3000")]
    api_url: String,

    #[arg(long, env = "FORKIT_JWT_TOKEN")]
    jwt_token: Option<String>,
}

#[tokio::main]
async fn main() -> Result<()> {
    let _ = dotenvy::dotenv();

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")))
        .with_writer(std::io::stderr)
        .init();

    let args = Args::parse();
    tracing::info!(
        api_url = %args.api_url,
        transport = ?args.transport,
        "starting forkme-mcp"
    );

    let api = api::ApiClient::new(args.api_url.clone(), args.jwt_token.clone());

    match args.transport {
        Transport::Stdio => {
            let srv = server::ForkItServer::new(api);
            let service = srv.serve(stdio()).await?;
            service.waiting().await?;
        }
        Transport::Sse => {
            let bind: SocketAddr = format!("0.0.0.0:{}", args.port).parse()?;
            tracing::info!(%bind, "SSE server listening");
            let ct = SseServer::serve(bind)
                .await?
                .with_service(move || server::ForkItServer::new(api.clone()));
            tokio::signal::ctrl_c().await?;
            tracing::info!("shutting down");
            ct.cancel();
        }
    }

    Ok(())
}
