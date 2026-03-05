// src/store/index.ts
import { reactive } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import type { Player, CustomEvent, GameHistory, SavedPlayer, GameSnapshot } from '../types';
import { AppConfig } from '../config';

const loadEvents = (): CustomEvent[] => {
  const saved = localStorage.getItem('bilscore_events');
  let events: CustomEvent[] = saved ? JSON.parse(saved) : [];
  if (AppConfig.isPersonal) {
    AppConfig.builtInEvents.forEach(builtin => {
      const existing = events.find(e => e.id === builtin.id);
      if (!existing) {
        events.push({ ...builtin });
      } else {
        existing.name = builtin.name;
        existing.targetType = builtin.targetType;
        existing.isNextRound = builtin.isNextRound;
        existing.isBuiltIn = true;
      }
    });
  } else {
    events = events.filter(e => !e.isBuiltIn);
  }
  return events;
};

const loadLocal = (key: string) => {
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : [];
};

interface RustGameState {
  id: string;
  round: number;
  players: Player[];
}

export const gameStore = reactive({
  currentGameId: null as string | null,
  currentPlayers: [] as Player[],
  currentRound: 1,
  customEvents: loadEvents(),
  history: loadLocal('bilscore_history') as GameHistory[],
  savedPlayers: loadLocal('bilscore_players') as SavedPlayer[],
  historySnapshots: [] as GameSnapshot[], 

  addSavedPlayer(player: SavedPlayer) {
    this.savedPlayers.push(player);
    localStorage.setItem('bilscore_players', JSON.stringify(this.savedPlayers));
  },
  deleteSavedPlayer(id: string) {
    this.savedPlayers = this.savedPlayers.filter((p: SavedPlayer) => p.id !== id);
    localStorage.setItem('bilscore_players', JSON.stringify(this.savedPlayers));
  },
  addEvent(event: CustomEvent) { this.customEvents.push(event); this.saveEvents(); },
  deleteEvent(id: string) { 
    this.customEvents = this.customEvents.filter((e: CustomEvent) => e.id !== id || (AppConfig.isPersonal && e.isBuiltIn)); 
    this.saveEvents(); 
  },
  updateEventScore(id: string, newScore: number) {
    const ev = this.customEvents.find(e => e.id === id);
    if (ev) { ev.score = newScore; this.saveEvents(); }
  },
  saveEvents() { localStorage.setItem('bilscore_events', JSON.stringify(this.customEvents)); },
  
  _syncState(state: RustGameState) {
    this.currentGameId = state.id;
    this.currentRound = state.round;
    this.currentPlayers = state.players;
    this.historySnapshots = new Array(1) as any;
    this._updateHistoryList();
  },

  _updateHistoryList() {
    if (!this.currentGameId) return;
    const record: GameHistory = { 
        id: this.currentGameId, 
        lastEdited: Date.now(), 
        round: this.currentRound, 
        players: JSON.parse(JSON.stringify(this.currentPlayers)) 
    };
    const existingIdx = this.history.findIndex((h: GameHistory) => h.id === this.currentGameId);
    if (existingIdx > -1) this.history.splice(existingIdx, 1);
    this.history.unshift(record);
    if (this.history.length > 10) this.history = this.history.slice(0, 10);
    localStorage.setItem('bilscore_history', JSON.stringify(this.history));
  },

  async initNewGame(selectedPlayers: SavedPlayer[]) {
    const initialPlayers: Player[] = selectedPlayers.map(sp => ({ 
        ...sp, score: 0, triggeredEvents: {} 
    }));
    const newState = await invoke<RustGameState>('init_new_game', { players: initialPlayers });
    this.historySnapshots = [];
    this._syncState(newState);
  },

  async resumeGame(id: string) {
    const record = this.history.find((h: GameHistory) => h.id === id);
    if (record) {
      const stateToResume: RustGameState = {
          id: record.id,
          round: record.round,
          players: record.players
      };
      const newState = await invoke<RustGameState>('resume_game_state', { gameState: stateToResume });
      this._syncState(newState);
    }
  },

  endAndSaveGame() {
    this._updateHistoryList();
    this.currentGameId = null;
    this.historySnapshots = [];
  },

  async triggerEvent(playerIndex: number, eventId: string, targetIndex?: number) {
    const event = this.customEvents.find((e: CustomEvent) => e.id === eventId);
    if (!event) return;
    const newState = await invoke<RustGameState>('trigger_event', { 
        playerIndex, 
        event, 
        targetIndex 
    });
    this._syncState(newState);
  },

  async undoLastAction() {
    try {
        const newState = await invoke<RustGameState>('undo_action');
        this._syncState(newState);
    } catch (e) {
        console.warn("Undo failed", e);
        this.historySnapshots = [];
    }
  },

  async updatePlayerScore(playerId: string, newScore: number) {
    const newState = await invoke<RustGameState>('update_score', { playerId, newScore });
    this._syncState(newState);
  },

  async replacePlayer(oldPlayerId: string, newSavedPlayer: SavedPlayer) {
    const newPlayerBase: Player = { ...newSavedPlayer, score: 0, triggeredEvents: {} };
    const newState = await invoke<RustGameState>('replace_player', { 
        oldId: oldPlayerId, 
        newPlayer: newPlayerBase 
    });
    this._syncState(newState);
  },

  async addPlayerMidGame(newSavedPlayer: SavedPlayer) {
    const newPlayerBase: Player = { ...newSavedPlayer, score: 0, triggeredEvents: {} };
    const newState = await invoke<RustGameState>('add_player_mid_game', { newPlayer: newPlayerBase });
    this._syncState(newState);
  },

  async removePlayerMidGame(playerId: string) {
    const newState = await invoke<RustGameState>('remove_player_mid_game', { playerId });
    this._syncState(newState);
  },

  async applyCustomOrder(orderedIds: string[]) {
    const newState = await invoke<RustGameState>('apply_custom_order', { orderedIds });
    this._syncState(newState);
  }
});