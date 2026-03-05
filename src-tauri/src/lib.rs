mod models;
mod game_core;

use std::sync::Mutex;
use tauri::State; // Removed unused 'Manager'
use crate::game_core::GameCore;
use crate::models::{Player, CustomEvent, GameState};

struct AppState {
    game: Mutex<GameCore>,
}

#[tauri::command]
fn init_new_game(state: State<AppState>, players: Vec<Player>) -> GameState {
    let mut game = state.game.lock().unwrap();
    game.init_game(players)
}

#[tauri::command]
fn resume_game_state(state: State<AppState>, game_state: GameState) -> GameState {
    let mut game = state.game.lock().unwrap();
    game.resume_game(game_state)
}

#[tauri::command]
fn trigger_event(
    state: State<AppState>, 
    player_index: usize, 
    event: CustomEvent, 
    target_index: Option<usize>
) -> GameState {
    let mut game = state.game.lock().unwrap();
    game.trigger_event(player_index, event, target_index)
}

#[tauri::command]
fn undo_action(state: State<AppState>) -> Result<GameState, String> {
    let mut game = state.game.lock().unwrap();
    game.undo()
}

#[tauri::command]
fn update_score(state: State<AppState>, player_id: String, new_score: i32) -> GameState {
    let mut game = state.game.lock().unwrap();
    game.update_player_score(player_id, new_score)
}

#[tauri::command]
fn replace_player(state: State<AppState>, old_id: String, new_player: Player) -> GameState {
    let mut game = state.game.lock().unwrap();
    game.replace_player(old_id, new_player)
}

#[tauri::command]
fn add_player_mid_game(state: State<AppState>, new_player: Player) -> GameState {
    let mut game = state.game.lock().unwrap();
    game.add_player(new_player)
}

#[tauri::command]
fn remove_player_mid_game(state: State<AppState>, player_id: String) -> GameState {
    let mut game = state.game.lock().unwrap();
    game.remove_player(player_id)
}

#[tauri::command]
fn apply_custom_order(state: State<AppState>, ordered_ids: Vec<String>) -> GameState {
    let mut game = state.game.lock().unwrap();
    game.reorder_players(ordered_ids)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            game: Mutex::new(GameCore::new())
        })
        .invoke_handler(tauri::generate_handler![
            init_new_game,
            resume_game_state,
            trigger_event,
            undo_action,
            update_score,
            replace_player,
            add_player_mid_game,
            remove_player_mid_game,
            apply_custom_order
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}