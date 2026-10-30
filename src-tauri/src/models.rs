use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Player {
    pub id: String,
    pub name: String,
    #[serde(rename = "avatarColor")]
    pub avatar_color: String,
    pub score: i32,
    #[serde(rename = "triggeredEvents")]
    pub triggered_events: HashMap<String, i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomEvent {
    pub id: String,
    pub name: String,
    #[serde(rename = "targetType")]
    pub target_type: String,
    pub score: i32,
    #[serde(rename = "isNextRound")]
    pub is_next_round: bool, // 简化：前端必须传布尔值
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameState {
    pub id: String,
    pub round: i32,
    pub players: Vec<Player>,
    /// 当前可撤销的步数。前端据此禁用撤销按钮，不再用"长度为 1 的假数组"糊弄。
    #[serde(rename = "historyLen")]
    pub history_len: usize,
}