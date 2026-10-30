// src/store/index.ts
import { reactive } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import type { Player, CustomEvent, GameHistory, SavedPlayer } from '../types';
import { AppConfig } from '../config';

const KEY_EVENTS = 'bilscore_events';
const KEY_HISTORY = 'bilscore_history';
const KEY_PLAYERS = 'bilscore_players';

/** 脏数据 / 版本不兼容时降级为默认值，绝不抛异常把首页搞白屏 */
const safeParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return (parsed ?? fallback) as T;
  } catch (e) {
    console.warn('[bilscore] 本地数据损坏，已忽略该键：', e);
    return fallback;
  }
};

const loadEvents = (): CustomEvent[] => {
  const events = safeParse<CustomEvent[]>(localStorage.getItem(KEY_EVENTS), []);
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
    return events;
  }
  return events.filter(e => !e.isBuiltIn);
};

const loadLocal = <T>(key: string, fallback: T): T => safeParse<T>(localStorage.getItem(key), fallback);

const save = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('[bilscore] 写入本地存储失败', key, e);
  }
};

interface RustGameState {
  id: string;
  round: number;
  players: Player[];
  historyLen: number;
}

export const gameStore = reactive({
  currentGameId: null as string | null,
  currentPlayers: [] as Player[],
  currentRound: 1,
  /** Rust 侧撤销栈的真实长度，替代之前的假数组 */
  historyLen: 0,
  customEvents: loadEvents(),
  history: loadLocal<GameHistory[]>(KEY_HISTORY, []),
  savedPlayers: loadLocal<SavedPlayer[]>(KEY_PLAYERS, []),

  addSavedPlayer(player: SavedPlayer) {
    this.savedPlayers.push(player);
    save(KEY_PLAYERS, this.savedPlayers);
  },
  deleteSavedPlayer(id: string) {
    this.savedPlayers = this.savedPlayers.filter((p: SavedPlayer) => p.id !== id);
    save(KEY_PLAYERS, this.savedPlayers);
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
  saveEvents() { save(KEY_EVENTS, this.customEvents); },

  _syncState(state: RustGameState) {
    this.currentGameId = state.id;
    this.currentRound = state.round;
    this.currentPlayers = state.players;
    this.historyLen = state.historyLen ?? 0;
    this._updateHistoryList();
  },

  _updateHistoryList() {
    if (!this.currentGameId) return;
    const record: GameHistory = {
      id: this.currentGameId,
      lastEdited: Date.now(),
      round: this.currentRound,
      players: JSON.parse(JSON.stringify(this.currentPlayers)) as Player[],
    };
    const existingIdx = this.history.findIndex((h: GameHistory) => h.id === this.currentGameId);
    if (existingIdx > -1) this.history.splice(existingIdx, 1);
    this.history.unshift(record);
    if (this.history.length > 10) this.history = this.history.slice(0, 10);
    // 每次点击都同步写盘会卡主线程（localStorage.setItem 是同步的），这里防抖
    schedulePersist();
  },

  /** 立即落盘：结束对局、页面隐藏、应用切后台时调用 */
  flushHistory() {
    save(KEY_HISTORY, this.history);
  },

  async initNewGame(selectedPlayers: SavedPlayer[]) {
    const initialPlayers: Player[] = selectedPlayers.map(sp => ({
      ...sp, score: 0, triggeredEvents: {},
    }));
    const newState = await invoke<RustGameState>('init_new_game', { players: initialPlayers });
    this._syncState(newState);
  },

  async resumeGame(id: string) {
    const record = this.history.find((h: GameHistory) => h.id === id);
    if (record) {
      const stateToResume: RustGameState = {
        id: record.id,
        round: record.round,
        players: record.players,
        historyLen: 0,
      };
      const newState = await invoke<RustGameState>('resume_game_state', { gameState: stateToResume });
      this._syncState(newState);
    }
  },

  endAndSaveGame() {
    this._updateHistoryList();
    // 结束对局是明确的关键节点，立即写盘，不依赖防抖
    this.flushHistory();
    this.currentGameId = null;
    this.historyLen = 0;
  },

  async triggerEvent(playerId: string, eventId: string, targetId?: string) {
    const event = this.customEvents.find((e: CustomEvent) => e.id === eventId);
    if (!event) return;
    const newState = await invoke<RustGameState>('trigger_event', {
      playerId,
      event,
      targetId: targetId ?? null,
    });
    this._syncState(newState);
  },

  async undoLastAction() {
    try {
      const newState = await invoke<RustGameState>('undo_action');
      this._syncState(newState);
    } catch (e) {
      console.warn('[bilscore] 撤销失败', e);
      this.historyLen = 0;
      throw e;
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
      newPlayer: newPlayerBase,
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
  },
});

// ---- 防抖持久化 ----
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    gameStore.flushHistory();
  }, 500);
}

/** 应用被切后台 / 关闭前把数据刷到磁盘 */
export const flushOnExit = () => gameStore.flushHistory();
