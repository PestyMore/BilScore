// 规则展示口径的单一来源：Rust 对 *_all 的实际结算是 score × (人数 - 1)，
// 所以列表/按钮必须显示「N/家」，否则用户会以为触发者只加/减 N 分。
import type { CustomEvent, TargetType } from '../types';

export const TARGET_LABELS: Record<TargetType, string> = {
  take_all: '吃所有人分',
  give_all: '给所有人分',
  take_prev: '吃上家分',
  give_prev: '给上家分',
  take_custom: '吃指定玩家分',
  give_custom: '给指定玩家分',
};

export const TARGET_OPTIONS: { value: TargetType; label: string }[] = [
  { value: 'take_all', label: TARGET_LABELS.take_all },
  { value: 'give_all', label: TARGET_LABELS.give_all },
  { value: 'take_prev', label: TARGET_LABELS.take_prev },
  { value: 'give_prev', label: TARGET_LABELS.give_prev },
  { value: 'take_custom', label: TARGET_LABELS.take_custom },
  { value: 'give_custom', label: TARGET_LABELS.give_custom },
];

export const isPositive = (event: CustomEvent): boolean => event.targetType.includes('take');

export const isPerOpponent = (event: CustomEvent): boolean => event.targetType.endsWith('_all');

export const scoreLabel = (event: CustomEvent): string => {
  const sign = isPositive(event) ? '+' : '-';
  return isPerOpponent(event) ? `${sign}${event.score}/家` : `${sign}${event.score}`;
};

/** 规则分值：必须是 1–999 的整数；v-model.number 清空得到 ''，会被这里挡住 */
export const isValidScore = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 999;
