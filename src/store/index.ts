// src/store/index.ts
import { reactive } from 'vue';
import type { Player, CustomEvent, GameSnapshot, GameHistory, SavedPlayer } from '../types';
import { AppConfig } from '../config';

const loadEvents = (): CustomEvent[] => {
  const saved = localStorage.getItem('bilscore_events');
  let events: CustomEvent[] = saved ? JSON.parse(saved) : [];
  
  if (AppConfig.isPersonal) {
    // 个人版：注入且保护内置规则
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
    // 公共版：剔除内置规则，只留用户自己建的
    events = events.filter(e => !e.isBuiltIn);
  }
  return events;
};

const loadLocal = (key: string) => {
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : [];
};

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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
    // 判断：如果是 Personal 模式且为内置事件，不可删
    this.customEvents = this.customEvents.filter((e: CustomEvent) => e.id !== id || (AppConfig.isPersonal && e.isBuiltIn)); 
    this.saveEvents(); 
  },
  updateEventScore(id: string, newScore: number) {
    const ev = this.customEvents.find(e => e.id === id);
    if (ev) { ev.score = newScore; this.saveEvents(); }
  },
  saveEvents() { localStorage.setItem('bilscore_events', JSON.stringify(this.customEvents)); },

  _autoSaveToHistory() {
    if (!this.currentGameId) return;
    const record: GameHistory = { id: this.currentGameId, lastEdited: Date.now(), round: this.currentRound, players: JSON.parse(JSON.stringify(this.currentPlayers)) };
    const existingIdx = this.history.findIndex((h: GameHistory) => h.id === this.currentGameId);
    if (existingIdx > -1) this.history.splice(existingIdx, 1);
    this.history.unshift(record);
    if (this.history.length > 10) this.history = this.history.slice(0, 10);
    localStorage.setItem('bilscore_history', JSON.stringify(this.history));
  },

  initNewGame(selectedPlayers: SavedPlayer[]) {
    this.currentGameId = `game_${Date.now()}`;
    this.currentRound = 1;
    this.historySnapshots = [];
    this.currentPlayers = selectedPlayers.map(sp => ({ ...sp, score: 0, triggeredEvents: {} }));
    this._autoSaveToHistory();
  },
  resumeGame(id: string) {
    const record = this.history.find((h: GameHistory) => h.id === id);
    if (record) { this.currentGameId = record.id; this.currentRound = record.round; this.currentPlayers = JSON.parse(JSON.stringify(record.players)); this.historySnapshots = []; this._autoSaveToHistory(); }
  },
  endAndSaveGame() { this._autoSaveToHistory(); this.historySnapshots = []; this.currentGameId = null; },
  saveSnapshot() { this.historySnapshots.push({ players: JSON.parse(JSON.stringify(this.currentPlayers)), round: this.currentRound }); },
  undoLastAction() {
    if (this.historySnapshots.length > 0) { const lastState = this.historySnapshots.pop()!; this.currentPlayers = lastState.players; this.currentRound = lastState.round; this._autoSaveToHistory(); }
  },

  updatePlayerScore(playerId: string, newScore: number) {
    this.saveSnapshot(); const player = this.currentPlayers.find(p => p.id === playerId);
    if (player) { player.score = newScore; this._autoSaveToHistory(); }
  },
  replacePlayer(oldPlayerId: string, newSavedPlayer: SavedPlayer) {
    this.saveSnapshot(); const player = this.currentPlayers.find(p => p.id === oldPlayerId);
    if (player) { player.id = newSavedPlayer.id; player.name = newSavedPlayer.name; player.avatarColor = newSavedPlayer.avatarColor; this._autoSaveToHistory(); }
  },
  addPlayerMidGame(newSavedPlayer: SavedPlayer) {
    this.saveSnapshot(); this.currentPlayers.push({ ...newSavedPlayer, score: 0, triggeredEvents: {} }); this._autoSaveToHistory();
  },
  removePlayerMidGame(playerId: string) {
    this.saveSnapshot(); this.currentPlayers = this.currentPlayers.filter(p => p.id !== playerId); this._autoSaveToHistory();
  },
  applyCustomOrder(orderedIds: string[]) {
    this.saveSnapshot(); const newPlayersList: Player[] = [];
    orderedIds.forEach(id => { const p = this.currentPlayers.find(p => p.id === id); if (p) newPlayersList.push(p); });
    this.currentPlayers = newPlayersList; this._autoSaveToHistory();
  },

  triggerEvent(playerIndex: number, eventId: string, targetIndex?: number) {
    const event = this.customEvents.find((e: CustomEvent) => e.id === eventId);
    if (!event) return;
    this.saveSnapshot();
    const N = this.currentPlayers.length;
    const triggerPlayer = this.currentPlayers[playerIndex];
    const prevIndex = (playerIndex - 1 + N) % N;
    const S = event.score;

    switch (event.targetType) {
      case 'give_prev': triggerPlayer.score -= S; this.currentPlayers[prevIndex].score += S; break;
      case 'take_prev': triggerPlayer.score += S; this.currentPlayers[prevIndex].score -= S; break;
      case 'give_all': triggerPlayer.score -= S * (N - 1); this.currentPlayers.forEach((p, idx) => { if (idx !== playerIndex) p.score += S; }); break;
      case 'take_all': triggerPlayer.score += S * (N - 1); this.currentPlayers.forEach((p, idx) => { if (idx !== playerIndex) p.score -= S; }); break;
      case 'give_custom': if (targetIndex !== undefined) { triggerPlayer.score -= S; this.currentPlayers[targetIndex].score += S; } break;
      case 'take_custom': if (targetIndex !== undefined) { triggerPlayer.score += S; this.currentPlayers[targetIndex].score -= S; } break;
    }

    if (!triggerPlayer.triggeredEvents[eventId]) triggerPlayer.triggeredEvents[eventId] = 0;
    triggerPlayer.triggeredEvents[eventId] += 1;

    if (event.isNextRound) {
      this.currentRound += 1;
      let winnerIndex = prevIndex, loserIndex = playerIndex; 
      if (event.targetType.includes('take')) { winnerIndex = playerIndex; loserIndex = prevIndex; }
      if (event.targetType === 'take_custom') { winnerIndex = playerIndex; loserIndex = targetIndex!; }
      else if (event.targetType === 'give_custom') { winnerIndex = targetIndex!; loserIndex = playerIndex; }

      const winner = this.currentPlayers[winnerIndex];
      const loser = this.currentPlayers[loserIndex];
      const remaining = this.currentPlayers.filter((_, idx) => idx !== winnerIndex && idx !== loserIndex);
      const newOrder: Player[] = [winner, loser];

      if (N === 4) {
        const oldIdx0 = this.currentPlayers.indexOf(remaining[0]);
        const oldIdx1 = this.currentPlayers.indexOf(remaining[1]);
        const validPermutations = [];
        if (oldIdx0 !== 2 && oldIdx1 !== 3) validPermutations.push([remaining[0], remaining[1]]);
        if (oldIdx1 !== 2 && oldIdx0 !== 3) validPermutations.push([remaining[1], remaining[0]]);
        if (validPermutations.length > 0) newOrder.push(...validPermutations[Math.floor(Math.random() * validPermutations.length)]);
        else newOrder.push(...remaining);
      } else {
        newOrder.push(...shuffleArray(remaining));
      }
      this.currentPlayers = newOrder;
    }
    this._autoSaveToHistory();
  }
});
