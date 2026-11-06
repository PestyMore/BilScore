// src/store/index.ts
import { reactive } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import type {
  Player, CustomEvent, GameHistory, SavedPlayer,
  GameLogEntry, ActiveGame, PlayerStat,
} from '../types';
import { AppConfig } from '../config';

const KEY_EVENTS = 'bilscore_events';
const KEY_HISTORY = 'bilscore_history';
const KEY_PLAYERS = 'bilscore_players';
const KEY_ACTIVE = 'bilscore_active';

const HISTORY_LIMIT = 10;
const LOG_LIMIT = 100;
/** 前端提示用；真正的边界在 Rust 的 game_core.rs */
export const MAX_PLAYERS = 8;

/** 脏数据 / 版本不兼容时降级为默认值，绝不抛异常把首页搞白屏 */
const safeParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || parsed === undefined) return fallback;
    if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
    return parsed as T;
  } catch (e) {
    console.warn('[bilscore] 本地数据损坏，已忽略该键：', e);
    return fallback;
  }
};

const loadLocal = <T>(key: string, fallback: T): T => safeParse<T>(localStorage.getItem(key), fallback);

const save = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('[bilscore] 写入本地存储失败', key, e);
  }
};

const remove = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error('[bilscore] 删除本地存储失败', key, e);
  }
};

const loadEvents = (): CustomEvent[] => {
  const events = safeParse<CustomEvent[]>(localStorage.getItem(KEY_EVENTS), []);
  let normalized: CustomEvent[];
  if (AppConfig.isPersonal) {
    AppConfig.builtInEvents.forEach((builtin: CustomEvent) => {
      const existing = events.find((e: CustomEvent) => e.id === builtin.id);
      if (!existing) {
        events.push({ ...builtin });
      } else {
        existing.name = builtin.name;
        existing.targetType = builtin.targetType;
        existing.isNextRound = builtin.isNextRound;
        existing.isBuiltIn = true;
      }
    });
    normalized = events;
  } else {
    normalized = events.filter((e: CustomEvent) => !e.isBuiltIn);
  }
  // 规范化结果写回：避免存储里长期留着两个模式混合的数据
  save(KEY_EVENTS, normalized);
  return normalized;
};

interface RustGameState {
  id: string;
  round: number;
  players: Player[];
  historyLen: number;
}

type LogAction =
  | { kind: 'event' | 'score' | 'roster'; label: string; actorId: string; detail?: string }
  | { kind: 'undo' };

export const gameStore = reactive({
  currentGameId: null as string | null,
  currentPlayers: [] as Player[],
  currentRound: 1,
  /** Rust 侧撤销栈的真实长度 */
  historyLen: 0,
  customEvents: loadEvents(),
  history: loadLocal<GameHistory[]>(KEY_HISTORY, []),
  savedPlayers: loadLocal<SavedPlayer[]>(KEY_PLAYERS, []),
  /** 独立于历史的活跃对局标记：结束对局时清除，切后台 / 杀进程后仍可续玩 */
  activeGame: loadLocal<ActiveGame | null>(KEY_ACTIVE, null),
  gameLog: [] as GameLogEntry[],
  logSeq: 0,

  /** 历史战绩：一次遍历算出所有玩家的场次 / 胜场，视图侧用 computed 接住 */
  get playerStats(): Record<string, PlayerStat> {
    const stats: Record<string, PlayerStat> = {};
    for (const h of this.history as GameHistory[]) {
      if (!Array.isArray(h?.players) || h.players.length === 0) continue;
      const top = Math.max(...h.players.map((p: Player) => p.score ?? 0));
      for (const p of h.players) {
        const s = stats[p.id] ?? (stats[p.id] = { games: 0, wins: 0 });
        s.games += 1;
        if ((p.score ?? 0) === top) s.wins += 1;
      }
    }
    return stats;
  },

  /** 首页「继续上一局」是否可用 */
  get canResume(): boolean {
    const a = this.activeGame as ActiveGame | null;
    return !!a && !!a.id && Array.isArray(a.players) && a.players.length >= 2;
  },

  addSavedPlayer(player: SavedPlayer) {
    this.savedPlayers.push(player);
    save(KEY_PLAYERS, this.savedPlayers);
  },
  deleteSavedPlayer(id: string) {
    this.savedPlayers = this.savedPlayers.filter((p: SavedPlayer) => p.id !== id);
    save(KEY_PLAYERS, this.savedPlayers);
  },
  updateSavedPlayer(id: string, patch: Partial<SavedPlayer>) {
    const idx = this.savedPlayers.findIndex((p: SavedPlayer) => p.id === id);
    if (idx === -1) return;
    this.savedPlayers[idx] = { ...this.savedPlayers[idx], ...patch };
    save(KEY_PLAYERS, this.savedPlayers);
  },
  addEvent(event: CustomEvent) { this.customEvents.push(event); this.saveEvents(); },
  deleteEvent(id: string) {
    this.customEvents = this.customEvents.filter(
      (e: CustomEvent) => e.id !== id || (AppConfig.isPersonal && e.isBuiltIn)
    );
    this.saveEvents();
  },
  updateEventScore(id: string, newScore: number) {
    const ev = this.customEvents.find((e: CustomEvent) => e.id === id);
    if (ev) { ev.score = newScore; this.saveEvents(); }
  },
  saveEvents() { save(KEY_EVENTS, this.customEvents); },

  _syncState(state: RustGameState, action?: LogAction) {
    const before = action && action.kind !== 'undo'
      ? new Map<string, number>(this.currentPlayers.map((p: Player) => [p.id, p.score]))
      : null;
    const beforeNames = action && action.kind !== 'undo'
      ? new Map<string, string>(this.currentPlayers.map((p: Player) => [p.id, p.name]))
      : null;

    this.currentGameId = state.id;
    this.currentRound = state.round;
    this.currentPlayers = state.players;
    this.historyLen = state.historyLen ?? 0;

    if (action) {
      if (action.kind === 'undo') {
        // Rust 的空操作不入撤销栈，所以每次成功撤销正好对应一条流水
        this.gameLog.shift();
      } else {
        const actor = state.players.find((p: Player) => p.id === action.actorId);
        const delta = action.actorId && actor
          ? actor.score - (before?.get(action.actorId) ?? 0)
          : 0;
        this.logSeq += 1;
        this.gameLog.unshift({
          seq: this.logSeq,
          round: state.round,
          actor: actor?.name ?? beforeNames?.get(action.actorId) ?? '',
          label: action.label,
          delta,
          detail: action.detail,
          at: Date.now(),
        });
        if (this.gameLog.length > LOG_LIMIT) this.gameLog.length = LOG_LIMIT;
      }
    }

    this._updateHistoryList();
    this.activeGame = this._buildActive();
    schedulePersist();
  },

  _updateHistoryList() {
    if (!this.currentGameId) return;
    const record: GameHistory = {
      id: this.currentGameId,
      lastEdited: Date.now(),
      round: this.currentRound,
      // Rust 每次 invoke 都返回全新的 Player 对象，写盘时 JSON.stringify 本身就是快照
      players: this.currentPlayers,
    };
    const existingIdx = this.history.findIndex((h: GameHistory) => h.id === this.currentGameId);
    if (existingIdx > -1) this.history.splice(existingIdx, 1);
    this.history.unshift(record);
    if (this.history.length > HISTORY_LIMIT) this.history = this.history.slice(0, HISTORY_LIMIT);
  },

  _buildActive(): ActiveGame | null {
    if (!this.currentGameId || this.currentPlayers.length === 0) return null;
    return {
      id: this.currentGameId,
      round: this.currentRound,
      players: this.currentPlayers,
      log: this.gameLog,
      savedAt: Date.now(),
    };
  },

  /** 立即落盘：结束对局、页面隐藏、应用切后台时调用 */
  flushHistory() {
    save(KEY_HISTORY, this.history);
    if (this.activeGame) save(KEY_ACTIVE, this.activeGame);
    else remove(KEY_ACTIVE);
  },

  deleteHistory(id: string) {
    this.history = this.history.filter((h: GameHistory) => h.id !== id);
    if (this.activeGame?.id === id) this.activeGame = null;
    // 删除是明确操作，立即写盘，不等防抖
    this.flushHistory();
  },

  async initNewGame(selectedPlayers: SavedPlayer[]) {
    const initialPlayers: Player[] = selectedPlayers.map(sp => ({
      ...sp, score: 0, triggeredEvents: {},
    }));
    const newState = await invoke<RustGameState>('init_new_game', { players: initialPlayers });
    this.gameLog = [];
    this.logSeq = 0;
    this._syncState(newState);
  },

  /** 续玩：优先用历史记录，历史被删掉时退回活跃快照 */
  async resumeGame(id?: string): Promise<boolean> {
    const targetId = id ?? this.activeGame?.id;
    if (!targetId) return false;
    const record = this.history.find((h: GameHistory) => h.id === targetId);
    const snap: ActiveGame | GameHistory | undefined =
      record ?? (this.activeGame?.id === targetId ? this.activeGame as ActiveGame : undefined);
    if (!snap || !Array.isArray(snap.players) || snap.players.length === 0) return false;

    const newState = await invoke<RustGameState>('resume_game_state', {
      gameState: { id: snap.id, round: snap.round, players: snap.players, historyLen: 0 },
    });
    const log = 'log' in snap && Array.isArray(snap.log) ? snap.log : [];
    this.gameLog = [...log];
    this.logSeq = this.gameLog.reduce((max: number, e: GameLogEntry) => Math.max(max, e.seq ?? 0), 0);
    this._syncState(newState);
    return true;
  },

  endAndSaveGame() {
    this._updateHistoryList();
    save(KEY_HISTORY, this.history);
    this.currentGameId = null;
    this.historyLen = 0;
    this.gameLog = [];
    this.logSeq = 0;
    this.activeGame = null;
    remove(KEY_ACTIVE);
  },

  async triggerEvent(playerId: string, eventId: string, targetId?: string) {
    const event = this.customEvents.find((e: CustomEvent) => e.id === eventId);
    if (!event) return;
    const detail = targetId
      ? this.currentPlayers.find((p: Player) => p.id === targetId)?.name
      : undefined;
    const newState = await invoke<RustGameState>('trigger_event', {
      playerId,
      event,
      targetId: targetId ?? null,
    });
    this._syncState(newState, { kind: 'event', label: event.name, actorId: playerId, detail });
  },

  async undoLastAction() {
    try {
      const newState = await invoke<RustGameState>('undo_action');
      this._syncState(newState, { kind: 'undo' });
    } catch (e) {
      console.warn('[bilscore] 撤销失败', e);
      this.historyLen = 0;
      throw e;
    }
  },

  async updatePlayerScore(playerId: string, newScore: number) {
    const newState = await invoke<RustGameState>('update_score', { playerId, newScore });
    this._syncState(newState, { kind: 'score', label: '手动改分', actorId: playerId });
  },

  async replacePlayer(oldPlayerId: string, newSavedPlayer: SavedPlayer) {
    const newPlayerBase: Player = { ...newSavedPlayer, score: 0, triggeredEvents: {} };
    const newState = await invoke<RustGameState>('replace_player', {
      oldId: oldPlayerId,
      newPlayer: newPlayerBase,
    });
    this._syncState(newState, { kind: 'roster', label: '替换玩家', actorId: '', detail: newSavedPlayer.name });
  },

  async addPlayerMidGame(newSavedPlayer: SavedPlayer) {
    const newPlayerBase: Player = { ...newSavedPlayer, score: 0, triggeredEvents: {} };
    const newState = await invoke<RustGameState>('add_player_mid_game', { newPlayer: newPlayerBase });
    this._syncState(newState, { kind: 'roster', label: '加入玩家', actorId: '', detail: newSavedPlayer.name });
  },

  async removePlayerMidGame(playerId: string) {
    const name = this.currentPlayers.find((p: Player) => p.id === playerId)?.name ?? '';
    const newState = await invoke<RustGameState>('remove_player_mid_game', { playerId });
    this._syncState(newState, { kind: 'roster', label: '移出玩家', actorId: '', detail: name });
  },

  async applyCustomOrder(orderedIds: string[]) {
    const newState = await invoke<RustGameState>('apply_custom_order', { orderedIds });
    this._syncState(newState, { kind: 'roster', label: '调整击球顺序', actorId: '' });
  },
});

// ---- 防抖持久化：history 与 active 一起落盘 ----
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
