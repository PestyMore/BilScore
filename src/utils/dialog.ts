// src/utils/dialog.ts
// 彻底重写的原生风格弹窗，支持玻璃态和非线性动画

export const appConfirm = (message: string, title: string = '提示'): Promise<boolean> => {
  return new Promise((resolve) => createDialog(title, message, true, resolve));
};

export const appAlert = (message: string, title: string = '提示'): Promise<void> => {
  return new Promise((resolve) => createDialog(title, message, false, () => resolve()));
};

const createDialog = (title: string, message: string, showCancel: boolean, resolve: (val: boolean) => void) => {
  // 1. 创建遮罩层
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    opacity: 0; transition: opacity 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  `;

  // 2. 创建弹窗主体
  const box = document.createElement('div');
  box.style.cssText = `
    width: 85%; max-width: 320px;
    background: var(--glass-modal, #1C1C1E);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    padding: 24px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    transform: scale(0.9) translateY(10px);
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    display: flex; flex-direction: column; align-items: center; text-align: center;
  `;

  // 3. 内容构建
  const titleEl = document.createElement('div');
  titleEl.textContent = title;
  titleEl.style.cssText = 'font-size: 18px; font-weight: 700; color: var(--text-main); margin-bottom: 10px;';

  const msgEl = document.createElement('div');
  msgEl.textContent = message;
  msgEl.style.cssText = 'font-size: 15px; color: var(--text-muted); line-height: 1.5; margin-bottom: 24px;';

  // 4. 按钮组
  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display: flex; gap: 12px; width: 100%;';

  const createBtn = (text: string, isPrimary: boolean, onClick: () => void) => {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
      flex: 1; padding: 14px 0; border: none; border-radius: 12px;
      font-size: 16px; font-weight: 600; cursor: pointer;
      transition: transform 0.1s;
    `;
    if (isPrimary) {
      btn.style.background = 'var(--primary-grad)';
      btn.style.color = '#fff';
      btn.style.boxShadow = '0 4px 12px rgba(0, 122, 255, 0.3)';
    } else {
      btn.style.background = 'rgba(128, 128, 128, 0.15)';
      btn.style.color = 'var(--text-main)';
    }

    btn.onclick = () => {
      btn.style.transform = 'scale(0.95)';
      // 关闭动画
      overlay.style.opacity = '0';
      box.style.transform = 'scale(0.9) translateY(10px)';
      setTimeout(() => {
        if (document.body.contains(overlay)) document.body.removeChild(overlay);
        onClick();
      }, 250);
    };
    return btn;
  };

  if (showCancel) {
    btnRow.appendChild(createBtn('取消', false, () => resolve(false)));
    btnRow.appendChild(createBtn('确认', true, () => resolve(true)));
  } else {
    btnRow.appendChild(createBtn('我知道了', true, () => resolve(true)));
  }

  box.appendChild(titleEl);
  box.appendChild(msgEl);
  box.appendChild(btnRow);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  // 入场动画
  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    box.style.transform = 'scale(1) translateY(0)';
  });
};