use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Restaurant {
    pub id: String,
    pub name: String,
    pub slug: Option<String>,
    pub description: Option<String>,
    pub currency: Option<String>,
    pub delivery_fee: Option<f64>,
    pub published: Option<bool>,
    pub self_delivery: Option<bool>,
    pub address_city: Option<String>,
    pub address_country: Option<String>,
    pub address_street: Option<String>,
    pub logo: Option<String>,
    pub banner: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MenuItem {
    pub id: String,
    pub restaurant_id: String,
    pub name: String,
    pub description: Option<String>,
    pub price: f64,
    pub image: Option<String>,
    pub category: Option<String>,
    pub available: Option<bool>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrderItem {
    pub menu_item_id: String,
    pub name: Option<String>,
    pub price: Option<f64>,
    pub quantity: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Contribution {
    pub id: String,
    pub order_id: String,
    pub wallet: String,
    pub amount: f64,
    pub tx_signature: Option<String>,
    pub timestamp: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RestaurantRef {
    pub id: String,
    pub name: String,
    pub slug: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Order {
    pub id: String,
    pub restaurant_id: String,
    pub status: String,
    pub food_total: Option<f64>,
    pub delivery_fee: Option<f64>,
    pub escrow_target: Option<f64>,
    pub escrow_funded: Option<f64>,
    pub delivery_address: Option<String>,
    pub driver_wallet: Option<String>,
    pub code_a: Option<String>,
    pub code_b: Option<String>,
    pub share_link: Option<String>,
    pub created_at: Option<String>,
    #[serde(default)]
    pub items: Vec<OrderItem>,
    #[serde(default)]
    pub contributions: Vec<Contribution>,
    pub restaurant: Option<RestaurantRef>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DriverBid {
    pub id: String,
    pub order_id: String,
    pub driver_wallet: String,
    pub status: String,
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DriverProfile {
    pub wallet: String,
    pub completed_deliveries: Option<u32>,
    pub avg_rating: Option<f64>,
    pub rating_count: Option<u32>,
    pub vehicle_type: Option<String>,
    pub is_newcomer: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomerProfile {
    pub wallet: String,
    pub prefer_eco: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FundingInfo {
    pub escrow_target: f64,
    pub escrow_funded: f64,
    pub remaining: f64,
    pub percent_funded: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthNonce {
    pub nonce: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthToken {
    pub token: String,
    pub wallet: String,
}
