// src/types/index.ts

export type TargetType = 'give_prev' | 'take_prev' | 'give_all' | 'take_all' | 'give_custom' | 'take_custom';

export interface CustomEvent {
  id: string;
  name: string;
  targetType: TargetType;
  score: number;
  isNextRound: boolean;
  // 【修复】添加可选属性，解决 TS2339 和 TS2352 报错
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
