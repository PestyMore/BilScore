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
                history_len: self.history_stack.len(),
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

    /// 按 **玩家 id** 触发事件（不再用数组下标）。
    /// 洗牌会重排数组，用下标寻址在连点/异步往返时会记错人。
    pub fn trigger_event(
        &mut self,
        player_id: &str,
        event: CustomEvent,
        target_id: Option<&str>,
    ) -> GameState {
        let Some(player_index) = self.current_players.iter().position(|p| p.id == player_id) else {
            return self.get_state();
        };
        let n = self.current_players.len() as i32;
        if n == 0 {
            return self.get_state();
        }

        self.save_snapshot();

        let score = event.score;
        let prev_index = (player_index + self.current_players.len() - 1) % self.current_players.len();
        let target_index = target_id
            .and_then(|id| self.current_players.iter().position(|p| p.id == id));

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

    // 换轮洗牌：赢家排第 1，输家排第 2，其余随机
    fn handle_shuffle(&mut self, player_idx: usize, prev_idx: usize, target_type: &str, target_custom_idx: Option<usize>) {
        // 少于 2 人时 winner/loser 会指向同一人，会造成玩家重复
        if self.current_players.len() < 2 {
            return;
        }

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
        if winner_idx >= players_backup.len() || loser_idx >= players_backup.len() || winner_idx == loser_idx {
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
            history_len: self.history_stack.len(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn player(id: &str) -> Player {
        Player {
            id: id.to_string(),
            name: id.to_string(),
            avatar_color: "#ffffff".to_string(),
            score: 0,
            triggered_events: HashMap::new(),
        }
    }

    fn event(id: &str, target_type: &str, score: i32, is_next_round: bool) -> CustomEvent {
        CustomEvent {
            id: id.to_string(),
            name: id.to_string(),
            target_type: target_type.to_string(),
            score,
            is_next_round,
        }
    }

    fn scores(game: &GameCore) -> Vec<i32> {
        game.current_players.iter().map(|p| p.score).collect()
    }

    fn ids(game: &GameCore) -> Vec<String> {
        game.current_players.iter().map(|p| p.id.clone()).collect()
    }

    #[test]
    fn init_game_resets_scores_and_history() {
        let mut game = GameCore::new();
        let mut p = player("a");
        p.score = 99;
        game.init_game(vec![p, player("b"), player("c")]);

        assert_eq!(scores(&game), vec![0, 0, 0]);
        assert_eq!(game.current_round, 1);
        assert_eq!(game.history_stack.len(), 0);
        assert!(game.current_game_id.is_some());
    }

    #[test]
    fn take_all_collects_from_everyone() {
        let mut game = GameCore::new();
        game.init_game(vec![player("a"), player("b"), player("c")]);

        // 大金：a 从另外 2 人各拿 10 分
        game.trigger_event("a", event("dajin", "take_all", 10, false), None);
        assert_eq!(scores(&game), vec![20, -10, -10]);
    }

    #[test]
    fn give_all_pays_everyone() {
        let mut game = GameCore::new();
        game.init_game(vec![player("a"), player("b"), player("c")]);

        // 大金犯规：a 给另外 2 人各 10 分
        game.trigger_event("a", event("dajinfoul", "give_all", 10, false), None);
        assert_eq!(scores(&game), vec![-20, 10, 10]);
    }

    #[test]
    fn two_player_prev_is_the_other_one() {
        let mut game = GameCore::new();
        game.init_game(vec![player("a"), player("b")]);

        // 普胜：a 吃上家(b) 4 分
        game.trigger_event("a", event("pusheng", "take_prev", 4, false), None);
        assert_eq!(scores(&game), vec![4, -4]);

        // 犯规：b 给上家(a) 1 分
        game.trigger_event("b", event("foul", "give_prev", 1, false), None);
        assert_eq!(scores(&game), vec![5, -5]);
    }

    #[test]
    fn custom_target_transfers_only_to_target() {
        let mut game = GameCore::new();
        game.init_game(vec![player("a"), player("b"), player("c")]);

        // 让杆：a 给 c 1 分，b 不受影响
        game.trigger_event("a", event("ranggan", "give_custom", 1, false), Some("c"));
        assert_eq!(scores(&game), vec![-1, 0, 1]);
    }

    #[test]
    fn custom_target_ignores_unknown_target() {
        let mut game = GameCore::new();
        game.init_game(vec![player("a"), player("b")]);

        game.trigger_event("a", event("ranggan", "give_custom", 1, false), Some("nobody"));
        assert_eq!(scores(&game), vec![0, 0]);
        // 未知目标不该污染撤销栈之外的状态
        assert_eq!(game.history_stack.len(), 1);
    }

    #[test]
    fn unknown_player_is_noop_and_leaves_no_history() {
        let mut game = GameCore::new();
        game.init_game(vec![player("a"), player("b")]);

        let state = game.trigger_event("ghost", event("pusheng", "take_prev", 4, false), None);
        assert_eq!(scores(&game), vec![0, 0]);
        assert_eq!(state.history_len, 0);
        assert_eq!(game.history_stack.len(), 0);
    }

    #[test]
    fn next_round_increments_round_and_shuffles() {
        let mut game = GameCore::new();
        game.init_game(vec![player("a"), player("b")]);

        // take_all：a 是赢家，b 是输家 → 顺序 [a, b]
        game.trigger_event("a", event("dajin", "take_all", 10, true), None);
        assert_eq!(game.current_round, 2);
        assert_eq!(ids(&game), vec!["a", "b"]);

        // give_all：上家(b) 是赢家，a 是输家 → 顺序 [b, a]
        game.trigger_event("a", event("dajinfoul", "give_all", 10, true), None);
        assert_eq!(game.current_round, 3);
        assert_eq!(ids(&game), vec!["b", "a"]);
    }

    #[test]
    fn triggered_events_are_counted() {
        let mut game = GameCore::new();
        game.init_game(vec![player("a"), player("b")]);

        game.trigger_event("a", event("dajin", "take_all", 10, false), None);
        game.trigger_event("a", event("dajin", "take_all", 10, false), None);

        assert_eq!(
            game.current_players[0].triggered_events.get("dajin").copied(),
            Some(2)
        );
    }

    #[test]
    fn undo_restores_scores_and_round() {
        let mut game = GameCore::new();
        game.init_game(vec![player("a"), player("b"), player("c")]);

        game.trigger_event("a", event("dajin", "take_all", 10, true), None);
        assert_eq!(scores(&game), vec![20, -10, -10]);
        assert_eq!(game.current_round, 2);

        let undone = game.undo().expect("应该有可撤销的历史");
        assert_eq!(scores(&game), vec![0, 0, 0]);
        assert_eq!(game.current_round, 1);
        assert_eq!(undone.history_len, 0);

        assert!(game.undo().is_err());
    }

    #[test]
    fn undo_restores_player_order_after_shuffle() {
        let mut game = GameCore::new();
        game.init_game(vec![player("a"), player("b")]);

        game.trigger_event("a", event("dajinfoul", "give_all", 10, true), None);
        assert_eq!(ids(&game), vec!["b", "a"]);

        game.undo().unwrap();
        assert_eq!(ids(&game), vec!["a", "b"]);
    }

    #[test]
    fn history_is_capped_at_50() {
        let mut game = GameCore::new();
        game.init_game(vec![player("a"), player("b")]);

        for _ in 0..60 {
            game.trigger_event("a", event("foul", "give_prev", 1, false), None);
        }
        assert_eq!(game.history_stack.len(), 50);
    }

    #[test]
    fn add_remove_and_reorder_players() {
        let mut game = GameCore::new();
        game.init_game(vec![player("a"), player("b")]);

        game.add_player(player("c"));
        assert_eq!(ids(&game), vec!["a", "b", "c"]);
        assert_eq!(scores(&game), vec![0, 0, 0]);

        game.remove_player("b".to_string());
        assert_eq!(ids(&game), vec!["a", "c"]);

        game.reorder_players(vec!["c".into(), "a".into()]);
        assert_eq!(ids(&game), vec!["c", "a"]);

        // 顺序列表长度不匹配时应保持原顺序不变
        game.reorder_players(vec!["c".into()]);
        assert_eq!(ids(&game), vec!["c", "a"]);
    }

    #[test]
    fn update_and_replace_player() {
        let mut game = GameCore::new();
        game.init_game(vec![player("a"), player("b")]);

        game.update_player_score("a".to_string(), 42);
        assert_eq!(scores(&game), vec![42, 0]);

        game.replace_player("b".to_string(), player("z"));
        assert_eq!(ids(&game), vec!["a", "z"]);
        // 换人保留原分数
        assert_eq!(scores(&game), vec![42, 0]);
    }

    #[test]
    fn resume_game_clears_undo_stack() {
        let mut game = GameCore::new();
        game.init_game(vec![player("a"), player("b")]);
        game.trigger_event("a", event("dajin", "take_all", 10, false), None);
        assert_eq!(game.history_stack.len(), 1);

        let snapshot = game.get_state();
        let mut fresh = GameCore::new();
        let state = fresh.resume_game(snapshot);

        assert_eq!(state.history_len, 0);
        assert!(fresh.undo().is_err());
    }

    #[test]
    fn single_player_never_duplicates() {
        let mut game = GameCore::new();
        game.init_game(vec![player("a")]);

        game.trigger_event("a", event("dajin", "take_all", 10, true), None);
        assert_eq!(ids(&game), vec!["a"]);
        assert_eq!(scores(&game), vec![0]);
    }
}
