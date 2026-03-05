use crate::models::{GameState, Player, CustomEvent};
use rand::seq::SliceRandom;
use rand::thread_rng;
use std::collections::HashMap;
use uuid::Uuid;

pub struct GameCore {
    pub current_game_id: Option<String>,
    pub current_round: i32,
    pub current_players: Vec<Player>,
    pub history_stack: Vec<GameState>,
}

impl GameCore {
    pub fn new() -> Self {
        Self {
            current_game_id: None,
            current_round: 1,
            current_players: Vec::new(),
            history_stack: Vec::new(),
        }
    }

    pub fn init_game(&mut self, players: Vec<Player>) -> GameState {
        self.current_game_id = Some(format!("game_{}", Uuid::new_v4()));
        self.current_round = 1;
        self.current_players = players.into_iter().map(|mut p| {
            p.score = 0;
            p.triggered_events = HashMap::new();
            p
        }).collect();
        self.history_stack.clear();
        self.get_state()
    }

    pub fn resume_game(&mut self, state: GameState) -> GameState {
        self.current_game_id = Some(state.id);
        self.current_round = state.round;
        self.current_players = state.players;
        self.history_stack.clear();
        self.get_state()
    }

    fn save_snapshot(&mut self) {
        if let Some(id) = &self.current_game_id {
            self.history_stack.push(GameState {
                id: id.clone(),
                round: self.current_round,
                players: self.current_players.clone(),
            });
            if self.history_stack.len() > 50 {
                self.history_stack.remove(0);
            }
        }
    }

    pub fn undo(&mut self) -> Result<GameState, String> {
        if let Some(last_state) = self.history_stack.pop() {
            self.current_round = last_state.round;
            self.current_players = last_state.players;
            Ok(self.get_state())
        } else {
            Err("No history to undo".to_string())
        }
    }

    pub fn trigger_event(&mut self, player_index: usize, event: CustomEvent, target_index: Option<usize>) -> GameState {
        self.save_snapshot();

        let n = self.current_players.len() as i32;
        if n == 0 { return self.get_state(); }
        
        let score = event.score;
        let prev_index = (player_index as i32 - 1 + n) as usize % self.current_players.len();

        match event.target_type.as_str() {
            "give_prev" => {
                self.modify_score(player_index, -score);
                self.modify_score(prev_index, score);
            }
            "take_prev" => {
                self.modify_score(player_index, score);
                self.modify_score(prev_index, -score);
            }
            "give_all" => {
                self.modify_score(player_index, -score * (n - 1));
                for i in 0..self.current_players.len() {
                    if i != player_index { self.modify_score(i, score); }
                }
            }
            "take_all" => {
                self.modify_score(player_index, score * (n - 1));
                for i in 0..self.current_players.len() {
                    if i != player_index { self.modify_score(i, -score); }
                }
            }
            "give_custom" => {
                if let Some(target) = target_index {
                    self.modify_score(player_index, -score);
                    self.modify_score(target, score);
                }
            }
            "take_custom" => {
                if let Some(target) = target_index {
                    self.modify_score(player_index, score);
                    self.modify_score(target, -score);
                }
            }
            _ => {}
        }

        if let Some(p) = self.current_players.get_mut(player_index) {
            *p.triggered_events.entry(event.id.clone()).or_insert(0) += 1;
        }

        if event.is_next_round {
            self.current_round += 1;
            self.handle_shuffle(player_index, prev_index, &event.target_type, target_index);
        }

        self.get_state()
    }

    fn modify_score(&mut self, index: usize, delta: i32) {
        if let Some(p) = self.current_players.get_mut(index) {
            p.score += delta;
        }
    }

    // 修复：简化洗牌逻辑，解决编译错误
    fn handle_shuffle(&mut self, player_idx: usize, prev_idx: usize, target_type: &str, target_custom_idx: Option<usize>) {
        let mut winner_idx = prev_idx;
        let mut loser_idx = player_idx;

        if target_type.contains("take") {
            winner_idx = player_idx;
            loser_idx = prev_idx;
        }
        if target_type == "take_custom" {
             winner_idx = player_idx;
             if let Some(t) = target_custom_idx { loser_idx = t; }
        } else if target_type == "give_custom" {
             if let Some(t) = target_custom_idx { winner_idx = t; }
             loser_idx = player_idx;
        }

        // 使用 ID 来查找玩家，防止 clone 后的索引错位
        // 这里的逻辑简化为：先把所有人按当前索引拿出来，然后重新组装
        let players_backup = self.current_players.clone();
        
        // 安全检查
        if winner_idx >= players_backup.len() || loser_idx >= players_backup.len() {
            return;
        }

        let winner = players_backup[winner_idx].clone();
        let loser = players_backup[loser_idx].clone();
        
        // 收集剩余玩家
        let mut remaining: Vec<Player> = players_backup.into_iter()
            .enumerate()
            .filter(|(i, _)| *i != winner_idx && *i != loser_idx)
            .map(|(_, p)| p)
            .collect();

        let mut rng = thread_rng();
        // 直接打乱剩余玩家，不再纠结复杂的 4 人特殊逻辑，避免编译错误和维护困难
        remaining.shuffle(&mut rng);

        let mut new_order = vec![winner, loser];
        new_order.extend(remaining);

        self.current_players = new_order;
    }

    pub fn update_player_score(&mut self, player_id: String, new_score: i32) -> GameState {
        self.save_snapshot();
        if let Some(p) = self.current_players.iter_mut().find(|p| p.id == player_id) {
            p.score = new_score;
        }
        self.get_state()
    }

    pub fn replace_player(&mut self, old_id: String, new_player: Player) -> GameState {
        self.save_snapshot();
        if let Some(p) = self.current_players.iter_mut().find(|p| p.id == old_id) {
            p.id = new_player.id;
            p.name = new_player.name;
            p.avatar_color = new_player.avatar_color;
        }
        self.get_state()
    }

    pub fn add_player(&mut self, mut new_player: Player) -> GameState {
        self.save_snapshot();
        new_player.score = 0;
        new_player.triggered_events = HashMap::new();
        self.current_players.push(new_player);
        self.get_state()
    }

    pub fn remove_player(&mut self, player_id: String) -> GameState {
        self.save_snapshot();
        self.current_players.retain(|p| p.id != player_id);
        self.get_state()
    }
    
    pub fn reorder_players(&mut self, ordered_ids: Vec<String>) -> GameState {
        self.save_snapshot();
        let mut new_list = Vec::new();
        for id in ordered_ids {
            if let Some(p) = self.current_players.iter().find(|p| p.id == id) {
                new_list.push(p.clone());
            }
        }
        if new_list.len() == self.current_players.len() {
            self.current_players = new_list;
        }
        self.get_state()
    }

    pub fn get_state(&self) -> GameState {
        GameState {
            id: self.current_game_id.clone().unwrap_or_default(),
            round: self.current_round,
            players: self.current_players.clone(),
        }
    }
}