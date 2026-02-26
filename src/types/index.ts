// src/types/index.ts

export type TargetType = 'give_prev' | 'take_prev' | 'give_all' | 'take_all' | 'give_custom' | 'take_custom';

export interface CustomEvent {
  id: string;
  name: string;
  targetType: TargetType;
  score: number;
  isNextRound: boolean;
}

// --- 新增：保存的玩家信息库 ---
export interface SavedPlayer {
  id: string;
  name: string;
  avatarColor: string;
}

export interface Player extends SavedPlayer {
  score: number;
  triggeredEvents: Record<string, number>;
}

export interface GameSnapshot {
  players: Player[];
  round: number;
}

export interface GameHistory {
  id: string;
  lastEdited: number;
  round: number;
  players: Player[];
}
