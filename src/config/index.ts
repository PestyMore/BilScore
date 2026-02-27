// src/config/index.ts
import type { CustomEvent } from '../types';

export const AppConfig = {
  mode: import.meta.env.VITE_APP_MODE || 'public',
  
  get isPersonal() {
    return this.mode === 'personal';
  },

  builtInEvents: [
    { id: 'b_dajin', name: '大金', targetType: 'take_all', score: 10, isNextRound: true, isBuiltIn: true },
    { id: 'b_dajinfoul', name: '大金犯规', targetType: 'give_all', score: 10, isNextRound: true, isBuiltIn: true },
    { id: 'b_xiaojin', name: '小金', targetType: 'take_all', score: 7, isNextRound: true, isBuiltIn: true },
    { id: 'b_xiaojinfoul', name: '小金犯规', targetType: 'give_all', score: 7, isNextRound: true, isBuiltIn: true },
    { id: 'b_huangjin9', name: '黄金9', targetType: 'take_all', score: 4, isNextRound: true, isBuiltIn: true },
    { id: 'b_huangjin9foul', name: '黄金9犯规', targetType: 'give_all', score: 4, isNextRound: true, isBuiltIn: true },
    { id: 'b_pusheng', name: '普胜', targetType: 'take_prev', score: 4, isNextRound: true, isBuiltIn: true },
    { id: 'b_pushengfoul', name: '普胜犯规', targetType: 'give_prev', score: 4, isNextRound: true, isBuiltIn: true },
    { id: 'b_foul', name: '犯规', targetType: 'give_prev', score: 1, isNextRound: false, isBuiltIn: true },
    { id: 'b_ranggan', name: '让杆', targetType: 'give_custom', score: 1, isNextRound: false, isBuiltIn: true },
  ] as CustomEvent[]
};
