use anyhow::{anyhow, Result};
use reqwest::{Client, Method, RequestBuilder};
use serde_json::{json, Value};
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Clone)]
pub struct ApiClient {
    http: Client,
    base_url: String,
    auth_token: Arc<Mutex<Option<String>>>,
}

impl ApiClient {
    pub fn new(base_url: String, initial_token: Option<String>) -> Self {
        Self {
            http: Client::builder()
                .user_agent("forkme-mcp/0.1.0")
                .build()
                .expect("failed to build reqwest client"),
            base_url,
            auth_token: Arc::new(Mutex::new(initial_token)),
        }
    }

    pub async fn set_token(&self, token: String) {
        *self.auth_token.lock().await = Some(token);
    }

    fn url(&self, path: &str) -> String {
        format!("{}{}", self.base_url.trim_end_matches('/'), path)
    }

    async fn build(&self, method: Method, path: &str, auth: bool) -> RequestBuilder {
        let mut req = self.http.request(method, self.url(path));
        if auth {
            if let Some(tok) = self.auth_token.lock().await.clone() {
                req = req.bearer_auth(tok);
            }
        }
        req
    }

    async fn send(&self, req: RequestBuilder) -> Result<Value> {
        let resp = req.send().await?;
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        if !status.is_success() {
            return Err(anyhow!("HTTP {}: {}", status, text));
        }
        if text.is_empty() {
            return Ok(Value::Null);
        }
        serde_json::from_str(&text)
            .map_err(|e| anyhow!("failed to parse response: {} — body: {}", e, text))
    }

    pub async fn get_nonce(&self, wallet: &str) -> Result<Value> {
        let req = self
            .build(Method::POST, "/api/auth/nonce", false)
            .await
            .json(&json!({ "wallet": wallet }));
        self.send(req).await
    }

    pub async fn list_restaurants(
        &self,
        search: Option<&str>,
        page: Option<u32>,
        limit: Option<u32>,
    ) -> Result<Value> {
        let mut req = self.build(Method::GET, "/api/restaurants", false).await;
        let mut query: Vec<(&str, String)> = Vec::new();
        if let Some(s) = search {
            query.push(("search", s.to_string()));
        }
        if let Some(p) = page {
            query.push(("page", p.to_string()));
        }
        if let Some(l) = limit {
            query.push(("limit", l.to_string()));
        }
        if !query.is_empty() {
            req = req.query(&query);
        }
        self.send(req).await
    }

    pub async fn get_restaurant(&self, id_or_slug: &str) -> Result<Value> {
        let req = self
            .build(Method::GET, &format!("/api/restaurants/{}", id_or_slug), false)
            .await;
        self.send(req).await
    }

    pub async fn get_menu(&self, restaurant_id: &str) -> Result<Value> {
        let req = self
            .build(
                Method::GET,
                &format!("/api/restaurants/{}/menu", restaurant_id),
                false,
            )
            .await;
        self.send(req).await
    }

    pub async fn get_order(&self, id: &str) -> Result<Value> {
        let req = self
            .build(Method::GET, &format!("/api/orders/{}", id), true)
            .await;
        self.send(req).await
    }

    pub async fn get_order_funding(&self, id: &str) -> Result<Value> {
        let req = self
            .build(Method::GET, &format!("/api/orders/{}/funding", id), false)
            .await;
        self.send(req).await
    }

    pub async fn get_driver_profile(&self, wallet: &str) -> Result<Value> {
        let req = self
            .build(Method::GET, &format!("/api/drivers/{}", wallet), false)
            .await;
        self.send(req).await
    }

    pub async fn get_my_orders(&self) -> Result<Value> {
        let req = self.build(Method::GET, "/api/orders", true).await;
        self.send(req).await
    }

    pub async fn get_available_orders(&self) -> Result<Value> {
        let req = self
            .build(Method::GET, "/api/orders/available", true)
            .await;
        self.send(req).await
    }

    pub async fn create_order(
        &self,
        restaurant_id: &str,
        items: &[Value],
        delivery_address: Option<&str>,
    ) -> Result<Value> {
        let mut body = json!({
            "restaurantId": restaurant_id,
            "items": items,
        });
        if let Some(addr) = delivery_address {
            body["deliveryAddress"] = Value::String(addr.to_string());
        }
        let req = self
            .build(Method::POST, "/api/orders", true)
            .await
            .json(&body);
        self.send(req).await
    }

    pub async fn update_order_status(&self, order_id: &str, status: &str) -> Result<Value> {
        let req = self
            .build(Method::POST, &format!("/api/orders/{}/status", order_id), true)
            .await
            .json(&json!({ "status": status }));
        self.send(req).await
    }

    pub async fn contribute_to_order(
        &self,
        order_id: &str,
        amount: f64,
        tx_signature: &str,
    ) -> Result<Value> {
        let req = self
            .build(
                Method::POST,
                &format!("/api/orders/{}/contribute", order_id),
                true,
            )
            .await
            .json(&json!({
                "amount": amount,
                "txSignature": tx_signature,
            }));
        self.send(req).await
    }

    pub async fn verify_pickup(&self, order_id: &str, code_a: &str) -> Result<Value> {
        let req = self
            .build(
                Method::POST,
                &format!("/api/orders/{}/verify-pickup", order_id),
                true,
            )
            .await
            .json(&json!({ "code": code_a }));
        self.send(req).await
    }

    pub async fn verify_delivery(&self, order_id: &str, code_b: &str) -> Result<Value> {
        let req = self
            .build(
                Method::POST,
                &format!("/api/orders/{}/verify-delivery", order_id),
                true,
            )
            .await
            .json(&json!({ "code": code_b }));
        self.send(req).await
    }

    pub async fn place_driver_bid(&self, order_id: &str) -> Result<Value> {
        let req = self
            .build(
                Method::POST,
                &format!("/api/orders/{}/bids", order_id),
                true,
            )
            .await
            .json(&json!({}));
        self.send(req).await
    }

    pub async fn accept_driver_bid(&self, order_id: &str, bid_id: &str) -> Result<Value> {
        let req = self
            .build(
                Method::POST,
                &format!("/api/orders/{}/bids/{}/accept", order_id, bid_id),
                true,
            )
            .await
            .json(&json!({}));
        self.send(req).await
    }

    pub async fn rate_driver(
        &self,
        order_id: &str,
        rating: u8,
        comment: Option<&str>,
    ) -> Result<Value> {
        let mut body = json!({ "rating": rating });
        if let Some(c) = comment {
            body["comment"] = Value::String(c.to_string());
        }
        let req = self
            .build(
                Method::POST,
                &format!("/api/orders/{}/rate-driver", order_id),
                true,
            )
            .await
            .json(&body);
        self.send(req).await
    }

    pub async fn get_order_share_link(&self, order_id: &str) -> Result<Value> {
        let req = self
            .build(
                Method::POST,
                &format!("/api/orders/{}/share", order_id),
                true,
            )
            .await
            .json(&json!({}));
        self.send(req).await
    }
}
