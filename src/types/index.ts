// src/types/index.ts

export type TargetType = 'give_prev' | 'take_prev' | 'give_all' | 'take_all' | 'give_custom' | 'take_custom';

export interface CustomEvent {
  id: string;
  name: string;
  targetType: TargetType;
  score: number;
  isNextRound: boolean;
  isBuiltIn?: boolean;
}

export interface SavedPlayer {
  id: string;
  name: string;
  avatarColor: string;
}

export interface Player extends SavedPlayer {
  score: number;
  triggeredEvents: Record<string, number>;
}

export interface GameHistory {
  id: string;
  lastEdited: number;
  round: number;
  players: Player[];
}

/** 本局计分流水：一次可撤销操作对应一条，撤销时同步回退。最新在最前。 */
export interface GameLogEntry {
  seq: number;
  round: number;
  actor: string;
  label: string;
  /** 操作者的分数变化，用于正负着色；阵容调整类为 0 */
  delta: number;
  /** 目标玩家名 / 阵容变动说明 */
  detail?: string;
  at: number;
}

/** 活跃对局快照：独立于历史列表，用于「继续上一局」与流水恢复。 */
export interface ActiveGame {
  id: string;
  round: number;
  players: Player[];
  log: GameLogEntry[];
  savedAt: number;
}

export interface PlayerStat {
  games: number;
  wins: number;
}
