use crate::api::ApiClient;
use rmcp::{
    model::{
        Implementation, ProtocolVersion, ServerCapabilities, ServerInfo,
    },
    schemars,
    tool, ServerHandler,
};
use serde::{Deserialize, Serialize};

#[derive(Clone)]
pub struct ForkItServer {
    api: ApiClient,
}

impl ForkItServer {
    pub fn new(api: ApiClient) -> Self {
        Self { api }
    }
}

#[derive(Debug, Deserialize, Serialize, schemars::JsonSchema)]
pub struct CreateOrderRequest {
    #[schemars(description = "Restaurant ID to order from")]
    pub restaurant_id: String,
    #[schemars(description = "Items to order, each an object like { menuItemId: string, quantity: number }")]
    pub items: Vec<serde_json::Value>,
    #[schemars(description = "Optional delivery address")]
    pub delivery_address: Option<String>,
}

fn to_json_string<T: serde::Serialize>(v: &T) -> String {
    serde_json::to_string_pretty(v).unwrap_or_else(|e| format!("{{\"error\":\"serialize: {}\"}}", e))
}

#[tool(tool_box)]
impl ForkItServer {
    #[tool(description = "List all published restaurants with optional search, pagination")]
    async fn list_restaurants(
        &self,
        #[tool(param)]
        #[schemars(description = "Optional text to search restaurant names")]
        search: Option<String>,
        #[tool(param)]
        #[schemars(description = "Page number (1-indexed)")]
        page: Option<u32>,
        #[tool(param)]
        #[schemars(description = "Number of items per page")]
        limit: Option<u32>,
    ) -> String {
        match self
            .api
            .list_restaurants(search.as_deref(), page, limit)
            .await
        {
            Ok(v) => to_json_string(&v),
            Err(e) => format!("{{\"error\":\"{}\"}}", e),
        }
    }

    #[tool(description = "Get a single restaurant by ID or slug")]
    async fn get_restaurant(
        &self,
        #[tool(param)]
        #[schemars(description = "Restaurant ID or slug")]
        id_or_slug: String,
    ) -> String {
        match self.api.get_restaurant(&id_or_slug).await {
            Ok(v) => to_json_string(&v),
            Err(e) => format!("{{\"error\":\"{}\"}}", e),
        }
    }

    #[tool(description = "Get full order details by ID (requires auth)")]
    async fn get_order(
        &self,
        #[tool(param)]
        #[schemars(description = "Order ID")]
        id: String,
    ) -> String {
        match self.api.get_order(&id).await {
            Ok(v) => to_json_string(&v),
            Err(e) => format!("{{\"error\":\"{}\"}}", e),
        }
    }

    #[tool(description = "Get escrow funding info for an order (public)")]
    async fn get_order_funding(
        &self,
        #[tool(param)]
        #[schemars(description = "Order ID")]
        id: String,
    ) -> String {
        match self.api.get_order_funding(&id).await {
            Ok(v) => to_json_string(&v),
            Err(e) => format!("{{\"error\":\"{}\"}}", e),
        }
    }

    #[tool(description = "Get a driver's public profile by wallet address")]
    async fn get_driver_profile(
        &self,
        #[tool(param)]
        #[schemars(description = "Driver's Solana wallet address")]
        wallet: String,
    ) -> String {
        match self.api.get_driver_profile(&wallet).await {
            Ok(v) => to_json_string(&v),
            Err(e) => format!("{{\"error\":\"{}\"}}", e),
        }
    }

    #[tool(description = "Request a login nonce for a given wallet — to be signed by the wallet for authentication")]
    async fn get_nonce(
        &self,
        #[tool(param)]
        #[schemars(description = "Solana wallet address")]
        wallet: String,
    ) -> String {
        match self.api.get_nonce(&wallet).await {
            Ok(v) => to_json_string(&v),
            Err(e) => format!("{{\"error\":\"{}\"}}", e),
        }
    }

    #[tool(description = "Set the JWT auth token used by subsequent authenticated API calls")]
    async fn set_auth_token(
        &self,
        #[tool(param)]
        #[schemars(description = "JWT bearer token obtained from /api/auth/verify")]
        token: String,
    ) -> String {
        self.api.set_token(token).await;
        "Auth token set".to_string()
    }

    #[tool(description = "Create a new order (requires auth). Items: array of { menuItemId, quantity }")]
    async fn create_order(&self, #[tool(aggr)] req: CreateOrderRequest) -> String {
        match self
            .api
            .create_order(&req.restaurant_id, &req.items, req.delivery_address.as_deref())
            .await
        {
            Ok(v) => to_json_string(&v),
            Err(e) => format!("{{\"error\":\"{}\"}}", e),
        }
    }

    #[tool(description = "Get the orders belonging to the authenticated wallet")]
    async fn get_my_orders(&self) -> String {
        match self.api.get_my_orders().await {
            Ok(v) => to_json_string(&v),
            Err(e) => format!("{{\"error\":\"{}\"}}", e),
        }
    }

    #[tool(description = "Contribute (escrow pay) to an order's funding pool (requires auth)")]
    async fn contribute_to_order(
        &self,
        #[tool(param)]
        #[schemars(description = "Order ID")]
        order_id: String,
        #[tool(param)]
        #[schemars(description = "Amount to contribute, in the order's currency")]
        amount: f64,
        #[tool(param)]
        #[schemars(description = "Solana transaction signature proving the on-chain payment")]
        tx_signature: String,
    ) -> String {
        match self
            .api
            .contribute_to_order(&order_id, amount, &tx_signature)
            .await
        {
            Ok(v) => to_json_string(&v),
            Err(e) => format!("{{\"error\":\"{}\"}}", e),
        }
    }

    #[tool(description = "Verify delivery code (code B) — completes the order (requires auth)")]
    async fn verify_delivery(
        &self,
        #[tool(param)]
        #[schemars(description = "Order ID")]
        order_id: String,
        #[tool(param)]
        #[schemars(description = "Delivery code (code B)")]
        code_b: String,
    ) -> String {
        match self.api.verify_delivery(&order_id, &code_b).await {
            Ok(v) => to_json_string(&v),
            Err(e) => format!("{{\"error\":\"{}\"}}", e),
        }
    }

    #[tool(description = "Generate a shareable link for an order (requires auth)")]
    async fn get_order_share_link(
        &self,
        #[tool(param)]
        #[schemars(description = "Order ID")]
        order_id: String,
    ) -> String {
        match self.api.get_order_share_link(&order_id).await {
            Ok(v) => to_json_string(&v),
            Err(e) => format!("{{\"error\":\"{}\"}}", e),
        }
    }

    #[tool(description = "Get orders available for drivers to bid on (requires driver auth)")]
    async fn get_available_orders(&self) -> String {
        match self.api.get_available_orders().await {
            Ok(v) => to_json_string(&v),
            Err(e) => format!("{{\"error\":\"{}\"}}", e),
        }
    }

    #[tool(description = "Place a bid to deliver an order as a driver (requires driver auth)")]
    async fn place_driver_bid(
        &self,
        #[tool(param)]
        #[schemars(description = "Order ID")]
        order_id: String,
    ) -> String {
        match self.api.place_driver_bid(&order_id).await {
            Ok(v) => to_json_string(&v),
            Err(e) => format!("{{\"error\":\"{}\"}}", e),
        }
    }

    #[tool(description = "Verify pickup code (code A) at the restaurant (requires assigned driver auth)")]
    async fn verify_pickup(
        &self,
        #[tool(param)]
        #[schemars(description = "Order ID")]
        order_id: String,
        #[tool(param)]
        #[schemars(description = "Pickup code (code A)")]
        code_a: String,
    ) -> String {
        match self.api.verify_pickup(&order_id, &code_a).await {
            Ok(v) => to_json_string(&v),
            Err(e) => format!("{{\"error\":\"{}\"}}", e),
        }
    }

    #[tool(description = "Update the status of an order (requires restaurant owner auth)")]
    async fn update_order_status(
        &self,
        #[tool(param)]
        #[schemars(description = "Order ID")]
        order_id: String,
        #[tool(param)]
        #[schemars(description = "New status: e.g. 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled'")]
        status: String,
    ) -> String {
        match self.api.update_order_status(&order_id, &status).await {
            Ok(v) => to_json_string(&v),
            Err(e) => format!("{{\"error\":\"{}\"}}", e),
        }
    }

    #[tool(description = "Accept a driver's bid to deliver an order (requires restaurant owner auth)")]
    async fn accept_driver_bid(
        &self,
        #[tool(param)]
        #[schemars(description = "Order ID")]
        order_id: String,
        #[tool(param)]
        #[schemars(description = "Bid ID to accept")]
        bid_id: String,
    ) -> String {
        match self.api.accept_driver_bid(&order_id, &bid_id).await {
            Ok(v) => to_json_string(&v),
            Err(e) => format!("{{\"error\":\"{}\"}}", e),
        }
    }

    #[tool(description = "Rate the driver who delivered an order (1-5 stars) (requires customer/restaurant auth)")]
    async fn rate_driver(
        &self,
        #[tool(param)]
        #[schemars(description = "Order ID")]
        order_id: String,
        #[tool(param)]
        #[schemars(description = "Rating from 1 to 5")]
        rating: u8,
        #[tool(param)]
        #[schemars(description = "Optional comment")]
        comment: Option<String>,
    ) -> String {
        match self
            .api
            .rate_driver(&order_id, rating, comment.as_deref())
            .await
        {
            Ok(v) => to_json_string(&v),
            Err(e) => format!("{{\"error\":\"{}\"}}", e),
        }
    }
}

#[tool(tool_box)]
impl ServerHandler for ForkItServer {
    fn get_info(&self) -> ServerInfo {
        ServerInfo {
            protocol_version: ProtocolVersion::V_2024_11_05,
            capabilities: ServerCapabilities::builder().enable_tools().build(),
            server_info: Implementation {
                name: "forkme-mcp".to_string(),
                version: "0.1.0".to_string(),
            },
            instructions: Some(
                "ForkIt MCP server — an AI interface to the ForkIt food delivery platform. \
                 Browse restaurants and menus, place orders paid via Solana escrow, track \
                 order status, contribute to shared escrows, bid on deliveries as a driver, \
                 verify pickup/delivery codes, and rate drivers. \
                 Most mutation tools require an auth token — call set_auth_token first with a \
                 JWT obtained by signing a nonce with your Solana wallet."
                    .to_string(),
            ),
        }
    }
}
