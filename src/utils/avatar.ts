// src/utils/avatar.ts

// 提取头像文字：包含中文取最后一个中文字符，纯英文取最后一个单词首字母
export const getAvatarText = (name: string): string => {
  if (!name) return '?';
  const nameStr = name.trim();
  // 匹配所有中文字符
  const chineseMatches = nameStr.match(/[\u4e00-\u9fa5]/g);
  if (chineseMatches && chineseMatches.length > 0) {
    return chineseMatches[chineseMatches.length - 1];
  }
  // 如果没有中文，按空格分词取最后一个单词首字母
  const words = nameStr.split(/\s+/);
  const lastWord = words[words.length - 1];
  return lastWord ? lastWord.charAt(0).toUpperCase() : '?';
};

// 获取随机明亮色彩
export const getRandomColor = (): string => {
  const colors =['#ff4757', '#5352ed', '#1e90ff', '#2ed573', '#ffa502', '#ff7f50', '#3742fa', '#2bcbba', '#eb4d4b', '#6c5ce7'];
  return colors[Math.floor(Math.random() * colors.length)];
};
